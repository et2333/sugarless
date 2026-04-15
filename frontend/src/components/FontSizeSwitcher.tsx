import React from 'react';
import { Segmented } from 'antd';
import { useUIStore } from '../stores/uiStore';

const options = [
  { label: <span style={{ fontSize: 12, lineHeight: 1 }}>A</span>, value: 0.8 },
  { label: <span style={{ fontSize: 14, lineHeight: 1 }}>A</span>, value: 1 },
  
  { label: <span style={{ fontSize: 20, lineHeight: 1 }}>A</span>, value: 1.3 },
] as const;

export default function FontSizeSwitcher() {
  const fontScale = useUIStore((s) => s.fontScale);
  const setFontScale = useUIStore((s) => s.setFontScale);

  return (
    <Segmented
      size="small"
      options={options as any}
      value={fontScale}
      onChange={(val) => setFontScale(val as any)}
    />
  );
}
