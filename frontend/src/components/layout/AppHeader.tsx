import { Layout, Menu, Button, Space, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import LanguageSwitcher from '../LanguageSwitcher';
import FontSizeSwitcher from '../FontSizeSwitcher';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  LogoutOutlined,
  DownOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  BellOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  ExperimentOutlined,
  HeartOutlined,
  TeamOutlined,
  ApiOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const { Header } = Layout;

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  // 根据用户角色显示不同的菜单
  const getMenuItems = () => {
    const commonItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: t('navigation.dashboard'),
      },
      {
        key: '/blood-sugar',
        icon: <HeartOutlined />,
        label: t('navigation.bloodSugar'),
      },
      {
        key: '/meal-plans',
        icon: <FileTextOutlined />,
        label: t('navigation.mealPlans'),
      },
      {
        key: '/products',
        icon: <ShoppingOutlined />,
        label: t('navigation.products'),
      },
      {
        key: '/shopping-lists',
        icon: <UnorderedListOutlined />,
        label: t('navigation.shoppingLists'),
      },
      {
        key: '/orders',
        icon: <ShoppingCartOutlined />,
        label: t('navigation.orders'),
      },
      {
        key: '/ai-assistant',
        icon: <RobotOutlined />,
        label: t('navigation.aiAssistant'),
      },
    ];

    const additionalItems = [
      {
        key: '/medications',
        icon: <MedicineBoxOutlined />,
        label: t('navigation.medications'),
      },
      {
        key: '/reminders',
        icon: <BellOutlined />,
        label: t('navigation.reminders'),
      },
      {
        key: '/recommendations',
        icon: <ExperimentOutlined />,
        label: t('navigation.recommendations'),
      },
      {
        key: '/community',
        icon: <TeamOutlined />,
        label: t('navigation.community'),
      },
    ];

    return [...commonItems, ...additionalItems];
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: t('navigation.profile'),
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    // 仅管理员能看到服务测试
    ...(user?.role === 'admin' ? [{
      key: 'service-test',
      label: '系统管理',
      icon: <ApiOutlined />,
      onClick: () => navigate('/service-test'),
    }] : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: t('common.logout'),
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      background: '#fff',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, marginRight: 24, color: '#1677ff', flexShrink: 0 }}>
          {t('common.platformTitle')} {/* Translated platform title */}
        </h2>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent' }}
        />
      </div>
      <Space>
        <FontSizeSwitcher />
        <LanguageSwitcher />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text" style={{ height: 'auto' }}>
            <Space>
              <UserOutlined />
              <span>{user?.email}</span>
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}

