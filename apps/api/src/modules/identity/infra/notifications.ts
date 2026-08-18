/* ══════════════════════════════════════════════════════════════════════
   Outbound notifications — SMS and email, each behind ONE interface (§0.3).
   Honest sandbox, no fake success:
   - development logs the code server-side;
   - production REFUSES (ServiceUnavailableException) unless the provider is
     configured — an app that silently drops codes is worse than one that
     says it cannot send them.
   Swapping a real SMS provider (Twilio/Unifonic/…) or a mail provider is a
   one-file change here and nowhere else.
   ══════════════════════════════════════════════════════════════════════ */
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { CONFIG, type Env } from '../../../config/env.js';
import { PinoLoggerService } from '../../../common/logging/logger.js';

export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<void>;
  sendReset(phone: string, code: string): Promise<void>;
}

export interface Mailer {
  sendVerification(email: string, code: string): Promise<void>;
  sendPasswordReset(email: string, code: string): Promise<void>;
}

@Injectable()
export class Notifications implements SmsSender, Mailer {
  private readonly smtp: Transporter | null;

  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly logger: PinoLoggerService
  ) {
    this.smtp = env.SMTP_HOST
      ? createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE === 'true',
          auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        })
      : null;
  }

  private assertSms(): void {
    if (this.env.NODE_ENV === 'production' && !this.env.SMS_API_KEY) {
      throw new ServiceUnavailableException({ message_key: 'notifications.sms_not_configured' });
    }
  }
  private assertMail(): void {
    if (this.env.NODE_ENV === 'production' && !this.smtp) {
      throw new ServiceUnavailableException({ message_key: 'notifications.email_not_configured' });
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    this.assertSms();
    if (this.env.NODE_ENV === 'production') {
      // Real SMS provider goes here (Twilio/Unifonic/…) — one seam.
      throw new ServiceUnavailableException({ message_key: 'notifications.sms_not_configured' });
    }
    this.logger.warn(`[DEV-SMS] code for ${phone}: ${code}`);
  }

  async sendReset(phone: string, code: string): Promise<void> {
    return this.sendOtp(phone, code);
  }

  async sendVerification(email: string, code: string): Promise<void> {
    this.assertMail();
    if (!this.smtp) {
      this.logger.warn(`[DEV-MAIL] verify code for ${email}: ${code}`);
      return;
    }
    await this.smtp.sendMail({
      from: this.env.EMAIL_FROM ?? this.env.SMTP_USER,
      to: email,
      subject: 'Ride Share — verify your email',
      text: `Your verification code is ${code}. It expires in 15 minutes.`,
    });
  }

  async sendPasswordReset(email: string, code: string): Promise<void> {
    this.assertMail();
    if (!this.smtp) {
      this.logger.warn(`[DEV-MAIL] reset code for ${email}: ${code}`);
      return;
    }
    await this.smtp.sendMail({
      from: this.env.EMAIL_FROM ?? this.env.SMTP_USER,
      to: email,
      subject: 'Ride Share — reset your password',
      text: `Your password reset code is ${code}. It expires in 15 minutes.`,
    });
  }
}
