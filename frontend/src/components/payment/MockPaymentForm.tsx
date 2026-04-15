import React, { useState } from 'react';
import { Button, Form, Input, message, Typography, Space, Select } from 'antd';
import { CreditCardOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/client';

const { Title, Text } = Typography;
const { Option } = Select;

interface MockPaymentFormProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  orderId?: string;
}

const MockPaymentForm: React.FC<MockPaymentFormProps> = ({
  amount,
  currency = 'AUD',
  description = 'Order Payment',
  onSuccess,
  onError,
  orderId,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Test card numbers
  const testCards = [
    { value: '4242424242424242', label: '4242 4242 4242 4242 - ✅ Payment Success', type: 'success' },
    { value: '4000000000000002', label: '4000 0000 0000 0002 - ❌ Card Declined', type: 'error' },
    { value: '4000000000009995', label: '4000 0000 0000 9995 - ❌ Insufficient Funds', type: 'error' },
    { value: '4000000000000069', label: '4000 0000 0000 0069 - ❌ Card Expired', type: 'error' },
  ];

  const handleSubmit = async (values: any) => {
    if (!orderId) {
      message.error(t('payment.orderIdMissing'));
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create payment intent
      const createResponse = await apiClient.post('/mock-payment/create-intent', {
        orderId,
      });

      const { clientSecret } = createResponse.data;

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 2: Confirm payment
      const confirmResponse = await apiClient.post('/mock-payment/confirm', {
        clientSecret,
        cardNumber: values.cardNumber,
      });

      if (confirmResponse.success) {
        message.success(t('payment.paymentSuccess'));
        onSuccess?.(confirmResponse);
      } else {
        message.error(confirmResponse.message || t('payment.paymentFailed'));
        onError?.(new Error(confirmResponse.message));
      }
    } catch (error: any) {
      const errorMsg = error.message || t('payment.paymentProcessingFailed');
      message.error(errorMsg);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCardSelect = (value: string) => {
    form.setFieldsValue({
      cardNumber: value,
      expiry: '12/34',
      cvc: '123',
    });
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>
          <CreditCardOutlined /> {t('payment.mockPayment')}
        </Title>
        <Text type="secondary">{description}</Text>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong>{t('payment.paymentAmount')}:</Text>
        <Text style={{ fontSize: 18, color: '#1890ff', marginLeft: 8 }}>
          ${amount.toFixed(2)} {currency.toUpperCase()}
        </Text>
      </div>

      {/* Test Card Selector */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 6,
        }}
      >
        <Text strong style={{ display: 'block', marginBottom: 8, color: '#0050b3' }}>
          💳 {t('payment.selectTestCard')}：
        </Text>
        <Select
          style={{ width: '100%' }}
          placeholder={t('payment.selectTestCardPlaceholder')}
          onChange={handleTestCardSelect}
          size="large"
        >
          {testCards.map((card) => (
            <Option key={card.value} value={card.value}>
              {card.label}
            </Option>
          ))}
        </Select>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('payment.testCardHint')}
          </Text>
        </div>
      </div>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label={t('payment.cardNumber')}
          name="cardNumber"
          rules={[
            { required: true, message: t('payment.pleaseEnterCardNumber') },
            { len: 16, message: t('payment.cardNumberMustBe16Digits') },
          ]}
        >
          <Input
            placeholder="1234 5678 9012 3456"
            maxLength={16}
            size="large"
            prefix={<CreditCardOutlined />}
          />
        </Form.Item>

        <Space size="large" style={{ width: '100%' }}>
          <Form.Item
            label={t('payment.expiryDate')}
            name="expiry"
            rules={[{ required: true, message: t('payment.pleaseEnterExpiryDate') }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="MM/YY" maxLength={5} size="large" />
          </Form.Item>

          <Form.Item
            label="CVC"
            name="cvc"
            rules={[
              { required: true, message: t('payment.pleaseEnterCVC') },
              { len: 3, message: t('payment.cvcMustBe3Digits') },
            ]}
            style={{ flex: 1 }}
          >
            <Input placeholder="123" maxLength={3} size="large" />
          </Form.Item>
        </Space>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={<LockOutlined />}
          size="large"
          block
          style={{ marginTop: 16 }}
        >
          {loading ? t('payment.processing') : `${t('payment.pay')} $${amount.toFixed(2)}`}
        </Button>
      </Form>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <LockOutlined /> {t('payment.mockEnvironmentNotice')}
        </Text>
      </div>

      {/* Test Instructions */}
      <div
        style={{
          marginTop: 24,
          padding: 12,
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 6,
        }}
      >
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          📝 {t('payment.testInstructions')}：
        </Text>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
          <li>
            <Text type="success">4242 4242 4242 4242</Text> - {t('payment.paymentSuccess')}
          </li>
          <li>
            <Text type="danger">4000 0000 0000 0002</Text> - {t('payment.cardDeclined')}
          </li>
          <li>
            <Text type="danger">4000 0000 0000 9995</Text> - {t('payment.insufficientFunds')}
          </li>
          <li>
            <Text type="danger">4000 0000 0000 0069</Text> - {t('payment.cardExpired')}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MockPaymentForm;

