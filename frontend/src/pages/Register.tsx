import React from 'react';
import { Form, Input, Button, Card, message, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/auth';

const { Option } = Select;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const response = await authAPI.register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
      });
      setRegisteredEmail(values.email);
      message.success('Verification email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Register error:', error);
      message.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card title="Check your email" style={{ width: 500 }}>
          <p>
            We have sent a verification link to <strong>{registeredEmail}</strong>.
            Please open the link to verify your account. After verification, you can login.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={() => navigate('/login')}>Go to Login</Button>
            <Button onClick={async () => {
              try {
                await authAPI.resendVerification(registeredEmail);
                message.success('Verification email resent.');
              } catch (err: any) {
                message.error(err.message || 'Failed to resend');
              }
            }}>Resend Email</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card
        title="Create Account"
        style={{ width: 400 }}
        extra={<Link to="/login">Already have an account? Login</Link>}
      >
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          initialValues={{ role: 'user' }}
          layout="vertical"
        >
          <Form.Item name="role" label="Account Type" rules={[{ required: true, message: 'Please select account type' }]}> 
            <Select size="large" placeholder="Select account type">
              <Option value="user">
                <UserOutlined /> User (Patient)
              </Option>
              <Option value="merchant">
                <ShopOutlined /> Merchant
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter email' }, { type: 'email', message: 'Please enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" autoComplete="email" />
          </Form.Item>

          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Please enter first name' }]}>
            <Input prefix={<UserOutlined />} placeholder="First Name" size="large" />
          </Form.Item>

          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Please enter last name' }]}>
            <Input prefix={<UserOutlined />} placeholder="Last Name" size="large" />
          </Form.Item>

          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password' }, { min: 8, message: 'Password must be at least 8 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password (min 8 characters)" size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[{ required: true, message: 'Please confirm password' }, ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Passwords do not match'));
            },
          })]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Register
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
