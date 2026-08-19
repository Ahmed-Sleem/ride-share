/* ══════════════════════════════════════════════════════════════════════
   Outbound email — ONE interface (§0.3), generic SMTP (nodemailer). Works
   with Resend (smtp.resend.com:465, user "resend", pass = API key), Gmail,
   Zoho, or any relay: the account is an environment variable, nothing is
   hardcoded. Honest sandbox, no fake success:
   - development logs the code server-side;
   - production REFUSES (ServiceUnavailableException) unless SMTP + EMAIL_FROM
     are configured — an app that silently drops codes is worse than one that
     says it cannot send them.
   Every message is branded HTML (the app's violet/coral, big code block) with
   a plain-text fallback. Swapping the mail provider is a config change, never
   a code change.                                                */
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { CONFIG, type Env } from '../../../config/env.js';
import { PinoLoggerService } from '../../../common/logging/logger.js';

export interface Mailer {
  sendLoginCode(email: string, code: string): Promise<void>;
  sendVerification(email: string, code: string): Promise<void>;
  sendPasswordReset(email: string, code: string): Promise<void>;
}

/* ── brand + layout, inline-styled (email clients strip <style>) ───────── */
const BRAND = '#6C63FF';
const BRAND_DARK = '#5A4FD9';
const ACCENT = '#FF6A4D';
const INK = '#15181F';
const MUTED = '#6B7684';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#F5F7F9';
const LINE = '#E4E8ED';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderEmail(opts: {
  title: string;
  code: string;
  body: string;
  note: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td>
        <div style="background:${CARD_BG};border:1px solid ${LINE};border-radius:16px;padding:32px 28px;">
          <div style="margin-bottom:24px;">
            <span style="display:inline-block;width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,${BRAND},${ACCENT});vertical-align:middle;"></span>
            <span style="font-size:18px;font-weight:700;color:${BRAND};vertical-align:middle;margin-left:10px;">Ride Share</span>
          </div>
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${INK};">${esc(opts.title)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${INK};">${esc(opts.body)}</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:${BRAND};border:1px solid ${BRAND_DARK};border-radius:12px;padding:14px 22px;font-size:30px;font-weight:700;letter-spacing:10px;color:#FFFFFF;font-variant-numeric:tabular-nums;">${esc(opts.code)}</div>
          </div>
          <p style="margin:0 0 24px;font-size:13px;color:${MUTED};line-height:1.5;">${esc(opts.note)}</p>
          <div style="border-top:1px solid ${LINE};padding-top:16px;">
            <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.5;">If you didn't request this, you can safely ignore this email — nobody else can use the code.</p>
            <p style="margin:10px 0 0;font-size:12px;color:${MUTED};">Shared rides, fixed routes, one price. &middot; Ride Share</p>
          </div>
        </div>
      </td></tr>
    </table>
  </div>
</body>
</html>`;
}

@Injectable()
export class Notifications implements Mailer {
  private readonly smtp: Transporter | null;

  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly logger: PinoLoggerService
  ) {
    this.smtp = env.SMTP_HOST
      ? createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          // 'auto': implicit TLS on the SMTPS ports, STARTTLS elsewhere — a
          // misconfigured secure flag can otherwise hang the connection for the
          // full request window (and look like "service offline" to the user).
          secure: env.SMTP_SECURE === 'true'
            ? true
            : env.SMTP_SECURE === 'false'
              ? false
              : (env.SMTP_PORT === 465 || env.SMTP_PORT === 2465),
          auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
          // fail fast: a hanging SMTP must never hang the HTTP request
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 8000,
        })
      : null;
  }

  private assertMail(): void {
    if (this.env.NODE_ENV === 'production' && (!this.smtp || !this.env.EMAIL_FROM)) {
      throw new ServiceUnavailableException({ message_key: 'notifications.email_not_configured' });
    }
  }

  private async send(email: string, subject: string, html: string, text: string): Promise<void> {
    this.assertMail();
    if (!this.smtp) {
      this.logger.warn(`[DEV-MAIL] ${subject} → ${email}: ${text}`);
      return;
    }
    try {
      await this.smtp.sendMail({ from: this.env.EMAIL_FROM, to: email, subject, text, html });
    } catch (err) {
      // an SMTP failure is a clear, retryable condition — never a 500 "something
      // went wrong" and never a hung request
      this.logger.error({ msg: 'email send failed', err: (err as Error).message });
      throw new ServiceUnavailableException({ message_key: 'notifications.email_send_failed' });
    }
  }

  async sendLoginCode(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Ride Share — your sign-in code',
      renderEmail({
        title: 'Your sign-in code',
        code,
        body: 'Enter this code to sign in to Ride Share. Nobody else can use it, and it expires soon.',
        note: 'The code expires in 5 minutes. Never share it with anyone.',
      }),
      `Your Ride Share sign-in code is ${code}. It expires in 5 minutes.`
    );
  }

  async sendVerification(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Ride Share — verify your email',
      renderEmail({
        title: 'Verify your email',
        code,
        body: 'Enter this code to confirm this email address on your Ride Share account.',
        note: 'The code expires in 15 minutes.',
      }),
      `Your Ride Share verification code is ${code}. It expires in 15 minutes.`
    );
  }

  async sendPasswordReset(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Ride Share — reset your password',
      renderEmail({
        title: 'Reset your password',
        code,
        body: 'Enter this code to set a new password. If you did not ask to reset your password, ignore this email.',
        note: 'The code expires in 15 minutes.',
      }),
      `Your Ride Share password reset code is ${code}. It expires in 15 minutes.`
    );
  }
}
