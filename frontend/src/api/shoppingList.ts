import apiClient from './client';

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  suggestedVendor?: {
    vendorName: string;
    price: number;
    productUrl?: string;
  };
}

export interface ShoppingList {
  id: string;
  userId: string;
  mealPlanId?: string;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  items: ShoppingItem[];
  estimatedCost: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoppingListDto {
  name: string;
  items?: ShoppingItem[];
}

export interface UpdateShoppingListDto {
  name?: string;
  items?: ShoppingItem[];
  status?: 'active' | 'completed' | 'cancelled';
}

export const shoppingListAPI = {
  // 从膳食计划生成购物清单
  async generateFromMealPlan(mealPlanId: string): Promise<ShoppingList> {
    const response = await apiClient.post(`/shopping-lists/generate-from-meal-plan/${mealPlanId}`);
    return response.data;
  },

  // 获取所有购物清单
  async getShoppingLists(status?: string): Promise<ShoppingList[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get('/shopping-lists', { params });
    return response.data;
  },

  // 获取单个购物清单
  async getShoppingList(id: string): Promise<ShoppingList> {
    const response = await apiClient.get(`/shopping-lists/${id}`);
    return response.data;
  },

  // 更新购物清单
  async updateShoppingList(id: string, data: UpdateShoppingListDto): Promise<ShoppingList> {
    const response = await apiClient.put(`/shopping-lists/${id}`, data);
    return response.data;
  },

  // 删除购物清单
  async deleteShoppingList(id: string): Promise<void> {
    await apiClient.delete(`/shopping-lists/${id}`);
  },

  // 切换清单项的勾选状态
  async toggleItem(id: string, ingredientId: string): Promise<ShoppingList> {
    const response = await apiClient.post(`/shopping-lists/${id}/toggle-item`, {
      ingredientId
    });
    return response.data;
  },
};

