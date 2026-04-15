import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Typography,
  Space,
  Divider,
  Tag,
  Spin,
} from 'antd';
import { MailOutlined, SendOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { notificationApi } from '../../api/notification';

const { Title, Text } = Typography;
const { Option } = Select;

interface EmailServiceStatus {
  service: string;
  configured: boolean;
  apiKey: string;
  status: string;
}

const EmailTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus | null>(null);
  const [form] = Form.useForm();

  // 获取邮件服务状态
  const fetchEmailStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await notificationApi.email.getStatus();
      setEmailStatus(response.data);
    } catch (error: any) {
      message.error(`获取邮件服务状态失败: ${error.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailStatus();
  }, []);

  const handleSendEmail = async (values: any) => {
    try {
      setLoading(true);
      const response = await notificationApi.email.sendTest({
        to: values.to,
        type: values.type || 'test',
      });

      message.success(response.message || '邮件发送成功！');
      
      // 重新获取状态
      fetchEmailStatus();
    } catch (error: any) {
      message.error(`邮件发送失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'not_configured':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConfiguredColor = (configured: boolean) => {
    return configured ? 'success' : 'error';
  };

  return (
    <Card
      title={
        <Space>
          <MailOutlined />
          邮件服务测试
        </Space>
      }
      extra={
        <Button icon={<CheckCircleOutlined />} onClick={fetchEmailStatus} loading={statusLoading}>
          刷新状态
        </Button>
      }
    >
      {/* 服务状态 */}
      {emailStatus && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>服务状态</Title>
          <Space wrap>
            <Tag color={getConfiguredColor(emailStatus.configured)}>
              配置状态: {emailStatus.configured ? '已配置' : '未配置'}
            </Tag>
            <Tag color={getStatusColor(emailStatus.status)}>
              服务状态: {emailStatus.status}
            </Tag>
            <Tag icon={<MailOutlined />}>服务: {emailStatus.service}</Tag>
            <Tag>API密钥: {emailStatus.apiKey}</Tag>
          </Space>
        </div>
      )}

      <Divider />

      {/* 发送测试邮件 */}
      <Title level={5}>发送测试邮件</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendEmail}
        initialValues={{
          to: 'cody00313@gmail.com',
          type: 'test',
        }}
      >
        <Form.Item
          label="收件人邮箱"
          name="to"
          rules={[
            { required: true, message: '请输入收件人邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            placeholder="请输入邮箱地址"
            prefix={<MailOutlined />}
          />
        </Form.Item>

        <Form.Item label="邮件类型" name="type">
          <Select>
            <Option value="test">通用测试邮件</Option>
            <Option value="verification">验证码邮件</Option>
            <Option value="blood-sugar-alert">血糖警报邮件</Option>
            <Option value="medication-reminder">药物提醒邮件</Option>
            <Option value="meal-plan">膳食计划邮件</Option>
            <Option value="order-update">订单更新邮件</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SendOutlined />}
            block
          >
            发送测试邮件
          </Button>
        </Form.Item>
      </Form>

      {emailStatus && !emailStatus.configured && (
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7',
          borderRadius: 6 
        }}>
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text type="danger">
              邮件服务未配置或配置有误，请检查后端Resend API配置
            </Text>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default EmailTestPanel;


