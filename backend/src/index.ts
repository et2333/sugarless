import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 导入路由
import authRoutes from './routes/auth2.routes';
import profileRoutes from './routes/profile.routes';
import mealPlanRoutes from './routes/mealPlan.routes';
import productRoutes from './routes/product.routes';
import dashboardRoutes from './routes/dashboard.routes';
import medicationRoutes from './routes/medication.routes';
import reminderRoutes from './routes/reminder.routes';
import nutritionRoutes from './routes/nutrition.routes';
import shoppingListRoutes from './routes/shoppingList.routes';
import orderRoutes from './routes/order.routes';
import merchantOrderRoutes from './routes/merchantOrder.routes';
import inventoryRoutes from './routes/inventory.routes';
import shipmentRoutes from './routes/shipment.routes';
import recommendationRoutes from './routes/recommendation.routes';
import bloodSugarRoutes from './routes/bloodSugar.routes';
import communityRoutes from './routes/community.routes';
import paymentRoutes from './routes/payment.routes';
import mockPaymentRoutes from './routes/mockPayment.routes';
import doctorRoutes from './routes/doctor.routes';
import notificationRoutes from './routes/notification.routes';
import testEmailRoutes from './routes/test-email.routes';
import testSmsRoutes from './routes/test-sms.routes';
import testStripeRoutes from './routes/test-stripe.routes';
import aiRoutes from './routes/ai.routes';

// 导入中间�?
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { EmailService } from './services/emailService';
import { PaymentService } from './services/paymentService';

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化服�?
try {
  EmailService.initialize();
  console.log('�?EmailService initialized');
} catch (error) {
  console.warn('⚠️ EmailService initialization failed:', (error as Error).message);
}

try {
  PaymentService.initialize();
  console.log('�?PaymentService initialized');
} catch (error) {
  console.warn('⚠️ PaymentService initialization failed:', (error as Error).message);
}

// 中间�?
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检�?
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'diabetes-platform-api'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/merchant', merchantOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/blood-sugar', bloodSugarRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mock-payment', mockPaymentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test-email', testEmailRoutes);
app.use('/api/test-sms', testSmsRoutes);
app.use('/api/test-stripe', testStripeRoutes);
app.use('/api/ai', aiRoutes);

// API文档（简单版本）
app.get('/api-docs', (req, res) => {
  res.json({
    name: 'Diabetes Platform API',
    version: '1.0.0',
    description: 'MVP版本API文档',
    endpoints: {
      auth: {
        'POST /api/auth/register': '用户注册',
        'POST /api/auth/login': '用户登录',
        'GET /api/auth/me': '获取当前用户信息'
      },
      profiles: {
        'GET /api/profiles/me': '获取我的档案',
        'PUT /api/profiles/me': '更新档案',
        'POST /api/profiles/me': '创建档案'
      },
      mealPlans: {
        'POST /api/meal-plans/generate': '生成膳食计划',
        'GET /api/meal-plans': '获取我的膳食计划列表',
        'GET /api/meal-plans/:id': '获取计划详情'
      },
      products: {
        'GET /api/products/search': '搜索产品',
        'GET /api/products/:id': '获取产品详情'
      },
      ai: {
        'POST /api/ai/chat': 'AI健康助手对话',
        'GET /api/ai/chat/history': '获取对话历史',
        'GET /api/ai/quick-replies': '获取快速回复建�?,
        'POST /api/ai/transcribe': '语音转文�?,
        'GET /api/ai/status': '获取AI服务状�?
      }
    }
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务�?
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 健康检�? http://localhost:${PORT}/health`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
});

export default app;


