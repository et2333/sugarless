import apiClient from './client';

export interface Address {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  notes?: string;
}

export interface SubOrder {
  vendor: string;
  items: any[];
  status: string;
  totalAmount: number;
  externalOrderId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  shoppingListId?: string;
  mealPlanId?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  subOrders: SubOrder[];
  totalAmount: number;
  shippingCost: number;
  taxAmount: number;
  finalAmount: number;
  currency: string;
  deliveryAddress: Address;
  deliveryMethod: 'standard' | 'express' | 'pickup';
  estimatedDelivery?: string;
  actualDelivery?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  shoppingListId: string;
  deliveryAddress: Address;
  deliveryMethod?: 'standard' | 'express' | 'pickup';
  paymentMethod?: string;
  note?: string;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const orderAPI = {
  // 从购物清单创建订单
  async createFromShoppingList(data: CreateOrderDto): Promise<Order> {
    const response = await apiClient.post('/orders/create-from-shopping-list', data);
    return response.data;
  },

  // 获取所有订单
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Order[];
    pagination: OrderPagination;
  }> {
    const response = await apiClient.get('/orders', { params });
    return response;
  },

  // 获取单个订单
  async getOrder(id: string): Promise<Order> {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  // 取消订单
  async cancelOrder(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/orders/${id}/cancel`, { reason });
  },

  // 更新支付状态
  async updatePaymentStatus(id: string, status: 'paid' | 'failed'): Promise<void> {
    await apiClient.post(`/orders/${id}/payment`, { status });
  },

  // 确认收货
  async confirmDelivery(id: string): Promise<void> {
    await apiClient.post(`/orders/${id}/confirm-delivery`);
  },

  // 删除订单（仅限已取消的订单）
  async deleteOrder(id: string): Promise<void> {
    await apiClient.delete(`/orders/${id}`);
  },
};

