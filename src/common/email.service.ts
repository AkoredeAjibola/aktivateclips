import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationEmail(email: string, token: string) {
    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? appUrl;
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome to Aktivate Clips</h2>
          <p>Thanks for signing up. Please verify your email address to activate your account.</p>
          <p>
            <a href="${verificationLink}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this token into the app:</p>
          <p><strong>${token}</strong></p>
        </div>
      `,
      text: `Verify your email: ${verificationLink}\n\nToken: ${token}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? appUrl;
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your password</h2>
          <p>We received a request to reset your password. Use the button below to continue.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this token into the app:</p>
          <p><strong>${token}</strong></p>
        </div>
      `,
      text: `Reset your password: ${resetLink}\n\nToken: ${token}`,
    });
  }

  private async sendEmail(payload: EmailPayload) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@localhost';

    if (!apiKey) {
      this.logger.log(`RESEND_API_KEY is not configured. Dev email payload for ${payload.to}:`);
      this.logger.log(JSON.stringify(payload, null, 2));
      return { id: 'dev-mode', status: 'queued-dev' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend email failed: ${errorText}`);
    }

    return response.json();
  }
}
