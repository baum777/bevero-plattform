import type { MailSource, RawEmail } from "./mail.types.js";

type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type GraphHeader = {
  name?: string;
  value?: string;
};

type GraphMessage = {
  id?: string;
  internetMessageId?: string;
  subject?: string;
  receivedDateTime?: string;
  from?: {
    emailAddress?: {
      address?: string;
    };
  };
  sender?: {
    emailAddress?: {
      address?: string;
    };
  };
  body?: {
    contentType?: string;
    content?: string;
  };
  internetMessageHeaders?: GraphHeader[];
};

type GraphMessagePage = {
  value?: GraphMessage[];
  "@odata.nextLink"?: string;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

export type MicrosoftGraphMailSourceOptions = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailbox: string;
  folder?: string;
  importedFolder?: string;
  failedFolder?: string;
  ignoredFolder?: string;
  fromFilter?: string;
  pageSize?: number;
  graphBaseUrl?: string;
  tokenBaseUrl?: string;
  fetchImpl?: FetchImpl;
  now?: () => Date;
};

export type MicrosoftGraphMailSourceEnv = {
  FOODNOTIFY_IMPORT_ENABLED?: string | boolean;
  MICROSOFT_TENANT_ID?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  FOODNOTIFY_MAILBOX?: string;
  FOODNOTIFY_MAIL_FOLDER?: string;
  FOODNOTIFY_IMPORTED_FOLDER?: string;
  FOODNOTIFY_FAILED_FOLDER?: string;
  FOODNOTIFY_IGNORED_FOLDER?: string;
  FOODNOTIFY_FROM_FILTER?: string;
};

export function createMicrosoftGraphMailSourceFromEnv(
  env: MicrosoftGraphMailSourceEnv,
  overrides: Pick<MicrosoftGraphMailSourceOptions, "fetchImpl" | "now"> = {}
): MicrosoftGraphMailSource | undefined {
  if (!isEnabled(env.FOODNOTIFY_IMPORT_ENABLED)) {
    return undefined;
  }

  const required = {
    MICROSOFT_TENANT_ID: cleanEnvString(env.MICROSOFT_TENANT_ID),
    MICROSOFT_CLIENT_ID: cleanEnvString(env.MICROSOFT_CLIENT_ID),
    MICROSOFT_CLIENT_SECRET: cleanEnvString(env.MICROSOFT_CLIENT_SECRET),
    FOODNOTIFY_MAILBOX: cleanEnvString(env.FOODNOTIFY_MAILBOX)
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Incomplete Microsoft Graph FoodNotify import configuration: ${missing.join(", ")} required`
    );
  }

  return new MicrosoftGraphMailSource({
    tenantId: required.MICROSOFT_TENANT_ID as string,
    clientId: required.MICROSOFT_CLIENT_ID as string,
    clientSecret: required.MICROSOFT_CLIENT_SECRET as string,
    mailbox: required.FOODNOTIFY_MAILBOX as string,
    folder: cleanEnvString(env.FOODNOTIFY_MAIL_FOLDER) ?? "Inbox",
    importedFolder: cleanEnvString(env.FOODNOTIFY_IMPORTED_FOLDER),
    failedFolder: cleanEnvString(env.FOODNOTIFY_FAILED_FOLDER),
    ignoredFolder: cleanEnvString(env.FOODNOTIFY_IGNORED_FOLDER),
    fromFilter: cleanEnvString(env.FOODNOTIFY_FROM_FILTER),
    fetchImpl: overrides.fetchImpl,
    now: overrides.now
  });
}

export class MicrosoftGraphMailSource implements MailSource {
  private readonly folder: string;
  private readonly pageSize: number;
  private readonly graphBaseUrl: string;
  private readonly tokenBaseUrl: string;
  private readonly fetchImpl: FetchImpl;
  private readonly messageIdToGraphId = new Map<string, string>();
  private accessToken?: { value: string; expiresAtMs: number };

  public constructor(private readonly options: MicrosoftGraphMailSourceOptions) {
    this.folder = options.folder ?? "Inbox";
    this.pageSize = options.pageSize ?? 50;
    this.graphBaseUrl = trimTrailingSlash(options.graphBaseUrl ?? "https://graph.microsoft.com/v1.0");
    this.tokenBaseUrl = trimTrailingSlash(options.tokenBaseUrl ?? "https://login.microsoftonline.com");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async fetchUnseen(): Promise<RawEmail[]> {
    const token = await this.getAccessToken();
    const messages: RawEmail[] = [];
    let url: string | undefined = this.buildUnreadMessagesUrl();

    while (url) {
      const page: GraphMessagePage = await this.requestJson<GraphMessagePage>(url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          prefer: 'outlook.body-content-type="text"'
        }
      });

      for (const graphMessage of page.value ?? []) {
        if (!this.matchesFoodNotifyFilter(graphMessage)) {
          continue;
        }

        const rawEmail = mapGraphMessageToRawEmail(graphMessage, {
          mailbox: this.options.mailbox,
          folder: this.folder
        });
        messages.push(rawEmail);

        if (rawEmail.graphMessageId) {
          this.messageIdToGraphId.set(rawEmail.messageId, rawEmail.graphMessageId);
        }
      }

      url = page["@odata.nextLink"];
    }

    return messages;
  }

  public async markSeen(messageId: string): Promise<void> {
    if (!this.options.importedFolder) {
      return;
    }

    await this.move(messageId, this.options.importedFolder);
  }

  public async move(messageId: string, destinationFolder: string): Promise<void> {
    const graphMessageId = this.messageIdToGraphId.get(messageId) ?? messageId;
    const token = await this.getAccessToken();
    const url = `${this.graphBaseUrl}/users/${encodeURIComponent(
      this.options.mailbox
    )}/messages/${encodeURIComponent(graphMessageId)}/move`;

    await this.requestJson<unknown>(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ destinationId: destinationFolder })
    });
  }

  private buildUnreadMessagesUrl(): string {
    const url = new URL(
      `${this.graphBaseUrl}/users/${encodeURIComponent(
        this.options.mailbox
      )}/mailFolders/${encodeURIComponent(this.folder)}/messages`
    );
    url.searchParams.set("$select", [
      "id",
      "internetMessageId",
      "subject",
      "receivedDateTime",
      "from",
      "sender",
      "body",
      "internetMessageHeaders"
    ].join(","));
    url.searchParams.set("$filter", "isRead eq false");
    url.searchParams.set("$orderby", "receivedDateTime asc");
    url.searchParams.set("$top", String(this.pageSize));
    return url.toString();
  }

  private async getAccessToken(): Promise<string> {
    const nowMs = this.nowMs();
    if (this.accessToken && this.accessToken.expiresAtMs > nowMs + 60_000) {
      return this.accessToken.value;
    }

    const body = new URLSearchParams({
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    });

    const token = await this.requestJson<TokenResponse>(
      `${this.tokenBaseUrl}/${encodeURIComponent(this.options.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      }
    );

    if (!token.access_token) {
      throw new Error("Microsoft Graph token response did not include access_token");
    }

    this.accessToken = {
      value: token.access_token,
      expiresAtMs: nowMs + (token.expires_in ?? 3600) * 1000
    };

    return token.access_token;
  }

  private async requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(url, init);
    if (!response.ok) {
      throw new Error(`Microsoft Graph request failed with HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private matchesFoodNotifyFilter(message: GraphMessage): boolean {
    const filter = this.options.fromFilter?.trim().toLowerCase();
    if (!filter) {
      return true;
    }

    const sender = readSenderAddress(message).toLowerCase();
    return filter
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .some((value) => sender === value || sender.endsWith(`@${value}`) || sender.endsWith(`.${value}`));
  }

  private nowMs(): number {
    return this.options.now?.().getTime() ?? Date.now();
  }
}

function mapGraphMessageToRawEmail(
  message: GraphMessage,
  context: { mailbox: string; folder: string }
): RawEmail {
  const graphMessageId = requireString(message.id, "message.id");
  const internetMessageId = message.internetMessageId?.trim();
  const bodyContent = message.body?.content ?? "";
  const isHtml = message.body?.contentType?.toLowerCase() === "html";

  return {
    messageId: internetMessageId || graphMessageId,
    internetMessageId,
    graphMessageId,
    mailbox: context.mailbox,
    folder: context.folder,
    from: readSenderAddress(message),
    subject: message.subject ?? "",
    receivedAt: message.receivedDateTime ? new Date(message.receivedDateTime) : new Date(0),
    text: isHtml ? stripHtml(bodyContent) : bodyContent,
    html: isHtml ? bodyContent : undefined,
    dkimSignature: readHeader(message.internetMessageHeaders, "DKIM-Signature"),
    receivedHeaders: readHeaders(message.internetMessageHeaders, "Received")
  };
}

function readSenderAddress(message: GraphMessage): string {
  return (
    message.from?.emailAddress?.address?.trim() ||
    message.sender?.emailAddress?.address?.trim() ||
    ""
  );
}

function readHeader(headers: GraphHeader[] | undefined, name: string): string | undefined {
  return readHeaders(headers, name)[0];
}

function readHeaders(headers: GraphHeader[] | undefined, name: string): string[] {
  const normalizedName = name.toLowerCase();
  return (headers ?? [])
    .filter((header) => header.name?.toLowerCase() === normalizedName && header.value)
    .map((header) => header.value as string);
}

function stripHtml(value: string): string {
  return value
    .replace(/<\s*(br|tr|\/p|\/div)\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/td\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function requireString(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Microsoft Graph message missing ${field}`);
  }
  return value;
}

function isEnabled(value: string | boolean | undefined): boolean {
  return value === true || value === "true";
}

function cleanEnvString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}
