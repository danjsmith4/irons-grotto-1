'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Avatar } from '@radix-ui/themes';
import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';

interface ItemImageWithFallbackProps {
  itemId: number;
  itemName: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function ItemImageWithFallback({
  itemName,
  size = 32,
  style,
  className,
}: ItemImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Avatar
        size={size > 40 ? '4' : size > 24 ? '3' : '2'}
        fallback={itemName.charAt(0).toUpperCase()}
        style={{
          background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
          color: 'white',
          fontWeight: 'bold',
          ...style,
        }}
        className={className}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Image
        src={formatWikiImageUrl(itemName)}
        alt={itemName}
        width={size}
        height={size}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
        }}
        className={className}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
