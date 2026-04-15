import { Layout, Menu, Button, Space, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import FontSizeSwitcher from '../FontSizeSwitcher';
import {
  DashboardOutlined,
  ShopOutlined,
  LogoutOutlined,
  DownOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Header } = Layout;

export default function MerchantHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const menuItems = [
    {
      key: '/merchant/dashboard',
      icon: <DashboardOutlined />,
      label: t('merchant.console'),
    },
    {
      key: '/merchant/orders',
      icon: <ShopOutlined />,
      label: t('merchant.orderManagement'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('merchant.personalInfo'),
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('merchant.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <div
          style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            marginRight: '48px',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/merchant/dashboard')}
        >
          <ShopOutlined /> {t('merchant.merchantBackend')}
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
      <Space>
        <FontSizeSwitcher />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text" style={{ color: 'white' }}>
            {user?.email} <DownOutlined />
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}

