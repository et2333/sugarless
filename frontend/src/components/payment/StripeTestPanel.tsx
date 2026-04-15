import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
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
  Table,
  Modal,
} from 'antd';
import {
  CreditCardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { paymentApi } from '../../api/payment';
import StripePaymentForm from './StripePaymentForm';

const { Title, Text } = Typography;
const { Option } = Select;

interface StripeServiceStatus {
  service: string;
  configured: boolean;
  secretKey: string;
  webhookSecret: string;
  status: string;
}

interface StripeAccountInfo {
  accountId: string;
  country: string;
  currency: string;
  type: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

const StripeTestPanel: React.FC = () => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  
  const [stripeStatus, setStripeStatus] = useState<StripeServiceStatus | null>(null);
  const [accountInfo, setAccountInfo] = useState<StripeAccountInfo | null>(null);
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentIntent | null>(null);
  
  const [form] = Form.useForm();

  // 获取Stripe服务状态
  const fetchStripeStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await paymentApi.test.getStatus();
      setStripeStatus(response.data);
    } catch (error: any) {
      message.error(`获取Stripe服务状态失败: ${error.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  // 获取账户信息
  const fetchAccountInfo = async () => {
    try {
      setAccountLoading(true);
      const response = await paymentApi.test.getAccountInfo();
      setAccountInfo(response.data);
    } catch (error: any) {
      message.error(`获取账户信息失败: ${error.message}`);
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    fetchStripeStatus();
    fetchAccountInfo();
  }, []);

  const handleCreateTestIntent = async (values: any) => {
    try {
      setCreateLoading(true);
      const response = await paymentApi.test.createTestIntent({
        amount: values.amount * 100, // 转换为分
        currency: values.currency.toLowerCase(),
        description: values.description,
      });

      const newPaymentIntent = response.data;
      setPaymentIntents(prev => [newPaymentIntent, ...prev]);
      message.success('测试支付意图创建成功！');
      
      form.resetFields();
    } catch (error: any) {
      message.error(`创建支付意图失败: ${error.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelIntent = async (paymentIntentId: string) => {
    try {
      setCancelLoading(true);
      await paymentApi.test.cancelIntent(paymentIntentId);
      
      setPaymentIntents(prev => 
        prev.map(item => 
          item.paymentIntentId === paymentIntentId 
            ? { ...item, status: 'canceled' }
            : item
        )
      );
      
      message.success('支付意图已取消！');
    } catch (error: any) {
      message.error(`取消支付意图失败: ${error.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenPaymentModal = (payment: PaymentIntent) => {
    setSelectedPayment(payment);
    setPaymentModalVisible(true);
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'requires_payment_method':
        return 'warning';
      case 'canceled':
        return 'error';
      case 'succeeded':
        return 'success';
      default:
        return 'default';
    }
  };

  const paymentColumns = [
    {
      title: '支付意图ID',
      dataIndex: 'paymentIntentId',
      key: 'paymentIntentId',
      render: (id: string) => (
        <Text code style={{ fontSize: 12 }}>
          {id.substring(0, 20)}...
        </Text>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: PaymentIntent) => (
        <Text strong>
          ${(amount / 100).toFixed(2)} {record.currency.toUpperCase()}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: PaymentIntent) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleOpenPaymentModal(record)}
            size="small"
          >
            查看
          </Button>
          {record.status === 'requires_payment_method' && (
            <Button
              type="link"
              danger
              icon={<StopOutlined />}
              onClick={() => handleCancelIntent(record.paymentIntentId)}
              loading={cancelLoading}
              size="small"
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <CreditCardOutlined />
            Stripe支付服务测试
          </Space>
        }
        extra={
          <Space>
            <Button icon={<CheckCircleOutlined />} onClick={fetchStripeStatus} loading={statusLoading}>
              刷新状态
            </Button>
            <Button onClick={fetchAccountInfo} loading={accountLoading}>
              账户信息
            </Button>
          </Space>
        }
      >
        {/* 服务状态 */}
        {stripeStatus && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>服务状态</Title>
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Space wrap>
                  <Tag color={stripeStatus.configured ? 'success' : 'error'}>
                    配置状态: {stripeStatus.configured ? '已配置' : '未配置'}
                  </Tag>
                  <Tag color={getStatusColor(stripeStatus.status)}>
                    服务状态: {stripeStatus.status}
                  </Tag>
                  <Tag icon={<CreditCardOutlined />}>服务: {stripeStatus.service}</Tag>
                </Space>
              </Col>
              <Col span={24}>
                <Space wrap>
                  <Tag>密钥: {stripeStatus.secretKey}</Tag>
                  <Tag>Webhook: {stripeStatus.webhookSecret}</Tag>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* 账户信息 */}
        {accountInfo && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>账户信息</Title>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text strong>账户ID:</Text>
                <Text code style={{ marginLeft: 8, fontSize: 12 }}>
                  {accountInfo.accountId}
                </Text>
              </Col>
              <Col span={12}>
                <Text strong>国家:</Text>
                <Text style={{ marginLeft: 8 }}>{accountInfo.country}</Text>
              </Col>
              <Col span={12}>
                <Text strong>货币:</Text>
                <Text style={{ marginLeft: 8 }}>{accountInfo.currency.toUpperCase()}</Text>
              </Col>
              <Col span={12}>
                <Text strong>类型:</Text>
                <Text style={{ marginLeft: 8 }}>{accountInfo.type}</Text>
              </Col>
              <Col span={24}>
                <Space wrap>
                  <Tag color={accountInfo.detailsSubmitted ? 'success' : 'warning'}>
                    详细信息: {accountInfo.detailsSubmitted ? '已提交' : '未提交'}
                  </Tag>
                  <Tag color={accountInfo.chargesEnabled ? 'success' : 'error'}>
                    收费功能: {accountInfo.chargesEnabled ? '已启用' : '未启用'}
                  </Tag>
                  <Tag color={accountInfo.payoutsEnabled ? 'success' : 'error'}>
                    支付功能: {accountInfo.payoutsEnabled ? '已启用' : '未启用'}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        <Divider />

        {/* 创建测试支付意图 */}
        <Title level={5}>创建测试支付意图</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTestIntent}
          initialValues={{
            amount: 10,
            currency: 'aud',
            description: '测试支付 - 糖尿病管理平台',
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="金额"
                name="amount"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber
                  min={0.01}
                  max={10000}
                  step={0.01}
                  style={{ width: '100%' }}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="货币" name="currency">
                <Select>
                  <Option value="aud">AUD (澳元)</Option>
                  <Option value="usd">USD (美元)</Option>
                  <Option value="cny">CNY (人民币)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="描述" name="description">
                <Input placeholder="支付描述" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createLoading}
              icon={<CreditCardOutlined />}
            >
              创建测试支付意图
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        {/* 支付意图列表 */}
        {paymentIntents.length > 0 && (
          <div>
            <Title level={5}>支付意图列表</Title>
            <Table
              dataSource={paymentIntents}
              columns={paymentColumns}
              rowKey="paymentIntentId"
              pagination={false}
              size="small"
            />
          </div>
        )}

        {stripeStatus && !stripeStatus.configured && (
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
                Stripe服务未配置或配置有误，请检查后端Stripe API配置
              </Text>
            </Space>
          </div>
        )}
      </Card>

      {/* 支付弹窗 */}
      <Modal
        title="Stripe Elements 支付"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedPayment && (
          <StripePaymentForm
            amount={selectedPayment.amount / 100}
            currency={selectedPayment.currency}
            description="测试支付"
            onSuccess={(paymentIntent) => {
              message.success('支付成功！');
              setPaymentModalVisible(false);
              fetchStripeStatus();
            }}
            onError={(error) => {
              message.error(`支付失败: ${error.message}`);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default StripeTestPanel;


