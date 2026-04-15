import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh' 
    }}>
      <Result
        status="404"
        title="404"
        subTitle={t('common.pageNotFound')}
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            {t('common.backToHome')}
          </Button>
        }
      />
    </div>
  );
}

