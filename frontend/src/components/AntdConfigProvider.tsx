import React from 'react';
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';

interface AntdConfigProviderProps {
  children: React.ReactNode;
}

const AntdConfigProvider: React.FC<AntdConfigProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  
  const getAntdLocale = () => {
    return i18n.language === 'zh' ? zhCN : enUS;
  };

  const fontScale = useUIStore((s) => s.fontScale);

  // Compute theme based on font scale
  const themeConfig: ThemeConfig = useMemo(() => {
    const base = 14 * fontScale; // base font size
    const clamp = (n: number) => Math.round(n);
    return {
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 8,
        colorBgLayout: '#f7f9fc',
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif,'Apple Color Emoji','Segoe UI Emoji'",
        fontSize: clamp(base),
        fontSizeSM: clamp(base - 2),
        fontSizeLG: clamp(base + 2),
        fontSizeHeading1: clamp(base + 20),
        fontSizeHeading2: clamp(base + 14),
        fontSizeHeading3: clamp(base + 8),
        fontSizeHeading4: clamp(base + 4),
        fontSizeHeading5: clamp(base + 2),
      },
    };
  }, [fontScale]);

  // Also update root CSS variable for custom content
  useEffect(() => {
    const px = `${14 * fontScale}px`;
    document.documentElement.style.setProperty('--base-font-size', px);
  }, [fontScale]);

  return (
    <ConfigProvider locale={getAntdLocale()} theme={themeConfig}>
      {children}
    </ConfigProvider>
  );
};

export default AntdConfigProvider;
