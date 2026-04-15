import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import AppHeader from './components/layout/AppHeader';
import MerchantHeader from './components/layout/MerchantHeader';
import ReminderScheduler from './components/ReminderScheduler';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MealPlans from './pages/MealPlans';
import Products from './pages/Products';
import Medications from './pages/Medications';
import Reminders from './pages/Reminders';
import NutritionAnalysis from './pages/NutritionAnalysis';
import ShoppingLists from './pages/ShoppingLists';
import Orders from './pages/Orders';
import MerchantOrders from './pages/MerchantOrders';
import MerchantDashboard from './pages/MerchantDashboard';
import Recommendations from './pages/Recommendations';
import BloodSugarTracker from './pages/BloodSugarTracker';
import Community from './pages/Community';
import ServiceTest from './pages/ServiceTest';
import AIAssistant from './pages/AIAssistant';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';

const { Content } = Layout;

// 角色保护路由组件
interface RoleProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // 如果用户角色不匹配，跳转到对应的默认页面
    return <Navigate to={user?.role === 'merchant' ? '/merchant/dashboard' : '/dashboard'} />;
  }

  return children;
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isMerchant = user?.role === 'merchant';

  // Register Service Worker for background notifications
  useEffect(() => {
    if ('serviceWorker' in navigator && isAuthenticated) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Request periodic background sync if available
          if ('periodicSync' in registration) {
            (registration as any).periodicSync
              .register('check-reminders', {
                minInterval: 60 * 1000, // Minimum 1 minute
              })
              .then(() => {
                console.log('Periodic sync registered');
              })
              .catch((error) => {
                console.warn('Periodic sync not available:', error);
              });
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [isAuthenticated]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isAuthenticated && (isMerchant ? <MerchantHeader /> : <AppHeader />)}
      {isAuthenticated && <ReminderScheduler />}
      <Content className="app-content" style={{ padding: isAuthenticated ? '24px' : '0' }}>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />}
          />
          <Route path="/verify-email" element={<VerifyEmail />} />
          {/* 用户端路由 - 只有 user 角色可访问 */}
          <Route
            path="/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Dashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'merchant', 'admin']}>
                <Profile />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/meal-plans"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <MealPlans />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Products />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/medications"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Medications />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Reminders />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/nutrition"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <NutritionAnalysis />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/shopping-lists"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <ShoppingLists />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'merchant', 'admin']}>
                <Orders />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Recommendations />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/blood-sugar"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <BloodSugarTracker />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <Community />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/service-test"
            element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <ServiceTest />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <RoleProtectedRoute allowedRoles={['user', 'admin']}>
                <AIAssistant />
              </RoleProtectedRoute>
            }
          />

          {/* 商户端路由 - 只有 merchant 角色可访问 */}
          <Route
            path="/merchant/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['merchant', 'admin']}>
                <MerchantDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/merchant/orders"
            element={
              <RoleProtectedRoute allowedRoles={['merchant', 'admin']}>
                <MerchantOrders />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to={isMerchant ? '/merchant/dashboard' : '/dashboard'} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;

