/**
 * PushProvider: device notifications. Implementations: Firebase Cloud Messaging (HTTP v1)
 * and Log (prints instead of sending). Selected by PUSH_PROVIDER.
 */
import { requireEnv } from '../env.ts';

export interface PushMessage {
  title: string;
  body: string;
  /** Deep link data, e.g. { route: '/last-night' }. Values must be strings. */
  data?: Record<string, string>;
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Tokens FCM reports as unregistered; the caller clears them from profiles. */
  invalidTokens: string[];
}

export interface PushProvider {
  readonly name: string;
  send(tokens: string[], message: PushMessage): Promise<PushResult>;
}

export class LogPushProvider implements PushProvider {
  readonly name = 'log';
  send(tokens: string[], message: PushMessage): Promise<PushResult> {
    for (const token of tokens) {
      console.log(JSON.stringify({ push: 'log', token: token.slice(0, 12) + '…', ...message }));
    }
    return Promise.resolve({ sent: tokens.length, failed: 0, invalidTokens: [] });
  }
}

// ---------------------------------------------------------------------------
// FCM HTTP v1 with a service account (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY).
// ---------------------------------------------------------------------------

export class FcmPushProvider implements PushProvider {
  readonly name = 'fcm';
  private token: { value: string; expiresAt: number } | null = null;
  private readonly projectId = requireEnv('FCM_PROJECT_ID');
  private readonly clientEmail = requireEnv('FCM_CLIENT_EMAIL');
  private readonly privateKey = requireEnv('FCM_PRIVATE_KEY').replace(/\\n/g, '\n');

  async send(tokens: string[], message: PushMessage): Promise<PushResult> {
    const result: PushResult = { sent: 0, failed: 0, invalidTokens: [] };
    const accessToken = await this.accessToken();
    for (const token of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.data ?? {},
              apns: { payload: { aps: { sound: 'default' } } },
              android: { priority: 'high' },
            },
          }),
        },
      );
      if (res.ok) {
        result.sent++;
      } else {
        result.failed++;
        const text = await res.text();
        if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) {
          result.invalidTokens.push(token);
        } else {
          console.error(`FCM ${res.status}: ${text}`);
        }
      }
    }
    return result;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(
      JSON.stringify({
        iss: this.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    );
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(this.privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    );
    const jwt = `${header}.${claims}.${base64url(signature)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }
}

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
