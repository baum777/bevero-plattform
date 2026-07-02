import { describe, expect, it } from "vitest";

import {
  MicrosoftGraphMailSource,
  createMicrosoftGraphMailSourceFromEnv
} from "../../src/modules/procurement/microsoft-graph-mail-source.js";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("MicrosoftGraphMailSource", () => {
  it("fetches unread FoodNotify messages and maps Graph metadata into RawEmail", async () => {
    const calls: FetchCall[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      calls.push({ url, init });

      if (url.includes("/oauth2/v2.0/token")) {
        return jsonResponse({ access_token: "graph-token", expires_in: 3600 });
      }

      if (url.includes("/messages")) {
        expect(init?.headers).toMatchObject({
          authorization: "Bearer graph-token",
          prefer: 'outlook.body-content-type="text"'
        });
        return jsonResponse({
          value: [
            {
              id: "graph-1",
              internetMessageId: "<fn-1@foodnotify.com>",
              subject: "Bestellung FN-1000",
              receivedDateTime: "2026-06-02T08:00:00Z",
              from: { emailAddress: { address: "orders@mail.foodnotify.com" } },
              body: {
                contentType: "text",
                content: "Bestellung Nr.: FN-1000\nLieferant: Metro\n1 Cola 24 Kiste"
              },
              internetMessageHeaders: [
                { name: "DKIM-Signature", value: "v=1; d=foodnotify.com; s=mail;" },
                { name: "Received", value: "from mail.foodnotify.com" }
              ]
            },
            {
              id: "graph-2",
              internetMessageId: "<spam@example.com>",
              subject: "Newsletter",
              receivedDateTime: "2026-06-02T09:00:00Z",
              from: { emailAddress: { address: "newsletter@example.com" } },
              body: { contentType: "text", content: "not relevant" }
            }
          ]
        });
      }

      throw new Error(`unexpected request: ${url}`);
    };

    const source = new MicrosoftGraphMailSource({
      tenantId: "tenant-1",
      clientId: "client-1",
      clientSecret: "secret-1",
      mailbox: "orders@example.com",
      folder: "Inbox",
      fromFilter: "foodnotify.com",
      fetchImpl
    });

    const messages = await source.fetchUnseen();

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      messageId: "<fn-1@foodnotify.com>",
      internetMessageId: "<fn-1@foodnotify.com>",
      graphMessageId: "graph-1",
      mailbox: "orders@example.com",
      folder: "Inbox",
      from: "orders@mail.foodnotify.com",
      subject: "Bestellung FN-1000",
      text: "Bestellung Nr.: FN-1000\nLieferant: Metro\n1 Cola 24 Kiste",
      dkimSignature: "v=1; d=foodnotify.com; s=mail;",
      receivedHeaders: ["from mail.foodnotify.com"]
    });

    const listUrl = calls.find((call) => call.url.includes("/messages"))?.url ?? "";
    expect(listUrl).toContain("/users/orders%40example.com/mailFolders/Inbox/messages");
    expect(new URL(listUrl).searchParams.get("$filter")).toBe("isRead eq false");
  });

  it("moves a fetched message when Mail.ReadWrite is available later", async () => {
    const calls: FetchCall[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      calls.push({ url, init });

      if (url.includes("/oauth2/v2.0/token")) {
        return jsonResponse({ access_token: "graph-token", expires_in: 3600 });
      }

      if (url.endsWith("/messages/graph-1/move")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ destinationId: "FoodNotify/Imported" }));
        return jsonResponse({ id: "moved-1" });
      }

      if (url.includes("/messages")) {
        return jsonResponse({
          value: [
            {
              id: "graph-1",
              internetMessageId: "<fn-1@foodnotify.com>",
              subject: "Bestellung FN-1000",
              receivedDateTime: "2026-06-02T08:00:00Z",
              from: { emailAddress: { address: "orders@foodnotify.com" } },
              body: { contentType: "text", content: "Bestellung Nr.: FN-1000" }
            }
          ]
        });
      }

      throw new Error(`unexpected request: ${url}`);
    };

    const source = new MicrosoftGraphMailSource({
      tenantId: "tenant-1",
      clientId: "client-1",
      clientSecret: "secret-1",
      mailbox: "orders@example.com",
      folder: "Inbox",
      importedFolder: "FoodNotify/Imported",
      fromFilter: "foodnotify.com",
      fetchImpl
    });

    await source.fetchUnseen();
    await source.markSeen("<fn-1@foodnotify.com>");

    expect(calls.some((call) => call.url.endsWith("/messages/graph-1/move"))).toBe(true);
  });

  it("builds from complete env, stays disabled by default, and fails closed on partial credentials", () => {
    expect(createMicrosoftGraphMailSourceFromEnv({ FOODNOTIFY_IMPORT_ENABLED: "false" })).toBeUndefined();

    expect(() =>
      createMicrosoftGraphMailSourceFromEnv({
        FOODNOTIFY_IMPORT_ENABLED: "true",
        MICROSOFT_TENANT_ID: "tenant-1",
        MICROSOFT_CLIENT_ID: "client-1"
      })
    ).toThrow(/MICROSOFT_CLIENT_SECRET.*FOODNOTIFY_MAILBOX/);

    expect(
      createMicrosoftGraphMailSourceFromEnv({
        FOODNOTIFY_IMPORT_ENABLED: "true",
        MICROSOFT_TENANT_ID: "tenant-1",
        MICROSOFT_CLIENT_ID: "client-1",
        MICROSOFT_CLIENT_SECRET: "secret-1",
        FOODNOTIFY_MAILBOX: "orders@example.com",
        FOODNOTIFY_MAIL_FOLDER: "Inbox",
        FOODNOTIFY_IMPORTED_FOLDER: "FoodNotify/Imported",
        FOODNOTIFY_FROM_FILTER: "foodnotify.com"
      })
    ).toBeInstanceOf(MicrosoftGraphMailSource);
  });
});
