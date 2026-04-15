import React, { useState, useEffect } from 'react';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements,
  CardElementProps 
} from '@stripe/react-stripe-js';
import { Button, Form, message, Spin, Typography } from 'antd';
import { CreditCardOutlined, LockOutlined } from '@ant-design/icons';
import { paymentApi } from '../../api/payment';
import { getStripe } from '../../config/stripe';

const { Title, Text } = Typography;

interface PaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  orderId?: string;
}

const CARD_ELEMENT_OPTIONS: CardElementProps['options'] = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const PaymentFormContent: React.FC<{
  amount: number;
  currency: string;
  description: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
  orderId?: string;
}> = ({ amount, currency, description, onSuccess, onError, orderId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      let clientSecret: string;

      if (orderId) {
        // 使用真实订单创建支付意图
        const response = await paymentApi.createPaymentIntent(orderId);
        clientSecret = response.data.clientSecret;
      } else {
        // 创建测试支付意图
        const response = await paymentApi.test.createTestIntent({
          amount: amount * 100, // 转换为分
          currency: currency.toLowerCase(),
          description,
        });
        clientSecret = response.data.clientSecret;
      }

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // 确认支付
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Test User', // 在实际应用中从用户信息获取
          },
        },
      });

      if (result.error) {
        message.error(`支付失败: ${result.error.message}`);
        onError?.(result.error);
      } else {
        message.success('支付成功！');
        onSuccess?.(result.paymentIntent);
      }
    } catch (error: any) {
      message.error(`支付处理失败: ${error.message}`);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onFinish={handleSubmit} layout="vertical">
      <div style={{ marginBottom: 24 }}>
        <Text strong>支付金额:</Text>
        <Text style={{ fontSize: 18, color: '#1890ff', marginLeft: 8 }}>
          ${amount.toFixed(2)} {currency.toUpperCase()}
        </Text>
      </div>

      {/* 测试卡号提示 */}
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        backgroundColor: '#e6f7ff', 
        border: '1px solid #91d5ff',
        borderRadius: 6 
      }}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: '#0050b3' }}>
          💳 测试卡号（开发测试用）：
        </Text>
        <div style={{ fontSize: 13 }}>
          <div style={{ marginBottom: 4 }}>
            <Text strong>成功支付：</Text>
            <Text code copyable={{ text: '4242424242424242' }}>4242 4242 4242 4242</Text>
          </div>
          <div style={{ marginBottom: 4 }}>
            <Text strong>失败支付：</Text>
            <Text code copyable={{ text: '4000000000000002' }}>4000 0000 0000 0002</Text>
          </div>
          <div>
            <Text type="secondary">
              有效期：任意未来日期 (如 12/34)，CVC：任意3位数字 (如 123)
            </Text>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          信用卡信息
        </Text>
        <div style={{ 
          padding: 16, 
          border: '1px solid #d9d9d9', 
          borderRadius: 6,
          backgroundColor: '#fafafa'
        }}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        disabled={!stripe}
        icon={<LockOutlined />}
        size="large"
        block
      >
        {loading ? '处理中...' : `支付 $${amount.toFixed(2)}`}
      </Button>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <LockOutlined /> 您的支付信息已加密并通过Stripe安全处理
        </Text>
      </div>
    </Form>
  );
};

const StripePaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'aud',
  description = '测试支付',
  onSuccess,
  onError,
  orderId,
}) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const promise = getStripe();
        setStripePromise(promise);
        const stripe = await promise;
        if (!stripe) {
          setStripeError('Stripe未配置或配置错误');
        }
      } catch (error) {
        setStripeError('Stripe初始化失败');
      }
    };
    initStripe();
  }, []);

  if (stripeError) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <CreditCardOutlined /> 安全支付
          </Title>
          <Text type="secondary">{description}</Text>
        </div>
        
        <div style={{ 
          padding: 24, 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7',
          borderRadius: 6 
        }}>
          <Text type="danger">{stripeError}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
            请配置VITE_STRIPE_PUBLISHABLE_KEY环境变量
          </Text>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在初始化支付服务...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>
          <CreditCardOutlined /> 安全支付
        </Title>
        <Text type="secondary">{description}</Text>
      </div>

      <Elements stripe={stripePromise}>
        <PaymentFormContent
          amount={amount}
          currency={currency}
          description={description}
          onSuccess={onSuccess}
          onError={onError}
          orderId={orderId}
        />
      </Elements>
    </div>
  );
};

export default StripePaymentForm;
