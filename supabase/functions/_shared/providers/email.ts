/**
 * EmailProvider: transactional email (morning digest, later marketing with consent).
 * Implementations: Brevo (HTTPS API) and Log (prints instead of sending). Selected by
 * EMAIL_PROVIDER. Login codes go through Supabase Auth's SMTP (same Brevo account).
 */
import { env, requireEnv } from '../env.ts';
import { HttpError, RetryableError, withRetry } from '../http.ts';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** RFC 8058 one-click unsubscribe headers and friends. */
  headers?: Record<string, string>;
  /** Free-form tag for the provider's logs (e.g. "digest"). */
  tag?: string;
}

export interface EmailResult {
  sent: number;
  failed: number;
  /** Addresses the provider rejected as invalid or blocked; the caller turns their digest off. */
  invalid: string[];
}

export interface EmailProvider {
  readonly name: string;
  send(messages: EmailMessage[]): Promise<EmailResult>;
}

export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';
  readonly sent: EmailMessage[] = [];
  send(messages: EmailMessage[]): Promise<EmailResult> {
    for (const m of messages) {
      this.sent.push(m);
      console.log(JSON.stringify({ email: 'log', to: m.to, subject: m.subject, tag: m.tag }));
    }
    return Promise.resolve({ sent: messages.length, failed: 0, invalid: [] });
  }
}

/** Sender identity from EMAIL_FROM ("HoopTicker <hello@hoopticker.com>" or a bare address). */
export function parseSender(from: string): { name: string; email: string } {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return m
    ? { name: m[1] || 'HoopTicker', email: m[2] }
    : { name: 'HoopTicker', email: from.trim() };
}

/** Body of a Brevo "send transactional email" request (POST /v3/smtp/email). Exported for tests. */
export function brevoPayload(message: EmailMessage, sender: { name: string; email: string }) {
  return {
    sender,
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
    ...(message.headers ? { headers: message.headers } : {}),
    ...(message.tag ? { tags: [message.tag] } : {}),
  };
}

// ---------------------------------------------------------------------------
// Brevo (https://developers.brevo.com/reference/sendtransacemail). Free plan: 300 emails/day,
// shared with the auth SMTP. The job caps itself with EMAIL_DAILY_BUDGET.
// ---------------------------------------------------------------------------

export class BrevoEmailProvider implements EmailProvider {
  readonly name = 'brevo';
  private readonly apiKey = requireEnv('BREVO_API_KEY');
  private readonly sender = parseSender(requireEnv('EMAIL_FROM'));
  private readonly endpoint = env('BREVO_API_URL') ?? 'https://api.brevo.com/v3/smtp/email';

  async send(messages: EmailMessage[]): Promise<EmailResult> {
    const result: EmailResult = { sent: 0, failed: 0, invalid: [] };
    for (const message of messages) {
      try {
        await withRetry(() => this.sendOne(message));
        result.sent++;
      } catch (err) {
        result.failed++;
        if (
          err instanceof HttpError && err.status === 400 &&
          /invalid|blocked|blacklist/i.test(err.message)
        ) {
          result.invalid.push(message.to);
        } else {
          console.error(`Brevo: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
    return result;
  }

  private async sendOne(message: EmailMessage): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(brevoPayload(message, this.sender)),
    });
    if (res.ok) return;
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) {
      throw new RetryableError(`Brevo ${res.status}: ${text}`);
    }
    throw new HttpError(`Brevo ${res.status}: ${text}`, res.status);
  }
}
