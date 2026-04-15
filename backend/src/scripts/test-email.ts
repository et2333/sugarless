import { Resend } from 'resend';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('📧 开始测试邮件发送...');
    console.log('API Key:', process.env.RESEND_API_KEY ? '已配置' : '未配置');

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['cody00313@gmail.com'],
      subject: '测试邮件 - Resend API',
      html: `
        <h1>🎉 测试邮件发送成功！</h1>
        <p>这是一封通过 Resend API 发送的测试邮件。</p>
        <p>时间: ${new Date().toLocaleString()}</p>
        <p>如果您收到这封邮件，说明 Resend 配置正确！</p>
      `,
      text: '测试邮件发送成功！这是一封通过 Resend API 发送的测试邮件。',
    });

    if (error) {
      console.error('❌ 邮件发送失败:', error);
      return;
    }

    console.log('✅ 邮件发送成功！');
    console.log('邮件ID:', data?.id);
    console.log('发送时间:', new Date().toLocaleString());
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
  }
}

testEmail();
