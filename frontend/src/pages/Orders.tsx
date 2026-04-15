import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  message,
  Empty,
  Typography,
  Row,
  Col,
  Divider,
  Descriptions,
  Timeline,
  Tabs,
} from 'antd';
import {
  ShoppingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { orderAPI, Order } from '../api/order';
import MockPaymentForm from '../components/payment/MockPaymentForm';
import { paymentApi } from '../api/payment';

const { Title, Text } = Typography;
// Use new items API instead of TabPane

const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Get order list
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => orderAPI.getOrders({ 
      status: activeTab === 'all' ? undefined : activeTab,
      page: 1,
      limit: 100
    }),
  });

  // Cancel order
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      orderAPI.cancelOrder(id, reason),
    onSuccess: () => {
      message.success(t('orders.orderCancelled'));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDetailModalVisible(false);
    },
    onError: () => {
      message.error(t('orders.cancelFailed'));
    },
  });

  // Confirm delivery
  const confirmDeliveryMutation = useMutation({
    mutationFn: (id: string) => orderAPI.confirmDelivery(id),
    onSuccess: () => {
      message.success(t('orders.deliveryConfirmed'));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDetailModalVisible(false);
    },
    onError: () => {
      message.error(t('orders.confirmDeliveryFailed'));
    },
  });

  // Delete order
  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => orderAPI.deleteOrder(id),
    onSuccess: () => {
      message.success(t('orders.orderDeleted'));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDetailModalVisible(false);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || t('orders.deleteFailed'));
    },
  });

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalVisible(true);
  };

  const handleCancelOrder = (order: Order) => {
    Modal.confirm({
      title: t('orders.confirmCancel'),
      content: t('orders.cancelConfirmMessage'),
      okText: t('orders.confirmCancel'),
      cancelText: t('common.back'),
      okButtonProps: { danger: true },
      onOk: () => {
        cancelMutation.mutate({ id: order.id, reason: t('orders.userCancelled') });
      },
    });
  };

  const handleConfirmDelivery = (order: Order) => {
    Modal.confirm({
      title: t('orders.confirmDelivery'),
      content: t('orders.confirmDeliveryMessage'),
      okText: t('orders.confirmDelivery'),
      cancelText: t('common.cancel'),
      onOk: () => {
        confirmDeliveryMutation.mutate(order.id);
      },
    });
  };

  const handleDeleteOrder = (order: Order) => {
    Modal.confirm({
      title: t('orders.deleteOrder'),
      content: t('orders.deleteConfirmMessage'),
      okText: t('orders.confirmDelete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        deleteOrderMutation.mutate(order.id);
      },
    });
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentModalVisible(true);
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    message.success(t('orders.paymentSuccess'));
    setIsPaymentModalVisible(false);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handlePaymentError = (error: any) => {
    message.error(t('orders.paymentFailed') + ': ' + (error.message || t('orders.unknownError')));
  };

  // Order status tag colors and text
  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'orange', text: t('orders.statusPending') },
      confirmed: { color: 'blue', text: t('orders.statusConfirmed') },
      processing: { color: 'cyan', text: t('orders.statusProcessing') },
      shipped: { color: 'purple', text: t('orders.statusShipped') },
      delivered: { color: 'green', text: t('orders.statusDelivered') },
      cancelled: { color: 'red', text: t('orders.statusCancelled') },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Payment status tag
  const getPaymentStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'orange', text: t('orders.paymentPending') },
      paid: { color: 'green', text: t('orders.paymentPaid') },
      failed: { color: 'red', text: t('orders.paymentFailed') },
      refunded: { color: 'purple', text: t('orders.paymentRefunded') },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Delivery method text
  const getDeliveryMethodText = (method: string) => {
    const methodMap = {
      standard: t('orders.deliveryStandard'),
      express: t('orders.deliveryExpress'),
      pickup: t('orders.deliveryPickup'),
    };
    return methodMap[method as keyof typeof methodMap] || method;
  };

  const columns = [
    {
      title: t('orders.orderNumber'),
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong copyable>{text}</Text>,
    },
    {
      title: t('orders.orderStatus'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('orders.paymentStatus'),
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => getPaymentStatusTag(status),
    },
    {
      title: t('orders.orderAmount'),
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      render: (amount: number, record: Order) => (
        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
          ${amount.toFixed(2)} {record.currency}
        </Text>
      ),
    },
    {
      title: t('orders.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('en-US'),
    },
    {
      title: t('orders.actions'),
      key: 'actions',
      render: (record: Order) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetails(record)}>
            {t('orders.viewDetails')}
          </Button>
          {record.status === 'shipped' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleConfirmDelivery(record)}
            >
              {t('orders.confirmDelivery')}
            </Button>
          )}
          {record.paymentStatus === 'pending' && record.status !== 'cancelled' && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handlePayment(record)}
            >
              {t('orders.payNow')}
            </Button>
          )}
          {['pending', 'confirmed'].includes(record.status) && (
            <Button
              size="small"
              danger
              onClick={() => handleCancelOrder(record)}
            >
              {t('orders.cancelOrder')}
            </Button>
          )}
          {record.status === 'cancelled' && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteOrder(record)}
            >
              {t('orders.deleteOrder')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const orders = ordersData?.data || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <ShoppingOutlined className="mr-2" />
          {t('orders.title')}
        </Title>
        <Text type="secondary">{t('orders.subtitle')}</Text>
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { key: 'all', label: t('orders.allOrders') },
            { key: 'pending', label: t('orders.pending') },
            { key: 'processing', label: t('orders.processing') },
            { key: 'shipped', label: t('orders.shipped') },
            { key: 'delivered', label: t('orders.delivered') },
            { key: 'cancelled', label: t('orders.cancelled') }
          ]}
        />

        {isLoading ? (
          <Empty description={t('orders.loading')} />
        ) : !orders || orders.length === 0 ? (
          <Empty
            description={
              <div>
                <p>{t('orders.noOrders')}</p>
                <p>{t('orders.goToShoppingList')}</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => t('orders.totalOrders', { count: total }),
            }}
          />
        )}
      </Card>

      {/* Order detail modal */}
      <Modal
        title={
          <Space>
            <ShoppingOutlined />
            {t('orders.orderDetails')}
          </Space>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            {t('common.close')}
          </Button>,
          selectedOrder?.status === 'shipped' && (
            <Button
              key="confirm"
              type="primary"
              onClick={() => selectedOrder && handleConfirmDelivery(selectedOrder)}
            >
              {t('orders.confirmDelivery')}
            </Button>
          ),
          selectedOrder && ['pending', 'confirmed'].includes(selectedOrder.status) && (
            <Button
              key="cancel"
              danger
              onClick={() => selectedOrder && handleCancelOrder(selectedOrder)}
            >
              {t('orders.cancelOrder')}
            </Button>
          ),
          selectedOrder?.status === 'cancelled' && (
            <Button
              key="delete"
              danger
              icon={<DeleteOutlined />}
              onClick={() => selectedOrder && handleDeleteOrder(selectedOrder)}
            >
              {t('orders.deleteOrder')}
            </Button>
          ),
        ]}
      >
        {selectedOrder && (
          <div>
            {/* Order basic information */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label={t('orders.orderNumber')} span={2}>
                <Text strong copyable>{selectedOrder.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.orderStatus')}>
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.paymentStatus')}>
                {getPaymentStatusTag(selectedOrder.paymentStatus)}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.createdAt')}>
                {new Date(selectedOrder.createdAt).toLocaleString('en-US')}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.updatedAt')}>
                {new Date(selectedOrder.updatedAt).toLocaleString('en-US')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('orders.deliveryInfo')}</Divider>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label={t('orders.deliveryMethod')} span={2}>
                {getDeliveryMethodText(selectedOrder.deliveryMethod)}
              </Descriptions.Item>
              <Descriptions.Item label={<><EnvironmentOutlined /> {t('orders.deliveryAddress')}</>} span={2}>
                {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city},{' '}
                {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.postcode}
              </Descriptions.Item>
              {selectedOrder.deliveryAddress.phone && (
                <Descriptions.Item label={<><PhoneOutlined /> {t('orders.contactPhone')}</>} span={2}>
                  {selectedOrder.deliveryAddress.phone}
                </Descriptions.Item>
              )}
              {selectedOrder.estimatedDelivery && (
                <Descriptions.Item label={t('orders.estimatedDelivery')}>
                  {new Date(selectedOrder.estimatedDelivery).toLocaleString('en-US')}
                </Descriptions.Item>
              )}
              {selectedOrder.actualDelivery && (
                <Descriptions.Item label={t('orders.actualDelivery')}>
                  {new Date(selectedOrder.actualDelivery).toLocaleString('en-US')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>{t('orders.orderAmount')}</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">{t('orders.subtotal')}</Text>
                  <div className="text-xl font-bold">
                    ${selectedOrder.totalAmount.toFixed(2)}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">{t('orders.shippingCost')}</Text>
                  <div className="text-xl font-bold">
                    ${selectedOrder.shippingCost.toFixed(2)}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">{t('orders.taxAmount')}</Text>
                  <div className="text-xl font-bold">
                    ${selectedOrder.taxAmount.toFixed(2)}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ borderColor: '#52c41a' }}>
                  <Text type="secondary">{t('orders.total')}</Text>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedOrder.finalAmount.toFixed(2)}
                  </div>
                </Card>
              </Col>
            </Row>

            {selectedOrder.subOrders && selectedOrder.subOrders.length > 0 && (
              <>
                <Divider>{t('orders.orderItems')}</Divider>
                {selectedOrder.subOrders.map((subOrder, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>{t('orders.vendor')}: {subOrder.vendor}</Text>
                          <br />
                          <Text type="secondary">{t('orders.itemCount')}: {subOrder.items.length} {t('orders.items')}</Text>
                          {subOrder.externalOrderId && (
                            <>
                              <br />
                              <Text type="secondary" copyable={{ text: subOrder.externalOrderId }}>
                                {t('orders.externalOrderId')}: {subOrder.externalOrderId}
                              </Text>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          {getStatusTag(subOrder.status)}
                          <br />
                          <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                            ${subOrder.totalAmount.toFixed(2)}
                          </Text>
                        </div>
                      </div>
                    </div>

                    {/* Item list */}
                    <Table
                      size="small"
                      dataSource={subOrder.items}
                      pagination={false}
                      rowKey={(item: any) => item.ingredientId || item.name}
                      columns={[
                        {
                          title: t('orders.itemName'),
                          dataIndex: 'name',
                          key: 'name',
                          render: (name: string) => <Text strong>{name}</Text>
                        },
                        {
                          title: t('orders.quantity'),
                          dataIndex: 'quantity',
                          key: 'quantity',
                          width: 100,
                          render: (quantity: number, record: any) => (
                            <Text>{quantity} {record.unit || t('orders.pieces')}</Text>
                          )
                        },
                        {
                          title: t('orders.unitPrice'),
                          key: 'price',
                          width: 120,
                          render: (record: any) => (
                            <Text>${record.suggestedVendor?.price?.toFixed(2) || '0.00'}</Text>
                          )
                        },
                        {
                          title: t('orders.subtotal'),
                          key: 'subtotal',
                          width: 120,
                          render: (record: any) => {
                            const price = record.suggestedVendor?.price || 0;
                            const quantity = record.quantity || 0;
                            return (
                              <Text strong style={{ color: '#52c41a' }}>
                                ${(price * quantity).toFixed(2)}
                              </Text>
                            );
                          }
                        }
                      ]}
                    />
                  </Card>
                ))}
              </>
            )}

            {selectedOrder.note && (
              <>
                <Divider>{t('orders.orderNote')}</Divider>
                <Card size="small">
                  <Text>{selectedOrder.note}</Text>
                </Card>
              </>
            )}

            {/* Order timeline */}
            <Divider>{t('orders.orderProgress')}</Divider>
            <Timeline>
              <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                <Text strong>{t('orders.orderCreated')}</Text>
                <br />
                <Text type="secondary">
                  {new Date(selectedOrder.createdAt).toLocaleString('en-US')}
                </Text>
              </Timeline.Item>
              
              {selectedOrder.status !== 'pending' && selectedOrder.status !== 'cancelled' && (
                <Timeline.Item color="blue" dot={<CheckCircleOutlined />}>
                  <Text strong>{t('orders.orderConfirmed')}</Text>
                </Timeline.Item>
              )}
              
              {['processing', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                <Timeline.Item color="blue" dot={<CheckCircleOutlined />}>
                  <Text strong>{t('orders.orderProcessing')}</Text>
                </Timeline.Item>
              )}
              
              {['shipped', 'delivered'].includes(selectedOrder.status) && (
                <Timeline.Item color="purple" dot={<CheckCircleOutlined />}>
                  <Text strong>{t('orders.orderShipped')}</Text>
                </Timeline.Item>
              )}
              
              {selectedOrder.status === 'delivered' && (
                <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                  <Text strong>{t('orders.delivered')}</Text>
                  {selectedOrder.actualDelivery && (
                    <>
                      <br />
                      <Text type="secondary">
                        {new Date(selectedOrder.actualDelivery).toLocaleString('en-US')}
                      </Text>
                    </>
                  )}
                </Timeline.Item>
              )}
              
              {selectedOrder.status === 'cancelled' && (
                <Timeline.Item color="red" dot={<CloseCircleOutlined />}>
                  <Text strong>{t('orders.orderCancelled')}</Text>
                  <br />
                  <Text type="secondary">
                    {new Date(selectedOrder.updatedAt).toLocaleString('en-US')}
                  </Text>
                </Timeline.Item>
              )}
              
              {selectedOrder.status === 'pending' && (
                <Timeline.Item color="gray" dot={<ClockCircleOutlined />}>
                  <Text type="secondary">{t('orders.waitingForConfirmation')}</Text>
                </Timeline.Item>
              )}
            </Timeline>
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal
        title={`${t('orders.payOrder')} - ${selectedOrder?.orderNumber}`}
        open={isPaymentModalVisible}
        onCancel={() => setIsPaymentModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <Row justify="space-between">
                <Col>
                  <Text strong>{t('orders.orderAmount')}</Text>
                  <br />
                  <Text style={{ fontSize: 24, color: '#52c41a' }}>
                    ${selectedOrder.finalAmount.toFixed(2)} {selectedOrder.currency}
                  </Text>
                </Col>
                <Col>
                  <Text type="secondary">{t('orders.orderNumber')}: {selectedOrder.orderNumber}</Text>
                </Col>
              </Row>
            </div>
            
            <MockPaymentForm
              amount={selectedOrder.finalAmount}
              currency={selectedOrder.currency?.toLowerCase() || 'aud'}
              description={`${t('orders.orderPayment')} - ${selectedOrder.orderNumber}`}
              orderId={selectedOrder.id}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;

