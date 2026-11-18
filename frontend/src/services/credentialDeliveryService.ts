// ==========================================
// Credential Delivery Service
// Sends Login ID + temporary password to a new user over real SMS / Email
// via the backend /communications/send-credentials endpoint.
// ==========================================

import { httpClient } from './api/httpClient';

export interface CredentialDeliveryInput {
  name: string;
  role: string;
  loginId: string;
  temporaryPassword: string;
  phone?: string;
  email?: string;
  channels?: Array<'sms' | 'email'>;
}

export interface ChannelResult {
  sent: boolean;
  provider?: string;
  detail?: string;
}

export interface CredentialDeliveryResponse {
  success: boolean;
  message: string;
  results: Record<string, ChannelResult>;
}

/**
 * Ask the backend to deliver credentials. Returns an honest per-channel result:
 * `sent` is only true when a real gateway accepted the message.
 */
export async function deliverCredentials(
  input: CredentialDeliveryInput,
): Promise<CredentialDeliveryResponse> {
  const res = await httpClient.post('/communications/send-credentials', {
    name: input.name,
    role: input.role,
    login_id: input.loginId,
    temporary_password: input.temporaryPassword,
    phone: input.phone,
    email: input.email,
    channels: input.channels,
  });

  const data = (res as any)?.data ?? {};
  return {
    success: Boolean((res as any)?.success),
    message: (res as any)?.message ?? '',
    results: data.results ?? {},
  };
}

/** Send only via SMS and return a toast-friendly outcome. */
export async function sendCredentialsSMS(
  input: CredentialDeliveryInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await deliverCredentials({ ...input, channels: ['sms'] });
    const sms = resp.results.sms;
    if (sms?.sent) {
      return { ok: true, message: `SMS delivered to ${input.phone}` };
    }
    return {
      ok: false,
      message: sms?.detail || 'SMS not delivered. SMS gateway is not configured on the server.',
    };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Could not reach the server to send SMS.' };
  }
}

/** Send only via Email and return a toast-friendly outcome. */
export async function sendCredentialsEmail(
  input: CredentialDeliveryInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await deliverCredentials({ ...input, channels: ['email'] });
    const mail = resp.results.email;
    if (mail?.sent) {
      return { ok: true, message: `Email sent to ${input.email}` };
    }
    return {
      ok: false,
      message: mail?.detail || 'Email not sent. SMTP is not configured on the server.',
    };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Could not reach the server to send Email.' };
  }
}
