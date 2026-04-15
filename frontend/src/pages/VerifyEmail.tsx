import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Result, Spin, Button } from 'antd';
import apiClient from '../api/client';

const useQuery = () => new URLSearchParams(useLocation().search);

const VerifyEmail: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = query.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }

    const verify = async () => {
      try {
        setStatus('loading');
        await apiClient.get(`/auth/verify?token=${encodeURIComponent(token)}`);
        setStatus('success');
        setMessage('Email verified successfully. You can now log in.');
      } catch (err: any) {
        const msg = String(err.message || 'Email verification failed');
        // Treat already-used token as success (common when user clicks twice)
        if (/already used|TOKEN_USED/i.test(msg)) {
          setStatus('success');
          setMessage('Email already verified. You can now log in.');
        } else if (/expired|TOKEN_EXPIRED/i.test(msg)) {
          setStatus('error');
          setMessage('Verification link expired. Please request a new verification email.');
        } else if (/invalid|TOKEN_INVALID/i.test(msg)) {
          setStatus('error');
          setMessage('Invalid verification link.');
        } else {
          setStatus('error');
          setMessage(msg);
        }
      }
    };

    verify();
  }, []);

  if (status === 'loading' || status === 'idle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin tip="Verifying email..." />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Result
        status="success"
        title="Email Verified"
        subTitle={message}
        extra={[
          <Button type="primary" key="login" onClick={() => navigate('/login')}>Go to Login</Button>,
          <Link to="/register" key="register">Back to Register</Link>
        ]}
      />
    );
  }

  return (
    <Result
      status="error"
      title="Email Verification Failed"
      subTitle={message}
      extra={[
        <Link to="/login" key="login">Back to Login</Link>
      ]}
    />
  );
};

export default VerifyEmail;
