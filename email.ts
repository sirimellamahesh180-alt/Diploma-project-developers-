import { Resend } from 'resend';
const recipient = process.env.NOTIFICATION_EMAIL || 'sirimellamahesh180@gmail.com';
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('Email skipped: RESEND_API_KEY or EMAIL_FROM is not configured.');
    return { sent: false, reason: 'Email provider is not configured.' };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM, to: input.to, subject: input.subject, html: input.html });
  if (error) throw new Error(error.message);
  return { sent: true };
}
export async function notifyOwner(subject: string, html: string) {
  return sendEmail({ to: recipient, subject, html });
}
export function safeEmailHtml(title: string, body: string) {
  const entities: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => entities[character]!);
  const safeTitle = escapeHtml(title);
  const escaped = escapeHtml(body);
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2>${safeTitle}</h2><p>${escaped.replace(/\n/g,'<br/>')}</p><hr/><small>Diploma Project Developers</small></div>`;
}
