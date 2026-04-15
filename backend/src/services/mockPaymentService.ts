/**
 * 模拟支付服务 - 用于开发和演示
 * Mock Payment Service for Development and Demo
 */

import prisma from '../utils/prisma';

export interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export class MockPaymentService {
  /**
   * 创建模拟支付意图
   */
  static async createPaymentIntent(orderId: string): Promise<MockPaymentIntent> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 生成模拟的支付ID和密钥
    const mockPaymentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockClientSecret = `${mockPaymentId}_secret_${Math.random().toString(36).substr(2, 16)}`;

    // 保存到数据库
    try {
      await prisma.paymentIntent.create({
        data: {
          stripeId: mockPaymentId,
          orderId: order.id,
          userId: order.userId,
          amount: order.finalAmount,
          currency: order.currency,
          status: 'pending',
          clientSecret: mockClientSecret,
        },
      });
    } catch (error: any) {
      // 如果已存在，则更新
      if (error.code === 'P2002') {
        await prisma.paymentIntent.update({
          where: { orderId: order.id },
          data: {
            stripeId: mockPaymentId,
            status: 'pending',
            clientSecret: mockClientSecret,
          },
        });
      } else {
        throw error;
      }
    }

    return {
      id: mockPaymentId,
      amount: order.finalAmount,
      currency: order.currency,
      status: 'pending',
      clientSecret: mockClientSecret,
    };
  }

  /**
   * 确认模拟支付
   * 根据卡号模拟不同的支付结果
   */
  static async confirmPayment(
    clientSecret: string,
    cardNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    // 从 clientSecret 中提取 paymentIntentId
    const paymentIntentId = clientSecret.split('_secret_')[0];

    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { stripeId: paymentIntentId },
    });

    if (!paymentIntent) {
      return { success: false, error: '支付意图不存在' };
    }

    // 模拟不同的支付结果
    const normalizedCard = cardNumber.replace(/\s/g, '');
    
    // 成功的测试卡号
    const successCards = [
      '4242424242424242',
      '5555555555554444',
      '378282246310005',
    ];

    // 失败的测试卡号
    const failureCards = [
      '4000000000000002', // 卡被拒绝
      '4000000000009995', // 余额不足
      '4000000000000069', // 卡已过期
    ];

    let success = false;
    let error = undefined;

    if (successCards.includes(normalizedCard)) {
      // 支付成功
      success = true;
      
      // 更新支付意图状态
      await prisma.paymentIntent.update({
        where: { stripeId: paymentIntentId },
        data: {
          status: 'succeeded',
          confirmedAt: new Date(),
        },
      });

      // 更新订单支付状态（订单状态保持 pending，等待商家确认）
      await prisma.order.update({
        where: { id: paymentIntent.orderId },
        data: {
          paymentStatus: 'paid',
          // 注意：订单状态保持 pending，需要商家手动确认后才变为 confirmed
        },
      });

      console.log(`✅ [模拟支付] 支付成功，订单等待商家确认`);
    } else if (failureCards.includes(normalizedCard)) {
      // 支付失败
      success = false;
      
      if (normalizedCard === '4000000000000002') {
        error = '您的卡被拒绝了';
      } else if (normalizedCard === '4000000000009995') {
        error = '您的卡余额不足';
      } else if (normalizedCard === '4000000000000069') {
        error = '您的卡已过期';
      }

      // 更新支付意图状态
      await prisma.paymentIntent.update({
        where: { stripeId: paymentIntentId },
        data: {
          status: 'failed',
          failedAt: new Date(),
        },
      });

      // 更新订单状态
      await prisma.order.update({
        where: { id: paymentIntent.orderId },
        data: {
          paymentStatus: 'failed',
        },
      });
    } else {
      // 默认成功（对于其他卡号）
      success = true;
      
      await prisma.paymentIntent.update({
        where: { stripeId: paymentIntentId },
        data: {
          status: 'succeeded',
          confirmedAt: new Date(),
        },
      });

      // 更新订单支付状态（订单状态保持 pending，等待商家确认）
      await prisma.order.update({
        where: { id: paymentIntent.orderId },
        data: {
          paymentStatus: 'paid',
          // 注意：订单状态保持 pending，需要商家手动确认后才变为 confirmed
        },
      });

      console.log(`✅ [模拟支付] 支付成功，订单等待商家确认`);
    }

    return { success, error };
  }

  /**
   * 获取支付意图详情
   */
  static async getPaymentIntent(paymentIntentId: string) {
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { stripeId: paymentIntentId },
      include: { order: true },
    });

    if (!paymentIntent) {
      throw new Error('支付意图不存在');
    }

    return {
      id: paymentIntent.stripeId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      orderId: paymentIntent.orderId,
    };
  }
}

