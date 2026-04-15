import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { SendGridService } from '../services/sendgridService';
import crypto from 'crypto';

const router = Router();

// Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(50),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  role: z.enum(['user', 'merchant', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

// Register (do not issue JWT)
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, role: role || 'user' } });

  // Fire-and-forget welcome email via Resend
  try { await EmailService.sendWelcomeEmail(email, firstName); } catch {}

  // Create verification token and send via SendGrid (English)
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendURL}/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Thanks for signing up. Please click the button below to verify your email address:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Verify Email</a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color:#666;font-size:12px;">This link is valid for 15 minutes.</p>
      </div>`;
    const text = `Open the link below to verify your email (valid for 15 minutes):\n${verifyUrl}`;
    await SendGridService.send({ to: email, subject, html, text });
  } catch {}

  res.status(201).json({
    success: true,
    data: { user: { id: user.id, email: user.email, role: user.role } },
    message: 'Verification email sent. Please check your inbox.'
  });
});

// Login (requires verified email)
router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!user.emailVerified) throw new AppError('Email not verified. Please verify first.', 403, 'EMAIL_NOT_VERIFIED');
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });
  res.json({ success: true, data: { user: { id: user.id, email: user.email, role: user.role }, token } });
});

// Current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, role: true, status: true, emailVerified: true, createdAt: true, profile: true }
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  res.json({ success: true, data: user });
});

// Verify email
router.get('/verify', async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) throw new AppError('Missing verification token', 400, 'TOKEN_REQUIRED');
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) throw new AppError('Invalid verification token', 400, 'TOKEN_INVALID');
  if (record.usedAt) throw new AppError('Verification token already used', 400, 'TOKEN_USED');
  if (record.expiresAt.getTime() < Date.now()) throw new AppError('Verification token expired', 400, 'TOKEN_EXPIRED');
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { token }, data: { usedAt: new Date() } })
  ]);
  res.json({ success: true, message: 'Email verified successfully' });
});

// Resend verification
const resendSchema = z.object({ email: z.string().email('Invalid email') });
router.post('/resend-verification', async (req, res) => {
  const { email } = resendSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ success: true, message: 'If the email exists, a verification email will be sent.' });
  if (user.emailVerified) return res.json({ success: true, message: 'Email already verified.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });

  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendURL}/verify-email?token=${token}`;
  const subject = 'Verify your email address';
  const html = `
    <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
      <h2>Verify your email</h2>
      <p>Please click the button below to verify your email address:</p>
      <p style=\"text-align:center; margin: 24px 0;\">
        <a href=\"${verifyUrl}\" style=\"background:#4F46E5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;\">Verify Email</a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href=\"${verifyUrl}\">${verifyUrl}</a></p>
      <p style=\"color:#666;font-size:12px;\">This link is valid for 15 minutes.</p>
    </div>
  `;
  const text = `Open the link below to verify your email (valid for 15 minutes):\\n${verifyUrl}`;
  await SendGridService.send({ to: email, subject, html, text });

  res.json({ success: true, message: 'Verification email sent (if address exists).' });
});

export default router;
