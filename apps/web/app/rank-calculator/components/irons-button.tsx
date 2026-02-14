import React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { ButtonProps } from '@radix-ui/themes';
interface IronsButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?:
    | ButtonProps['variant']
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger';
}

export function IronsButton({
  variant = 'soft',
  style,
  ...props
}: IronsButtonProps) {
  // Map custom variants to Radix variants and get additional styling
  const getVariantMapping = () => {
    switch (variant) {
      case 'primary':
        return {
          radixVariant: 'solid' as const,
          customStyle: {
            background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
            border: 'none',
          },
        };
      case 'secondary':
        return {
          radixVariant: 'soft' as const,
          customStyle: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid #ce93d8',
            backdropFilter: 'blur(10px)',
          },
        };
      case 'ghost':
        return {
          radixVariant: 'ghost' as const,
          customStyle: {
            background: 'transparent',
            color: '#ce93d8',
            border: '1px solid rgba(206, 147, 216, 0.3)',
          },
        };
      case 'danger':
        return {
          radixVariant: 'solid' as const,
          customStyle: {
            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            color: '#ffffff',
          },
        };
      default:
        return {
          radixVariant: variant,
          customStyle: {},
        };
    }
  };

  const { radixVariant, customStyle } = getVariantMapping();

  const combinedStyle = {
    // Remove animations
    transition: 'none !important',
    transform: 'none !important',
    // Apply custom styling
    ...customStyle,
    // Allow style prop to override
    ...style,
  };

  return (
    <RadixButton
      {...props}
      variant={radixVariant}
      style={combinedStyle}
      className={`irons-button ${props.className ?? ''}`}
    >
      {props.children}
    </RadixButton>
  );
}
