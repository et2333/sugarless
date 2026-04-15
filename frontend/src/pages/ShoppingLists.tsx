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
  Form,
  message,
  Popconfirm,
  Empty,
  Badge,
  Typography,
  Row,
  Col,
  Checkbox,
  Divider,
  Select,
  Input,
} from 'antd';
import {
  ShoppingCartOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { shoppingListAPI, ShoppingList, ShoppingItem } from '../api/shoppingList';
import { orderAPI } from '../api/order';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const ShoppingListsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isOrderModalVisible, setIsOrderModalVisible] = useState(false);
  const [orderForm] = Form.useForm();

  // 购物清单名称翻译助手函数
  const translateShoppingListName = (name: string): string => {
    const nameTranslations: Record<string, string> = {
      '商城购物清单': 'Shopping List',
      '购物清单': 'Shopping List',
      '日常购物清单': 'Daily Shopping List',
      '健康食品清单': 'Healthy Food List',
      '糖尿病专用清单': 'Diabetes Shopping List',
      '营养补充清单': 'Nutrition Supplement List',
      '药品清单': 'Medication List',
      '食材清单': 'Ingredient List',
      '零食清单': 'Snack List',
      '饮料清单': 'Beverage List'
    };
    return nameTranslations[name] || name;
  };

  // 购物清单项目名称翻译助手函数
  const translateShoppingItemName = (name: string): string => {
    const itemTranslations: Record<string, string> = {
      '苹果': 'Apple',
      '香蕉': 'Banana',
      '橙子': 'Orange',
      '葡萄': 'Grape',
      '草莓': 'Strawberry',
      '蓝莓': 'Blueberry',
      '胡萝卜': 'Carrot',
      '西兰花': 'Broccoli',
      '菠菜': 'Spinach',
      '番茄': 'Tomato',
      '黄瓜': 'Cucumber',
      '洋葱': 'Onion',
      '大蒜': 'Garlic',
      '土豆': 'Potato',
      '红薯': 'Sweet Potato',
      '鸡肉': 'Chicken',
      '牛肉': 'Beef',
      '猪肉': 'Pork',
      '鱼肉': 'Fish',
      '鸡蛋': 'Egg',
      '牛奶': 'Milk',
      '酸奶': 'Yogurt',
      '奶酪': 'Cheese',
      '面包': 'Bread',
      '米饭': 'Rice',
      '面条': 'Noodles',
      '燕麦': 'Oatmeal',
      '坚果': 'Nuts',
      '杏仁': 'Almond',
      '核桃': 'Walnut',
      '花生': 'Peanut',
      '橄榄油': 'Olive Oil',
      '椰子油': 'Coconut Oil',
      '蜂蜜': 'Honey',
      '糖': 'Sugar',
      '盐': 'Salt',
      '胡椒': 'Pepper',
      '酱油': 'Soy Sauce',
      '醋': 'Vinegar',
      '茶': 'Tea',
      '咖啡': 'Coffee',
      '水': 'Water',
      '果汁': 'Juice',
      '维生素': 'Vitamin',
      '钙片': 'Calcium',
      '鱼油': 'Fish Oil',
      '蛋白粉': 'Protein Powder',
      '血糖仪': 'Blood Glucose Meter',
      '试纸': 'Test Strips',
      '胰岛素': 'Insulin',
      '血糖药': 'Blood Sugar Medication'
    };
    return itemTranslations[name] || name;
  };

  // 获取购物清单
  const { data: shoppingLists, isLoading } = useQuery({
    queryKey: ['shoppingLists'],
    queryFn: async () => {
      const result = await shoppingListAPI.getShoppingLists();
      console.log('获取购物清单列表:', result);
      return result;
    },
    refetchOnMount: 'always', // 每次进入页面都重新获取数据
    refetchOnWindowFocus: true, // 窗口获得焦点时重新获取
  });

  // 从膳食计划生成购物清单
  const generateMutation = useMutation({
    mutationFn: (mealPlanId: string) => shoppingListAPI.generateFromMealPlan(mealPlanId),
    onSuccess: () => {
      message.success(t('shoppingList.generateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
    onError: () => {
      message.error(t('shoppingList.generateFailed'));
    },
  });

  // 删除购物清单
  const deleteMutation = useMutation({
    mutationFn: (id: string) => shoppingListAPI.deleteShoppingList(id),
    onSuccess: () => {
      message.success(t('shoppingList.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    },
  });

  // 切换清单项状态
  const toggleMutation = useMutation({
    mutationFn: ({ listId, ingredientId }: { listId: string; ingredientId: string }) =>
      shoppingListAPI.toggleItem(listId, ingredientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      if (selectedList) {
        // 刷新详情
        shoppingListAPI.getShoppingList(selectedList.id).then(setSelectedList);
      }
    },
  });

  // 创建订单
  const createOrderMutation = useMutation({
    mutationFn: (data: any) => orderAPI.createFromShoppingList(data),
    onSuccess: () => {
      message.success(t('shoppingList.orderCreateSuccess'));
      setIsOrderModalVisible(false);
      setIsDetailModalVisible(false);
      orderForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      // 跳转到订单管理页面
      Modal.success({
        title: t('shoppingList.orderCreateSuccess'),
        content: t('shoppingList.orderCreateDescription'),
        okText: t('shoppingList.viewNow'),
        onOk: () => {
          navigate('/orders');
        },
      });
    },
    onError: (error: any) => {
      message.error(error.message || t('shoppingList.orderCreateFailed'));
    },
  });

  const handleViewDetails = (list: ShoppingList) => {
    setSelectedList(list);
    setIsDetailModalVisible(true);
  };

  const handleCreateOrder = (list: ShoppingList) => {
    setSelectedList(list);
    setIsOrderModalVisible(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedList) return;
    
    try {
      const values = await orderForm.validateFields();
      createOrderMutation.mutate({
        shoppingListId: selectedList.id,
        deliveryAddress: {
          street: values.street,
          city: values.city,
          state: values.state,
          postcode: values.postcode,
          country: 'Australia',
          phone: values.phone,
        },
        deliveryMethod: values.deliveryMethod || 'standard',
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 全选/取消全选
  const handleToggleAll = () => {
    if (!selectedList) return;
    
    const allChecked = selectedList.items.every(item => item.checked);
    const updatedItems = selectedList.items.map(item => ({
      ...item,
      checked: !allChecked
    }));
    
    shoppingListAPI.updateShoppingList(selectedList.id, {
      items: updatedItems
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      shoppingListAPI.getShoppingList(selectedList.id).then(setSelectedList);
    });
  };

  const handleToggleItem = (item: ShoppingItem) => {
    if (selectedList) {
      toggleMutation.mutate({
        listId: selectedList.id,
        ingredientId: item.ingredientId,
      });
    }
  };

  // 按分类分组
  const itemsByCategory = selectedList
    ? selectedList.items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, ShoppingItem[]>)
    : {};

  const columns = [
    {
      title: t('shoppingList.listName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ShoppingList) => (
        <div>
          <Text strong>{translateShoppingListName(text)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.items.length} {t('shoppingList.items')}
          </Text>
        </div>
      ),
    },
    {
      title: t('shoppingList.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          active: 'blue',
          completed: 'green',
          cancelled: 'red',
        };
        const labels = {
          active: t('shoppingList.statusActive'),
          completed: t('shoppingList.statusCompleted'),
          cancelled: t('shoppingList.statusCancelled'),
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: t('shoppingList.estimatedCost'),
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      render: (cost: number, record: ShoppingList) => (
        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
          ${(cost || 0).toFixed(2)} {record.currency}
        </Text>
      ),
    },
    {
      title: t('shoppingList.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('en-US'),
    },
    {
      title: t('shoppingList.actions'),
      key: 'actions',
      render: (record: ShoppingList) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetails(record)}>
            {t('shoppingList.viewDetails')}
          </Button>
          {record.status === 'active' && (
            <Button
              type="primary"
              size="small"
              icon={<ShoppingOutlined />}
              onClick={() => handleCreateOrder(record)}
            >
              {t('shoppingList.oneClickOrder')}
            </Button>
          )}
          <Popconfirm
            title={t('shoppingList.confirmDelete')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={2}>
            <ShoppingCartOutlined className="mr-2" />
            {t('shoppingList.title')}
          </Title>
          <Text type="secondary">{t('shoppingList.subtitle')}</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/meal-plans')}
        >
          {t('shoppingList.generateFromMealPlan')}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Empty description={t('shoppingList.loading')} />
        ) : !shoppingLists || shoppingLists.length === 0 ? (
          <Empty
            description={
              <div>
                <p>{t('shoppingList.noLists')}</p>
                <p>{t('shoppingList.createMealPlanFirst')}</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/meal-plans')}>
              {t('shoppingList.goCreateMealPlan')}
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={shoppingLists}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => t('shoppingList.totalLists', { count: total }),
            }}
          />
        )}
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined />
            {selectedList?.name ? translateShoppingListName(selectedList.name) : ''}
            <Tag color={selectedList?.status === 'active' ? 'blue' : 'green'}>
              {selectedList?.status === 'active' ? t('shoppingList.statusActive') : t('shoppingList.statusCompleted')}
            </Tag>
          </Space>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            {t('common.close')}
          </Button>,
          selectedList?.status === 'active' && (
            <Button
              key="order"
              type="primary"
              icon={<ShoppingOutlined />}
              onClick={() => {
                setIsDetailModalVisible(false);
                if (selectedList) handleCreateOrder(selectedList);
              }}
            >
              {t('shoppingList.oneClickOrder')}
            </Button>
          ),
        ]}
      >
        {selectedList && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <Card size="small">
                  <Badge status="processing" text={t('shoppingList.totalItems')} />
                  <div className="text-2xl font-bold">{selectedList.items.length}</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Badge status="success" text={t('shoppingList.selectedItems')} />
                  <div className="text-2xl font-bold">
                    {selectedList.items.filter(i => i.checked).length}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <DollarOutlined className="mr-1" />
                  <span>{t('shoppingList.estimatedCost')}</span>
                  <div className="text-2xl font-bold text-green-600">
                    ${(selectedList.estimatedCost || 0).toFixed(2)}
                  </div>
                </Card>
              </Col>
            </Row>

            <Divider>
              <Space>
                {t('shoppingList.details')}
                <Button 
                  size="small" 
                  onClick={handleToggleAll}
                  icon={<CheckCircleOutlined />}
                >
                  {selectedList.items.every(i => i.checked) ? t('shoppingList.unselectAll') : t('shoppingList.selectAll')}
                </Button>
              </Space>
            </Divider>

            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category} className="mb-4">
                <Title level={5}>{category}</Title>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card
                      key={item.ingredientId}
                      size="small"
                      className={item.checked ? 'opacity-60' : ''}
                    >
                      <div className="flex justify-between items-center">
                        <Checkbox
                          checked={item.checked}
                          onChange={() => handleToggleItem(item)}
                        >
                          <Space>
                            <Text delete={item.checked} strong>
                              {translateShoppingItemName(item.name)}
                            </Text>
                            <Tag>
                              {item.quantity} {item.unit}
                            </Tag>
                          </Space>
                        </Checkbox>
                        {item.suggestedVendor && (
                          <div className="text-right">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.suggestedVendor.vendorName}
                            </Text>
                            <br />
                            <Text strong style={{ color: '#52c41a' }}>
                              ${(item.suggestedVendor.price || 0).toFixed(2)}
                            </Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 订单创建模态框 */}
      <Modal
        title={t('shoppingList.createOrder')}
        open={isOrderModalVisible}
        onCancel={() => setIsOrderModalVisible(false)}
        onOk={handleSubmitOrder}
        okText={t('shoppingList.confirmOrder')}
        cancelText={t('common.cancel')}
        confirmLoading={createOrderMutation.isPending}
        width={600}
      >
        {selectedList && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
              <Text strong>{t('shoppingList.orderInfo')}</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{t('shoppingList.itemCount', { count: selectedList.items.length })}</Text>
                <br />
                <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                  {t('shoppingList.estimatedTotal')}: ${(selectedList.estimatedCost || 0).toFixed(2)} AUD
                </Text>
              </div>
            </div>

            <Form
              form={orderForm}
              layout="vertical"
              initialValues={{
                deliveryMethod: 'standard',
                state: 'NSW',
              }}
            >
              <Form.Item
                label={t('shoppingList.deliveryMethod')}
                name="deliveryMethod"
                rules={[{ required: true, message: t('shoppingList.selectDeliveryMethod') }]}
              >
                <Select>
                  <Option value="standard">{t('shoppingList.standardDelivery')}</Option>
                  <Option value="express">{t('shoppingList.expressDelivery')}</Option>
                  <Option value="pickup">{t('shoppingList.pickup')}</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={t('shoppingList.streetAddress')}
                name="street"
                rules={[{ required: true, message: t('shoppingList.enterStreetAddress') }]}
              >
                <Input placeholder={t('shoppingList.streetAddressExample')} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={t('shoppingList.city')}
                    name="city"
                    rules={[{ required: true, message: t('shoppingList.enterCity') }]}
                  >
                    <Input placeholder={t('shoppingList.cityExample')} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('shoppingList.state')}
                    name="state"
                    rules={[{ required: true, message: t('shoppingList.selectState') }]}
                  >
                    <Select>
                      <Option value="NSW">NSW</Option>
                      <Option value="VIC">VIC</Option>
                      <Option value="QLD">QLD</Option>
                      <Option value="WA">WA</Option>
                      <Option value="SA">SA</Option>
                      <Option value="TAS">TAS</Option>
                      <Option value="ACT">ACT</Option>
                      <Option value="NT">NT</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={t('shoppingList.postcode')}
                    name="postcode"
                    rules={[
                      { required: true, message: t('shoppingList.enterPostcode') },
                      { pattern: /^\d{4}$/, message: t('shoppingList.invalidPostcode') }
                    ]}
                  >
                    <Input placeholder={t('shoppingList.postcodeExample')} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('shoppingList.phone')}
                    name="phone"
                    rules={[{ required: true, message: t('shoppingList.enterPhone') }]}
                  >
                    <Input placeholder={t('shoppingList.phoneExample')} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ShoppingListsPage;

