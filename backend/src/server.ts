import './utils/setupProxy';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes.clean';
import profileRoutes from './routes/profile.routes';
import mealPlanRoutes from './routes/mealPlan.routes';
import productRoutes from './routes/product.routes';
import dashboardRoutes from './routes/dashboard.routes';
import medicationRoutes from './routes/medication.routes';
import reminderRoutes from './routes/reminder.routes';
import reminderDebugRoutes from './routes/reminder-debug.routes';
import nutritionRoutes from './routes/nutrition.routes';
import shoppingListRoutes from './routes/shoppingList.routes';
import orderRoutes from './routes/order.routes';
import merchantOrderRoutes from './routes/merchantOrder.routes';
import inventoryRoutes from './routes/inventory.routes';
import shipmentRoutes from './routes/shipment.routes';
import recommendationRoutes from './routes/recommendation.routes';
import personalizedRecommendationRoutes from './routes/personalizedRecommendation.routes';
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
import medicationInventoryRoutes from './routes/medicationInventory.routes';
import checkinRoutes from './routes/checkin.routes';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { EmailService } from './services/emailService';
import { PaymentService } from './services/paymentService';
import { ChatService } from './services/chatService';
import { initializeReminderScheduler } from './services/reminderScheduler';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const server = createServer(app);

// initialize services (non-fatal)
try { EmailService.initialize(); console.log('EmailService initialized'); } catch (e) { console.warn('EmailService init failed:', (e as Error).message); }
try { PaymentService.initialize(); console.log('PaymentService initialized'); } catch (e) { console.warn('PaymentService init failed:', (e as Error).message); }

// middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'diabetes-platform-api' });
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reminders', reminderDebugRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/merchant', merchantOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/personalized-recommendations', personalizedRecommendationRoutes);
app.use('/api/blood-sugar', bloodSugarRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mock-payment', mockPaymentRoutes);
app.use('/api/medication-inventory', medicationInventoryRoutes);
app.use('/api/check-ins', checkinRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test-email', testEmailRoutes);
app.use('/api/test-sms', testSmsRoutes);
app.use('/api/test-stripe', testStripeRoutes);
app.use('/api/ai', aiRoutes);

// simple docs (english to avoid encoding issues)
app.get('/api-docs', (_req, res) => {
  res.json({
    name: 'Diabetes Platform API',
    version: '1.0.0',
    description: 'MVP endpoints',
    endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
    },
  });
});

// 404 and errors
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.IO server with proper configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Support multiple transport methods
  allowEIO3: true, // Allow Engine.IO v3 clients
});

// Initialize services (ChatService uses the same Socket.IO instance)
ChatService.initialize(server, io);
initializeReminderScheduler(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // User joins their own room for receiving reminders
  socket.on('join-reminders', (userId: string) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined reminder room`);
      socket.emit('joined-room', { room: `user-${userId}` });
    }
  });
  
  // Legacy support for 'join-user' event
  socket.on('join-user', (userId: string) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined reminder room (legacy)`);
    }
  });
  
  // Handle new check-in broadcasts
  socket.on('new-checkin', (data: { userId: string; checkIn: any }) => {
    if (data.userId) {
      io.to(`user-${data.userId}`).emit('checkin-update', data);
    }
  });
  
  // Handle reminder trigger events
  socket.on('reminder-triggered', (data: { userId: string; reminder: any }) => {
    if (data.userId) {
      io.to(`user-${data.userId}`).emit('reminder-notification', data);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('error', (error: Error) => {
    console.error('Socket error:', error);
  });
});

// Export io instance for use in other modules
export { io };

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Socket.IO server initialized`);
});

export default app;


