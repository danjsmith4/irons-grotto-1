import React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { ButtonProps } from '@radix-ui/themes/dist/cjs/components/button';

interface IronsButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: React.ReactNode;
}

export function IronsButton({ 
  variant = 'secondary', 
  children, 
  className = '',
  style = {},
  ...props 
}: IronsButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: '25px',
      fontWeight: '500',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      cursor: 'pointer',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      // Override any global button animations
      transition: 'none !important',
      transform: 'none !important',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 15px rgba(233, 30, 99, 0.4), 0 0 20px rgba(233, 30, 99, 0.2)',
          ...style,
        };
      
      case 'secondary':
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          border: '2px solid #ce93d8',
          backdropFilter: 'blur(10px)',
          ...style,
        };
      
      case 'ghost':
        return {
          ...baseStyles,
          background: 'transparent',
          color: '#ce93d8',
          border: '1px solid rgba(206, 147, 216, 0.3)',
          ...style,
        };
      
      case 'danger':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
          ...style,
        };
      
      default:
        return { ...baseStyles, ...style };
    }
  };

  return (
    <RadixButton
      {...props}
      className={`irons-button irons-button-${variant} ${className}`}
      style={getButtonStyles()}
    >
      {children}
    </RadixButton>
  );
}