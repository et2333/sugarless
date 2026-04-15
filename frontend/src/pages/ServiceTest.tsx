import React from 'react';
import { Tabs, Card, Typography, Space, Divider } from 'antd';
import {
  MailOutlined,
  MobileOutlined,
  CreditCardOutlined,
  ExperimentOutlined,
  NotificationOutlined,
  CalendarOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import EmailTestPanel from '../components/notification/EmailTestPanel';
import SmsTestPanel from '../components/notification/SmsTestPanel';
import WebPushTestPanel from '../components/notification/WebPushTestPanel';
import GoogleCalendarTestPanel from '../components/notification/GoogleCalendarTestPanel';
import GeminiAITestPanel from '../components/ai/GeminiAITestPanel';
import StripeTestPanel from '../components/payment/StripeTestPanel';
import StripePaymentForm from '../components/payment/StripePaymentForm';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ServiceTest: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <Space>
            <ExperimentOutlined />
            Third-Party Services Test
          </Space>
        </Title>
        <Text type="secondary">
          Test and verify integrations for email, SMS, payment and other third-party services
        </Text>
      </div>

      <Tabs defaultActiveKey="1" size="large">
        <TabPane
          tab={
            <Space>
              <MailOutlined />
              Email Service (Resend)
            </Space>
          }
          key="1"
        >
          <EmailTestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <MobileOutlined />
              SMS Service (ClickSend)
            </Space>
          }
          key="2"
        >
          <SmsTestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <NotificationOutlined />
              Push Notifications (Web Push)
            </Space>
          }
          key="3"
        >
          <WebPushTestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <CalendarOutlined />
              Google Calendar
            </Space>
          }
          key="4"
        >
          <GoogleCalendarTestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <RobotOutlined />
              Gemini AI
            </Space>
          }
          key="5"
        >
          <GeminiAITestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <CreditCardOutlined />
              Payment Service (Stripe)
            </Space>
          }
          key="6"
        >
          <StripeTestPanel />
        </TabPane>

        <TabPane
          tab={
            <Space>
              <CreditCardOutlined />
              Payment Form Demo
            </Space>
          }
          key="7"
        >
          <Card>
            <Title level={4}>Stripe Elements Payment Form Demo</Title>
            <Text type="secondary">
              This is a complete Stripe Elements payment form demonstrating how to integrate Stripe payment functionality in your application.
            </Text>
            
            <Divider />
            
            <StripePaymentForm
              amount={25.50}
              currency="aud"
              description="Demo Payment - Diabetes Management Platform"
              onSuccess={(paymentIntent) => {
                console.log('Payment succeeded:', paymentIntent);
              }}
              onError={(error) => {
                console.error('Payment failed:', error);
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <div style={{ marginTop: 32, padding: 24, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Title level={4}>Service Configuration</Title>
        <div style={{ marginTop: 16 }}>
          <Text>
            <strong>Email Service (Resend):</strong> Resend API configured, supports sending verification codes, alerts, reminders and other emails.
            <br />
            <strong>SMS Service (ClickSend):</strong> ClickSend API configured, supports sending verification codes, alerts, reminders and other SMS.
            <br />
            <strong>Push Notifications (Web Push):</strong> VAPID keys configured, supports browser push notifications.
            <br />
            <strong>Google Calendar:</strong> Google Calendar API configured, supports syncing and managing calendar events.
            <br />
            <strong>Gemini AI:</strong> Google Gemini AI API configured, supports intelligent blood sugar analysis and meal plan generation.
            <br />
            <strong>Payment Service (Stripe):</strong> Stripe API configured, supports credit card payments and multiple payment methods.
            <br />
            <br />
            All services are integrated into the backend API, frontend components can directly call the corresponding interfaces for testing and use.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ServiceTest;
