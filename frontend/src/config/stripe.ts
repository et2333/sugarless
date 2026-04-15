import { loadStripe, Stripe } from '@stripe/stripe-js';

// 从环境变量获取Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SJQtJB2oMvmBIDuCQzh97OJVJpIyHtlX8CVAX9G04uXzROkOZMOn3be7CfCTKmiBu7Tjxm2swLFZEipABCQWB8T0079ckbniN';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY === 'pk_test_your_publishable_key_here') {
      console.warn('Stripe publishable key not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file');
      return Promise.resolve(null);
    }
    // 添加错误处理，避免被拦截时显示错误
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY).catch((error) => {
      console.warn('Stripe加载被浏览器拦截，这不会影响商户界面功能', error);
      return null;
    });
  }
  return stripePromise;
};

// 不要立即加载Stripe，只在需要时加载
export default getStripe;
