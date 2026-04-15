const dotenv = require('dotenv');
dotenv.config();

async function testCredentials() {
  console.log('🔑 测试ClickSend API凭据...');
  
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  
  console.log('用户名:', username);
  console.log('API密钥:', apiKey ? `${apiKey.substring(0, 8)}...` : '未设置');
  
  if (!username || !apiKey) {
    console.error('❌ 凭据不完整');
    return;
  }

  try {
    // 尝试获取账户信息来验证凭据
    const authString = Buffer.from(`${username}:${apiKey}`).toString('base64');
    
    console.log('测试API连接...');
    
    const response = await fetch('https://rest.clicksend.com/v3/account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ API凭据验证成功！');
    } else {
      console.log('❌ API凭据验证失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testCredentials();

