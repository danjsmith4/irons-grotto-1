'use client';

import { ThemeSelector } from '@/app/components/theme-selector';

export function Header() {
  return (
    <header
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--theme-text-secondary)',
        fontSize: '14px'
      }}>
        <span>Theme:</span>
        <ThemeSelector />
      </div>
    </header>
  );
}