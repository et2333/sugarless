const dotenv = require('dotenv');
dotenv.config();

async function testClickSend() {
  console.log('📱 测试ClickSend SMS API...');
  console.log('配置信息:');
  console.log(`用户名: ${process.env.CLICKSEND_USERNAME ? '已配置' : '未配置'}`);
  console.log(`API密钥: ${process.env.CLICKSEND_API_KEY ? '已配置' : '未配置'}`);
  console.log(`发送者ID: ${process.env.CLICKSEND_SENDER_ID || '6143523147'}`);
  
  if (!process.env.CLICKSEND_USERNAME || !process.env.CLICKSEND_API_KEY) {
    console.error('❌ ClickSend配置不完整');
    return;
  }

  try {
    const username = process.env.CLICKSEND_USERNAME;
    const apiKey = process.env.CLICKSEND_API_KEY;
    const senderId = process.env.CLICKSEND_SENDER_ID || '6143523147';
    
    // 测试手机号（请替换为实际测试号码）
    const testPhone = '+8613812345678'; // 请替换为实际测试号码
    
    const authString = Buffer.from(`${username}:${apiKey}`).toString('base64');
    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'sdk',
            body: `🎉 ClickSend测试短信\n\n这是一条来自糖尿病管理平台的测试短信。\n时间: ${new Date().toLocaleString()}`,
            to: testPhone,
            from: senderId,
          }
        ]
      })
    });

    const result = await response.json();
    
    if (response.ok && result.response_code === 'SUCCESS') {
      console.log('✅ SMS发送成功！');
      console.log('响应:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ SMS发送失败:');
      console.error('状态码:', response.status);
      console.error('响应:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testClickSend();
