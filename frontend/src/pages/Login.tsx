import React from 'react';
import { Form, Input, Button, Card, message, Typography, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI, type AuthResponse } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authAPI.login(values);
      const { user, token } = response.data;
      setAuth(token, user);
      message.success(t('auth.loginSuccess'));
      
      // 根据角色跳转不同页面
      if (user.role === 'merchant') {
        navigate('/merchant/dashboard');
      } else {
        navigate('/dashboard'); // 普通用户跳转到仪表板
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      const msg = error.message || t('auth.loginFailed');
      if (msg.includes('未验证')) {
        setUnverifiedEmail(values.email);
        message.warning('邮箱未验证，已提供重发验证邮件选项');
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
        headStyle={{
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1890ff'
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <HeartOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
            {t('auth.loginTitle')}
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguageSwitcher />
            <Link to="/register" style={{ color: '#1890ff' }}>{t('auth.registerTitle')}</Link>
          </div>
        }
      >
        <Alert
          message={t('auth.testAccount')}
          description={
            <div>
              <div><strong>{t('auth.user')}：</strong>{t('auth.testAccountInfo')}</div>
              <div><strong>{t('auth.merchant')}：</strong>{t('auth.testMerchantInfo')}</div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        {unverifiedEmail && (
          <Alert
            message="邮箱未验证"
            description={
              <div>
                <div>请前往邮箱完成验证，或点击下方重新发送验证邮件。</div>
                <div style={{ marginTop: 8 }}>目标邮箱：{unverifiedEmail}</div>
              </div>
            }
            type="warning"
            showIcon
            action={
              <Button type="primary" size="small" loading={resending} onClick={async () => {
                if (!unverifiedEmail) return;
                try {
                  setResending(true);
                  await authAPI.resendVerification(unverifiedEmail);
                  message.success('验证邮件已发送，请查收邮箱');
                } catch (err: any) {
                  message.error(err.message || '发送失败，请稍后重试');
                } finally {
                  setResending(false);
                }
              }}>
                重发验证邮件
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: t('auth.emailRequired') }, { type: 'email', message: t('auth.emailInvalid') }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder={t('auth.email')} 
              style={{ borderRadius: '8px' }}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={t('auth.password')}
              style={{ borderRadius: '8px' }}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ 
                height: '48px', 
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {t('auth.loginButton')}
            </Button>
          </Form.Item>
        </Form>
        
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            {t('auth.noAccount')}<Link to="/register" style={{ color: '#1890ff' }}>{t('auth.registerTitle')}</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

