import sgMail from '@sendgrid/mail';

export interface SendGridEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class SendGridService {
  private static initialized = false;

  static initialize() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required');
    }
    sgMail.setApiKey(apiKey);
    this.initialized = true;
  }

  static async send(options: SendGridEmailOptions): Promise<void> {
    if (!this.initialized) {
      this.initialize();
    }

    const from = process.env.SENDGRID_FROM_EMAIL || 'no-reply@example.com';
    await sgMail.send({
      to: options.to,
      from,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

