const dotenv = require('dotenv');
dotenv.config();

async function testStripe() {
  console.log('💳 测试Stripe支付服务...');
  
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  console.log('配置信息:');
  console.log('Stripe密钥:', stripeKey ? `${stripeKey.substring(0, 12)}...` : '未配置');
  
  if (!stripeKey) {
    console.error('❌ Stripe密钥未配置');
    return;
  }

  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    console.log('\n测试API连接...');
    
    // 测试API连接
    const account = await stripe.accounts.retrieve();
    
    console.log('✅ Stripe API连接成功！');
    console.log('账户信息:');
    console.log('- 账户ID:', account.id);
    console.log('- 国家:', account.country);
    console.log('- 货币:', account.default_currency);
    console.log('- 类型:', account.type);
    console.log('- 详细信息验证状态:', account.details_submitted ? '已验证' : '未验证');
    
    // 测试创建支付意图（测试模式）
    console.log('\n测试创建支付意图...');
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // $10.00
        currency: 'usd',
        metadata: {
          test: 'true',
          description: '测试支付意图'
        },
      });
      
      console.log('✅ 支付意图创建成功！');
      console.log('- 支付意图ID:', paymentIntent.id);
      console.log('- 状态:', paymentIntent.status);
      console.log('- 金额:', `$${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);
      console.log('- 客户端密钥:', paymentIntent.client_secret ? '已生成' : '未生成');
      
      // 取消测试支付意图
      await stripe.paymentIntents.cancel(paymentIntent.id);
      console.log('✅ 测试支付意图已取消');
      
    } catch (paymentError) {
      console.error('❌ 创建支付意图失败:', paymentError.message);
    }
    
  } catch (error) {
    console.error('❌ Stripe连接失败:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('认证错误: 请检查API密钥是否正确');
    } else if (error.type === 'StripeAPIError') {
      console.error('API错误: 请检查网络连接和API限制');
    }
  }
}

testStripe();

