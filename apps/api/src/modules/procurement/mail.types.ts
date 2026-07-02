export type RawEmail = {
  messageId: string;
  internetMessageId?: string;
  graphMessageId?: string;
  mailbox?: string;
  folder?: string;
  from: string;
  subject: string;
  receivedAt: Date;
  text: string;
  html?: string;
  dkimSignature?: string;
  receivedHeaders?: string[];
};

/**
 * Injectable boundary for the mail backend. Phase 1 ships a NullMailSource and
 * fixture-driven tests; the live Microsoft Graph Outlook adapter implements this
 * interface and is wired in once app-only Graph credentials are provisioned.
 */
export type MailSource = {
  fetchUnseen(): Promise<RawEmail[]>;
  markSeen?(messageId: string): Promise<void>;
};

export class NullMailSource implements MailSource {
  public async fetchUnseen(): Promise<RawEmail[]> {
    return [];
  }
}
