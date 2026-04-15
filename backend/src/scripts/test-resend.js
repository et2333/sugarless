const { Resend } = require('resend');
require('dotenv').config();

console.log('测试Resend SDK安装...');
console.log('API Key:', process.env.RESEND_API_KEY ? '已配置' : '未配置');

try {
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend SDK 安装成功');
  console.log('Resend 实例:', resend);
} catch (error) {
  console.error('❌ Resend SDK 安装失败:', error.message);
}

