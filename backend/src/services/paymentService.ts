/**
 * PaymentService - Payment Integration
 * From Report: UC-A3 Order Management - Payment processing
 */

import Stripe from 'stripe';
import prisma from '../utils/prisma';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export class PaymentService {
  private static stripe: Stripe;

  static initialize() {
    // Only initialize Stripe if API key is provided
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-06-20',
      });
    } else {
      console.warn('Stripe API key not provided, payment features will be disabled');
    }
  }

  /**
   * Create payment intent for order
   */
  static async createPaymentIntent(orderId: string): Promise<PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Payment service not initialized. Please configure Stripe API key.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.finalAmount * 100), // Convert to cents
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        userId: order.userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment intent to database
    await prisma.paymentIntent.create({
      data: {
        stripeId: paymentIntent.id,
        orderId: order.id,
        userId: order.userId,
        amount: order.finalAmount,
        currency: order.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!,
      },
    });

    return {
      id: paymentIntent.id,
      amount: order.finalAmount,
      currency: order.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret!,
    };
  }

  /**
   * Confirm payment intent
   */
  static async confirmPayment(paymentIntentId: string): Promise<boolean> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update order payment status (keep status as pending, waiting for merchant confirmation)
      await prisma.order.update({
        where: { id: paymentIntent.metadata.orderId },
        data: {
          paymentStatus: 'paid',
          // 注意：订单状态保持 pending，需要商家手动确认后才变为 confirmed
        },
      });

      console.log(`✅ [Stripe支付] 支付成功，订单等待商家确认`);

      // Update payment intent status
      await prisma.paymentIntent.update({
        where: { stripeId: paymentIntentId },
        data: {
          status: 'succeeded',
          confirmedAt: new Date(),
        },
      });

      return true;
    }

    return false;
  }

  /**
   * Get payment methods for user
   */
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // In a real implementation, you would store customer IDs
    // For this demo, we'll return mock data
    const mockMethods: PaymentMethod[] = [
      {
        id: 'pm_1234567890',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
      },
    ];

    return mockMethods;
  }

  /**
   * Create refund
   */
  static async createRefund(paymentIntentId: string, amount?: number): Promise<any> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    // Update order status
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { stripeId: paymentIntentId },
    });

    if (paymentIntent) {
      await prisma.order.update({
        where: { id: paymentIntent.orderId },
        data: {
          paymentStatus: 'refunded',
        },
      });
    }

    return refund;
  }

  /**
   * Handle webhook events
   */
  static async handleWebhook(payload: string, signature: string): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await prisma.order.update({
      where: { id: paymentIntent.metadata.orderId },
      data: {
        paymentStatus: 'paid',
        // 注意：订单状态保持 pending，需要商家手动确认后才变为 confirmed
      },
    });

    console.log(`✅ [Stripe Webhook] 支付成功，订单等待商家确认`);

    await prisma.paymentIntent.update({
      where: { stripeId: paymentIntent.id },
      data: {
        status: 'succeeded',
        confirmedAt: new Date(),
      },
    });
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await prisma.order.update({
      where: { id: paymentIntent.metadata.orderId },
      data: {
        paymentStatus: 'failed',
      },
    });

    await prisma.paymentIntent.update({
      where: { stripeId: paymentIntent.id },
      data: {
        status: 'failed',
        failedAt: new Date(),
      },
    });
  }
}
