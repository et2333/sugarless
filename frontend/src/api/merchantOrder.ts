import apiClient from './client';
import { Order, SubOrder } from './order';

export interface VendorOrder extends Order {
  allSubOrders?: SubOrder[];
}

export interface VendorStats {
  [vendor: string]: number;
}

export interface MerchantOrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VendorStatistics {
  totalOrders: number;
  totalRevenue: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface OrderStatistics {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  vendors: {
    [vendor: string]: VendorStatistics;
  };
}

export const merchantOrderAPI = {
  // 获取商户的所有订单
  async getVendorOrders(params?: {
    vendor?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: VendorOrder[];
    pagination: MerchantOrderPagination;
    vendorStats: VendorStats;
  }> {
    const response = await apiClient.get('/merchant/vendor-orders', { params });
    return response;
  },

  // 获取单个订单详情
  async getOrder(id: string): Promise<Order> {
    const response = await apiClient.get(`/merchant/orders/${id}`);
    return response.data;
  },

  // 更新订单状态
  async updateOrderStatus(
    id: string,
    status: string,
    note?: string
  ): Promise<Order> {
    const response = await apiClient.patch(`/merchant/orders/${id}/status`, {
      status,
      note,
    });
    return response.data;
  },

  // 更新子订单状态
  async updateSubOrderStatus(
    id: string,
    vendor: string,
    status: string,
    trackingNumber?: string,
    note?: string
  ): Promise<Order> {
    const response = await apiClient.patch(`/merchant/orders/${id}/sub-order`, {
      vendor,
      status,
      trackingNumber,
      note,
    });
    return response.data;
  },

  // 批量更新订单
  async batchUpdateOrders(
    orderIds: string[],
    action: 'confirm' | 'process' | 'cancel',
    note?: string
  ): Promise<void> {
    await apiClient.post('/merchant/orders/batch-update', {
      orderIds,
      action,
      note,
    });
  },

  // 获取统计数据
  async getStatistics(vendor?: string): Promise<OrderStatistics> {
    const response = await apiClient.get('/merchant/statistics', {
      params: { vendor },
    });
    return response.data;
  },
};

