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
  Row,
  Col,
} from 'antd';
import { 
  MobileOutlined, 
  SendOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  PhoneOutlined 
} from '@ant-design/icons';
import { notificationApi } from '../../api/notification';

const { Title, Text } = Typography;
const { Option } = Select;

interface SmsServiceStatus {
  service: string;
  configured: boolean;
  username: string;
  apiKey: string;
  senderId: string;
  status: string;
}

interface PhoneValidationResult {
  phone: string;
  isValid: boolean;
  formatted: string;
}

const SmsTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [validationLoading, setValidationLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState<SmsServiceStatus | null>(null);
  const [validationResult, setValidationResult] = useState<PhoneValidationResult | null>(null);
  const [form] = Form.useForm();

  // 获取短信服务状态
  const fetchSmsStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await notificationApi.sms.getStatus();
      setSmsStatus(response.data);
    } catch (error: any) {
      message.error(`获取短信服务状态失败: ${error.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchSmsStatus();
  }, []);

  const handleValidatePhone = async () => {
    const phone = form.getFieldValue('phone');
    if (!phone) {
      message.warning('请先输入手机号码');
      return;
    }

    try {
      setValidationLoading(true);
      const response = await notificationApi.sms.validatePhone({ phone });
      setValidationResult(response.data);
      
      if (response.data.isValid) {
        message.success('手机号码格式正确');
      } else {
        message.error('手机号码格式不正确');
      }
    } catch (error: any) {
      message.error(`手机号码验证失败: ${error.message}`);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleSendSms = async (values: any) => {
    try {
      setLoading(true);
      
      // 先验证手机号
      await handleValidatePhone();
      if (!validationResult?.isValid) {
        message.error('请先验证正确的手机号码格式');
        return;
      }

      const response = await notificationApi.sms.sendTest({
        to: values.phone,
        type: values.type || 'test',
      });

      message.success(response.message || '短信发送成功！');
      
      // 重新获取状态
      fetchSmsStatus();
    } catch (error: any) {
      message.error(`短信发送失败: ${error.message}`);
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
          <MobileOutlined />
          短信服务测试
        </Space>
      }
      extra={
        <Button icon={<CheckCircleOutlined />} onClick={fetchSmsStatus} loading={statusLoading}>
          刷新状态
        </Button>
      }
    >
      {/* 服务状态 */}
      {smsStatus && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>服务状态</Title>
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Space wrap>
                <Tag color={getConfiguredColor(smsStatus.configured)}>
                  配置状态: {smsStatus.configured ? '已配置' : '未配置'}
                </Tag>
                <Tag color={getStatusColor(smsStatus.status)}>
                  服务状态: {smsStatus.status}
                </Tag>
                <Tag icon={<MobileOutlined />}>服务: {smsStatus.service}</Tag>
              </Space>
            </Col>
            <Col span={24}>
              <Space wrap>
                <Tag>用户名: {smsStatus.username}</Tag>
                <Tag>API密钥: {smsStatus.apiKey}</Tag>
                <Tag icon={<PhoneOutlined />}>发送者ID: {smsStatus.senderId}</Tag>
              </Space>
            </Col>
          </Row>
        </div>
      )}

      <Divider />

      {/* 手机号验证 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>手机号码验证</Title>
        <Form.Item label="手机号码" style={{ marginBottom: 16 }}>
          <Input.Group compact>
            <Form.Item
              name="phone"
              rules={[{ required: true, message: '请输入手机号码' }]}
              style={{ width: 'calc(100% - 120px)' }}
            >
              <Input
                placeholder="+86 13812345678 或 13812345678"
                prefix={<PhoneOutlined />}
              />
            </Form.Item>
            <Button 
              loading={validationLoading}
              onClick={handleValidatePhone}
              style={{ width: 120 }}
            >
              验证格式
            </Button>
          </Input.Group>
        </Form.Item>

        {validationResult && (
          <div style={{ 
            padding: 12, 
            backgroundColor: validationResult.isValid ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${validationResult.isValid ? '#b7eb8f' : '#ffccc7'}`,
            borderRadius: 6 
          }}>
            <Space>
              {validationResult.isValid ? (
                <>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text type="success">格式正确</Text>
                </>
              ) : (
                <>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text type="danger">格式错误</Text>
                </>
              )}
              <Text type="secondary">格式化结果: {validationResult.formatted}</Text>
            </Space>
          </div>
        )}
      </div>

      <Divider />

      {/* 发送测试短信 */}
      <Title level={5}>发送测试短信</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendSms}
        initialValues={{
          phone: '+6143523147',
          type: 'test',
        }}
      >
        <Form.Item
          label="手机号码"
          name="phone"
          rules={[
            { required: true, message: '请输入手机号码' },
          ]}
        >
          <Input
            placeholder="请输入手机号码 (例如: +6143523147)"
            prefix={<MobileOutlined />}
          />
        </Form.Item>

        <Form.Item label="短信类型" name="type">
          <Select>
            <Option value="test">通用测试短信</Option>
            <Option value="verification">验证码短信</Option>
            <Option value="blood-sugar-alert">血糖警报短信</Option>
            <Option value="medication-reminder">药物提醒短信</Option>
            <Option value="appointment-reminder">预约提醒短信</Option>
            <Option value="emergency">紧急警报短信</Option>
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
            发送测试短信
          </Button>
        </Form.Item>
      </Form>

      {smsStatus && !smsStatus.configured && (
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
              短信服务未配置或配置有误，请检查后端ClickSend API配置
            </Text>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default SmsTestPanel;


