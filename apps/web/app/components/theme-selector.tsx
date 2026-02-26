'use client';

import React from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '@/app/providers/theme-provider';
import { getThemes } from '@/app/config/themes';

export function ThemeSelector() {
  const { currentTheme, setTheme } = useTheme();
  const themes = getThemes();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--theme-surface-3)',
            border: `1px solid var(--theme-primary)`,
            borderRadius: '6px',
            color: 'var(--theme-text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '150px',
            transition: 'all 0.2s ease',
          }}
          className="theme-selector-trigger"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: currentTheme.colors.primary,
              }}
            />
            {currentTheme.name}
          </span>
          <ChevronDownIcon />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          style={{
            minWidth: '200px',
            background: 'var(--theme-surface-2)',
            border: `1px solid var(--theme-primary-alpha-30)`,
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 8px 25px var(--theme-primary-alpha-40)',
            zIndex: 1000,
          }}
          sideOffset={5}
        >
          {themes.map((theme) => (
            <DropdownMenu.Item
              key={theme.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--theme-text-primary)',
                backgroundColor: currentTheme.id === theme.id 
                  ? 'var(--theme-primary-alpha-20)' 
                  : 'transparent',
                border: currentTheme.id === theme.id 
                  ? '1px solid var(--theme-primary-alpha-50)' 
                  : '1px solid transparent',
                transition: 'all 0.2s ease',
                fontSize: '14px',
              }}
              onSelect={() => setTheme(theme.id)}
              className="theme-option"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: theme.colors.primary,
                    border: '2px solid var(--theme-text-primary)',
                  }}
                />
                <span>{theme.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: theme.colors.secondary,
                  }}
                />
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: theme.colors.tertiary,
                  }}
                />
              </div>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>

      <style jsx>{`
        .theme-selector-trigger:hover {
          background: var(--theme-primary-alpha-10) !important;
          border-color: var(--theme-primary) !important;
        }
        
        .theme-option:hover {
          background: var(--theme-primary-alpha-10) !important;
        }
      `}</style>
    </DropdownMenu.Root>
  );
}