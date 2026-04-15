import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button, Spin } from 'antd';
import {
  ShopOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { merchantOrderAPI } from '../api/merchantOrder';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

const MerchantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 供应商名称翻译函数
  const translateVendorName = (vendor: string): string => {
    const vendorTranslations: Record<string, string> = {
      '商户': 'Merchant',
      'Estimated Price': 'Estimated Price',
      'iHerb': 'iHerb',
      'Coles': 'Coles',
      'Health Store': 'Health Store',
      'Woolworths': 'Woolworths',
      'Chemist Warehouse': 'Chemist Warehouse',
      'Priceline': 'Priceline',
      'Terry White': 'Terry White',
      'Amcal': 'Amcal',
      'Medical Supplies': 'Medical Supplies',
      'GNC': 'GNC'
    };
    return vendorTranslations[vendor] || vendor;
  };

  // 获取统计数据
  const { data: statistics, isLoading, error, isError } = useQuery({
    queryKey: ['merchantStatistics'],
    queryFn: () => merchantOrderAPI.getStatistics(),
    retry: false, // 不重试，避免一直loading
    refetchOnWindowFocus: false, // 避免窗口聚焦时重新请求
  });

  // 调试信息
  console.log('MerchantDashboard Debug:', { isLoading, isError, error, statistics });

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <ShopOutlined /> {t('merchant.dashboard')}
          </Title>
          <Paragraph type="secondary">
            {t('merchant.welcomeBack')}
          </Paragraph>
        </div>

        {/* 统计卡片 */}
        {isLoading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#666' }}>
                {t('common.loading')}...
              </div>
            </div>
          </Card>
        ) : isError ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ color: '#ff4d4f', fontSize: 16 }}>
                {error?.message?.includes('认证') || error?.message?.includes('UNAUTHORIZED') 
                  ? 'Please login to view merchant dashboard' 
                  : `${t('common.error')}: ${error?.message || 'Unknown error'}`}
              </div>
              <Button 
                type="primary" 
                onClick={() => window.location.reload()}
                style={{ marginTop: 16 }}
              >
                {error?.message?.includes('认证') || error?.message?.includes('UNAUTHORIZED') 
                  ? 'Go to Login' 
                  : t('common.retry')}
              </Button>
            </div>
          </Card>
        ) : statistics ? (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('merchant.totalOrders')}
                    value={statistics.totalOrders}
                    prefix={<ShopOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('merchant.totalRevenue')}
                    value={statistics.totalRevenue}
                    precision={2}
                    prefix={<DollarOutlined />}
                    suffix="AUD"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('merchant.supplierQuantity')}
                    value={Object.keys(statistics.vendors).length}
                    prefix={<ShoppingCartOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('merchant.pendingOrders')}
                    value={statistics.pendingOrders}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                  <Button
                    type="link"
                    onClick={() => navigate('/merchant/orders?status=pending')}
                  >
                    {t('merchant.viewDetails')} →
                  </Button>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('merchant.processingOrders')}
                    value={statistics.processingOrders}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Button
                    type="link"
                    onClick={() => navigate('/merchant/orders?status=processing')}
                  >
                    {t('merchant.viewDetails')} →
                  </Button>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('merchant.shippedOrders')}
                    value={statistics.shippedOrders}
                    prefix={<CarOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Button
                    type="link"
                    onClick={() => navigate('/merchant/orders?status=shipped')}
                  >
                    {t('merchant.viewDetails')} →
                  </Button>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('merchant.completedOrders')}
                    value={statistics.deliveredOrders}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        ) : null}

        {/* 快捷操作 */}
        <Card title={t('merchant.quickActions')}>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={<ShopOutlined />}
              onClick={() => navigate('/merchant/orders')}
            >
              {t('merchant.orderManagement')}
            </Button>
            <Button
              size="large"
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate('/merchant/orders?status=pending')}
            >
              {t('merchant.processPendingOrders')}
            </Button>
          </Space>
        </Card>

        {/* 供应商统计 */}
        {statistics && Object.keys(statistics.vendors).length > 0 && (
          <Card title={t('merchant.supplierStatistics')}>
            <Row gutter={16}>
              {Object.entries(statistics.vendors).map(([vendor, stats]: [string, any]) => (
                <Col span={8} key={vendor}>
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Title level={5}>{translateVendorName(vendor)}</Title>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Statistic
                        title={t('merchant.orderCount')}
                        value={stats.totalOrders}
                        suffix={t('merchant.orders')}
                      />
                      <Statistic
                        title={t('merchant.revenue')}
                        value={stats.totalRevenue}
                        precision={2}
                        prefix="$"
                        suffix="AUD"
                        valueStyle={{ color: '#52c41a' }}
                      />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{t('merchant.pending')}: {stats.pending}</span>
                        <span>{t('merchant.processing')}: {stats.processing}</span>
                        <span>{t('merchant.shipped')}: {stats.shipped}</span>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default MerchantDashboard;

