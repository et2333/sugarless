import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  message,
  Statistic,
  Row,
  Col,
  Descriptions,
  Badge,
  Tabs,
  List,
  Typography,
  Divider,
} from 'antd';
import {
  ShopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CarOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { merchantOrderAPI, VendorOrder } from '../api/merchantOrder';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const MerchantOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [updateForm] = Form.useForm();

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

  // 获取订单列表
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['merchantOrders', selectedVendor, selectedStatus, currentPage, pageSize],
    queryFn: () =>
      merchantOrderAPI.getVendorOrders({
        vendor: selectedVendor || undefined,
        status: selectedStatus || undefined,
        page: currentPage,
        limit: pageSize,
      }),
  });

  // 获取统计数据
  const { data: statistics } = useQuery({
    queryKey: ['merchantStatistics', selectedVendor],
    queryFn: () => merchantOrderAPI.getStatistics(selectedVendor || undefined),
  });

  // 更新订单状态
  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: string; status: string; note?: string }) =>
      merchantOrderAPI.updateOrderStatus(params.id, params.status, params.note),
    onSuccess: (data) => {
      console.log('✅ 订单状态更新成功:', data);
      message.success(t('merchant.orderStatusUpdated'));
      // 刷新订单列表和统计数据
      queryClient.invalidateQueries({ queryKey: ['merchantOrders'] });
      queryClient.invalidateQueries({ queryKey: ['merchantStatistics'] });
      // 强制重新获取当前页面的数据
      queryClient.refetchQueries({ 
        queryKey: ['merchantOrders', selectedVendor, selectedStatus, currentPage, pageSize]
      });
      setUpdateModalVisible(false);
      updateForm.resetFields();
    },
    onError: (error: any) => {
      console.error('❌ 订单状态更新失败:', error);
      message.error(error.message || t('merchant.updateFailed'));
    },
  });

  // 更新子订单状态
  const updateSubOrderMutation = useMutation({
    mutationFn: (params: {
      id: string;
      vendor: string;
      status: string;
      trackingNumber?: string;
      note?: string;
    }) =>
      merchantOrderAPI.updateSubOrderStatus(
        params.id,
        params.vendor,
        params.status,
        params.trackingNumber,
        params.note
      ),
    onSuccess: (data) => {
      console.log('✅ 子订单状态更新成功:', data);
      message.success(t('merchant.subOrderStatusUpdated'));
      // 刷新订单列表和统计数据
      queryClient.invalidateQueries({ queryKey: ['merchantOrders'] });
      queryClient.invalidateQueries({ queryKey: ['merchantStatistics'] });
      // 强制重新获取当前页面的数据
      queryClient.refetchQueries({ 
        queryKey: ['merchantOrders', selectedVendor, selectedStatus, currentPage, pageSize]
      });
      setUpdateModalVisible(false);
      updateForm.resetFields();
    },
    onError: (error: any) => {
      console.error('❌ 子订单状态更新失败:', error);
      message.error(error.message || t('merchant.subOrderUpdateFailed'));
    },
  });

  const handleViewDetail = (order: VendorOrder) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const handleUpdateStatus = (order: VendorOrder) => {
    setSelectedOrder(order);
    updateForm.setFieldsValue({
      status: order.status,
    });
    setUpdateModalVisible(true);
  };

  // 快速确认订单
  const handleQuickConfirm = (order: VendorOrder) => {
    Modal.confirm({
      title: t('merchant.confirmOrderTitle'),
      content: t('merchant.confirmOrderContent', { orderNumber: order.orderNumber }),
      okText: t('merchant.confirm'),
      cancelText: t('merchant.cancel'),
      onOk: async () => {
        try {
          // 如果只有一个子订单，更新子订单状态
          if (order.subOrders.length === 1) {
            await updateSubOrderMutation.mutateAsync({
              id: order.id,
              vendor: order.subOrders[0].vendor,
              status: 'confirmed',
            });
          } else {
            // 多个子订单，更新主订单状态
            await updateStatusMutation.mutateAsync({
              id: order.id,
              status: 'confirmed',
            });
          }
          message.success(t('merchant.orderConfirmedSuccess'));
        } catch (error: any) {
          message.error(error.message || t('merchant.confirmFailed'));
        }
      },
    });
  };

  const handleSubmitUpdate = async () => {
    try {
      const values = await updateForm.validateFields();
      console.log('📝 提交订单状态更新:', {
        orderId: selectedOrder?.id,
        orderNumber: selectedOrder?.orderNumber,
        values
      });
      
      if (selectedOrder) {
        if (values.vendor) {
          // 更新子订单
          console.log('🔄 更新子订单状态...');
          updateSubOrderMutation.mutate({
            id: selectedOrder.id,
            vendor: values.vendor,
            status: values.status,
            trackingNumber: values.trackingNumber,
            note: values.note,
          });
        } else {
          // 更新主订单
          console.log('🔄 更新主订单状态...');
          updateStatusMutation.mutate({
            id: selectedOrder.id,
            status: values.status,
            note: values.note,
          });
        }
      }
    } catch (error) {
      console.error('❌ 表单验证失败:', error);
      message.error(t('merchant.pleaseFillRequiredFields'));
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: t('merchant.waitingForConfirmation') },
      confirmed: { color: 'cyan', icon: <CheckCircleOutlined />, text: t('merchant.confirmed') },
      processing: { color: 'blue', icon: <SyncOutlined spin />, text: t('merchant.processing') },
      shipped: { color: 'purple', icon: <CarOutlined />, text: t('merchant.shipped') },
      delivered: { color: 'success', icon: <CheckCircleOutlined />, text: t('merchant.delivered') },
      cancelled: { color: 'error', icon: <CloseCircleOutlined />, text: t('merchant.cancelled') },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: t('merchant.orderNumber'),
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 200,
      fixed: 'left' as const,
      render: (text: string) => <Text strong copyable>{text}</Text>,
    },
    {
      title: t('merchant.supplier'),
      key: 'vendors',
      width: 150,
      render: (_: any, record: VendorOrder) => (
        <Space direction="vertical" size="small">
          {record.subOrders.map((so, idx) => (
            <Tag key={idx} icon={<ShopOutlined />} color="blue">
              {translateVendorName(so.vendor)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('merchant.itemQuantity'),
      key: 'itemCount',
      width: 100,
      render: (_: any, record: VendorOrder) => {
        const totalItems = record.subOrders.reduce((sum, so) => sum + so.items.length, 0);
        return <Badge count={totalItems} showZero color="blue" />;
      },
    },
    {
      title: t('merchant.orderAmount'),
      key: 'amount',
      width: 150,
      render: (_: any, record: VendorOrder) => {
        const vendorTotal = record.subOrders.reduce((sum, so) => sum + so.totalAmount, 0);
        return (
          <Space direction="vertical" size="small">
            <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
              ${vendorTotal.toFixed(2)}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('merchant.totalAmount')}: ${record.finalAmount.toFixed(2)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('merchant.orderStatus'),
      key: 'status',
      width: 120,
      render: (_: any, record: VendorOrder) => (
        <Space direction="vertical" size="small">
          {record.subOrders.map((so, idx) => (
            <div key={idx}>{getStatusTag(so.status)}</div>
          ))}
        </Space>
      ),
    },
    {
      title: t('merchant.paymentStatus'),
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          paid: 'green',
          failed: 'red',
          refunded: 'purple',
        };
        const texts: Record<string, string> = {
          pending: t('merchant.waitingForPayment'),
          paid: t('merchant.paid'),
          failed: t('merchant.failed'),
          refunded: t('merchant.refunded'),
        };
        return <Tag color={colors[status]}>{texts[status]}</Tag>;
      },
    },
    {
      title: t('merchant.creationTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: t('merchant.actions'),
      key: 'action',
      fixed: 'right' as const,
      width: 220,
      render: (_: any, record: VendorOrder) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleQuickConfirm(record)}
            >
              {t('merchant.confirmOrder')}
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {t('merchant.details')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleUpdateStatus(record)}
          >
            {t('merchant.update')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <ShopOutlined /> {t('merchant.merchantOrderManagement')}
      </Title>

      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card>
              <Statistic
                title={t('merchant.totalOrders')}
                value={statistics.totalOrders}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title={t('merchant.pending')}
                value={statistics.pendingOrders}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title={t('merchant.processing')}
                value={statistics.processingOrders}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined spin />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title={t('merchant.shipped')}
                value={statistics.shippedOrders}
                valueStyle={{ color: '#722ed1' }}
                prefix={<CarOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title={t('merchant.delivered')}
                value={statistics.deliveredOrders}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
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
        </Row>
      )}

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <span>{t('merchant.supplierFilter')}：</span>
          <Select
            style={{ width: 200 }}
            placeholder={t('merchant.allSuppliers')}
            allowClear
            value={selectedVendor || undefined}
            onChange={(value) => {
              setSelectedVendor(value || '');
              setCurrentPage(1);
            }}
          >
            {ordersData?.vendorStats &&
              Object.keys(ordersData.vendorStats).map((vendor) => (
                <Option key={vendor} value={vendor}>
                  {translateVendorName(vendor)} ({ordersData.vendorStats[vendor]})
                </Option>
              ))}
          </Select>

          <span>{t('merchant.statusFilter')}：</span>
          <Select
            style={{ width: 150 }}
            placeholder={t('merchant.allStatuses')}
            allowClear
            value={selectedStatus || undefined}
            onChange={(value) => {
              setSelectedStatus(value || '');
              setCurrentPage(1);
            }}
          >
            <Option value="pending">{t('merchant.waitingForConfirmation')}</Option>
            <Option value="confirmed">{t('merchant.confirmed')}</Option>
            <Option value="processing">{t('merchant.processing')}</Option>
            <Option value="shipped">{t('merchant.shipped')}</Option>
            <Option value="delivered">{t('merchant.delivered')}</Option>
            <Option value="cancelled">{t('merchant.cancelled')}</Option>
          </Select>
        </Space>
      </Card>

      {/* 订单表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={ordersData?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1500 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: ordersData?.pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${t('merchant.total')} ${total} ${t('merchant.totalRecords')}`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* 订单详情模态框 */}
      <Modal
        title={`${t('merchant.orderDetails')} - ${selectedOrder?.orderNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label={t('merchant.orderNumber')}>
                {selectedOrder.orderNumber}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.orderStatus')}>
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.paymentStatus')}>
                <Tag
                  color={
                    selectedOrder.paymentStatus === 'paid'
                      ? 'green'
                      : selectedOrder.paymentStatus === 'failed'
                      ? 'red'
                      : 'orange'
                  }
                >
                  {selectedOrder.paymentStatus === 'paid'
                    ? t('merchant.paid')
                    : selectedOrder.paymentStatus === 'failed'
                    ? t('merchant.failed')
                    : t('merchant.waitingForPayment')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.deliveryMethod')}>
                {selectedOrder.deliveryMethod === 'express'
                  ? t('merchant.expressDelivery')
                  : selectedOrder.deliveryMethod === 'standard'
                  ? t('merchant.standardDelivery')
                  : t('merchant.pickup')}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.creationTime')} span={2}>
                {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('merchant.deliveryAddress')}</Divider>
            <Descriptions bordered column={2}>
              <Descriptions.Item label={t('merchant.street')} span={2}>
                {selectedOrder.deliveryAddress.street}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.city')}>
                {selectedOrder.deliveryAddress.city}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.state')}>
                {selectedOrder.deliveryAddress.state}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.postcode')}>
                {selectedOrder.deliveryAddress.postcode}
              </Descriptions.Item>
              <Descriptions.Item label={t('merchant.phone')}>
                {selectedOrder.deliveryAddress.phone || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('merchant.subOrderList')}</Divider>
            {selectedOrder.subOrders.map((subOrder, idx) => (
              <Card
                key={idx}
                size="small"
                title={
                  <Space>
                    <ShopOutlined />
                    {translateVendorName(subOrder.vendor)}
                    {getStatusTag(subOrder.status)}
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong>{t('merchant.amount')}: </Text>
                  <Text style={{ color: '#52c41a', fontSize: 16 }}>
                    ${subOrder.totalAmount.toFixed(2)} AUD
                  </Text>
                </div>
                <List
                  size="small"
                  dataSource={subOrder.items}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space>
                        <Text>{item.ingredient}</Text>
                        <Text type="secondary">
                          {item.quantity} {item.unit}
                        </Text>
                        {item.suggestedVendor && (
                          <Text type="secondary">
                            @ ${item.suggestedVendor.price.toFixed(2)}
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ))}

            <Divider>{t('merchant.costBreakdown')}</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title={t('merchant.productTotal')} value={selectedOrder.totalAmount} prefix="$" suffix="AUD" />
              </Col>
              <Col span={8}>
                <Statistic title={t('merchant.shippingCost')} value={selectedOrder.shippingCost} prefix="$" suffix="AUD" />
              </Col>
              <Col span={8}>
                <Statistic title={t('merchant.taxAmount')} value={selectedOrder.taxAmount} prefix="$" suffix="AUD" />
              </Col>
            </Row>
            <Divider />
            <Statistic
              title={t('merchant.finalAmount')}
              value={selectedOrder.finalAmount}
              prefix="$"
              suffix="AUD"
              valueStyle={{ color: '#52c41a', fontSize: 24 }}
            />
          </div>
        )}
      </Modal>

      {/* 更新状态模态框 */}
      <Modal
        title={t('merchant.updateOrderStatus')}
        open={updateModalVisible}
        onCancel={() => {
          setUpdateModalVisible(false);
          updateForm.resetFields();
        }}
        onOk={handleSubmitUpdate}
        confirmLoading={updateStatusMutation.isPending || updateSubOrderMutation.isPending}
      >
        <Form form={updateForm} layout="vertical">
          {selectedOrder && selectedOrder.subOrders.length > 1 && (
            <Form.Item label={t('merchant.selectSubOrder')} name="vendor">
              <Select placeholder={t('merchant.selectSupplierOrderToUpdate')} allowClear>
                {selectedOrder.subOrders.map((so, idx) => (
                  <Option key={idx} value={so.vendor}>
                    {translateVendorName(so.vendor)} - {getStatusTag(so.status)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            label={t('merchant.newStatus')}
            name="status"
            rules={[{ required: true, message: t('merchant.pleaseFillRequiredFields') }]}
          >
            <Select>
              <Option value="pending">{t('merchant.waitingForConfirmation')}</Option>
              <Option value="confirmed">{t('merchant.confirmed')}</Option>
              <Option value="processing">{t('merchant.processing')}</Option>
              <Option value="shipped">{t('merchant.shipped')}</Option>
              <Option value="delivered">{t('merchant.delivered')}</Option>
              <Option value="cancelled">{t('merchant.cancelled')}</Option>
            </Select>
          </Form.Item>

          <Form.Item label={t('merchant.trackingNumber')} name="trackingNumber">
            <Input placeholder={t('merchant.trackingNumberPlaceholder')} />
          </Form.Item>

          <Form.Item label={t('merchant.notes')} name="note">
            <TextArea rows={3} placeholder={t('merchant.notesPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MerchantOrdersPage;

