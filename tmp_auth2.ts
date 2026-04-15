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

// Schemas (messages kept simple; comments in English)
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(50),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  role: z.enum(['user', 'merchant', 'admin']).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required')
});

// Register
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, role } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('该邮箱已被注�?, 400, 'EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, role: role || 'user' } });

  // Welcome email via Resend (non-blocking)
  try { await EmailService.sendWelcomeEmail(email, firstName); } catch {}

  // Create email verification token and send via SendGrid
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });

    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendURL}/verify-email?token=${token}`;
    const subject = '请验证您的邮箱地址';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>验证您的邮箱</h2>
        <p>请点击以下按钮完成邮箱验证：</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">立即验证邮箱</a>
        </p>
        <p>如果按钮无法点击，请复制以下链接到浏览器打开�?/p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color:#666;font-size:12px;">该链�?4小时内有效�?/p>
      </div>`;
    const text = `请打开以下链接完成邮箱验证�?4小时内有效）：\n${verifyUrl}`;
    await SendGridService.send({ to: email, subject, html, text });
  } catch {}

  const jwt = generateToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({ success: true, data: { user: { id: user.id, email: user.email, role: user.role }, token: jwt }, message: '注册成功' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('邮箱或密码错�?, 401, 'INVALID_CREDENTIALS');
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new AppError('邮箱或密码错�?, 401, 'INVALID_CREDENTIALS');
  if (!user.emailVerified) throw new AppError('邮箱未验证，请先完成验证', 403, 'EMAIL_NOT_VERIFIED');
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
  if (!user) throw new AppError('用户不存�?, 404, 'USER_NOT_FOUND');
  res.json({ success: true, data: user });
});

// Verify email
router.get('/verify', async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) throw new AppError('缺少验证令牌', 400, 'TOKEN_REQUIRED');
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) throw new AppError('无效的验证令�?, 400, 'TOKEN_INVALID');
  if (record.usedAt) throw new AppError('验证令牌已使�?, 400, 'TOKEN_USED');
  if (record.expiresAt.getTime() < Date.now()) throw new AppError('验证令牌已过�?, 400, 'TOKEN_EXPIRED');
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { token }, data: { usedAt: new Date() } })
  ]);
  res.json({ success: true, message: '邮箱验证成功' });
});

// Resend verification
const resendSchema = z.object({ email: z.string().email('Invalid email') });
router.post('/resend-verification', async (req, res) => {
  const { email } = resendSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ success: true, message: '如果邮箱存在，将发送验证邮�? });
  if (user.emailVerified) return res.json({ success: true, message: '邮箱已完成验�? });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({ data: { userId: user.id, token, expiresAt } });
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendURL}/verify-email?token=${token}`;
  const subject = '请验证您的邮箱地址';
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`+
               `<h2>验证您的邮箱</h2><p>请点击以下按钮完成邮箱验证：</p>`+
               `<p style="text-align:center; margin: 24px 0;"><a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">立即验证邮箱</a></p>`+
               `<p>如果按钮无法点击，请复制以下链接到浏览器打开�?/p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`+
               `<p style="color:#666;font-size:12px;">该链�?4小时内有效�?/p></div>`;
  const text = `请打开以下链接完成邮箱验证�?4小时内有效）：\n${verifyUrl}`;
  await SendGridService.send({ to: email, subject, html, text });
  res.json({ success: true, message: '验证邮件已发送（如邮箱存在）' });
});

export default router;


