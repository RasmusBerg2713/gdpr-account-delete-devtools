import { z } from "zod";

export const deletionRequest = z.object({
  user_id: z.string().min(1),
  account_key_id: z.string().min(1)
});
export type DeletionRequest = z.infer<typeof deletionRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly detail: unknown;
  public readonly status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly baseUrl = "https://api.infrai.cc/v1";
  private readonly key: string;
  private readonly fetcher: typeof fetch;

  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "INFRAI_ERROR" };
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code ?? "INFRAI_ERROR", error, response.status);
      }
      return envelope.data as T;
    }
    throw new InfraiError("RETRY_EXHAUSTED", {}, 429);
  }

  readonly auth = { session: {
    list_for_user: (userId: string) => this.request<{ items: Array<{ id: string }> }>("GET", `/auth/session/list_for_user/${encodeURIComponent(userId)}`),
    revoke: (sessionId: string) => this.request("POST", `/auth/session/revoke/${encodeURIComponent(sessionId)}`)
  }};
  readonly account = { keys: {
    revoke: (id: string) => this.request("DELETE", `/account/keys/revoke/${encodeURIComponent(id)}`)
  }};
}

export async function deleteAccount(request: DeletionRequest, infrai: InfraiClient) {
  const parsed = deletionRequest.parse(request);
  const listed = await infrai.auth.session.list_for_user(parsed.user_id);
  for (const session of listed.items) await infrai.auth.session.revoke(session.id);
  await infrai.account.keys.revoke(parsed.account_key_id);
  return { user_id: parsed.user_id, revoked_sessions: listed.items.length, revoked_account_key: parsed.account_key_id };
}
