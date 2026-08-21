'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Avatar } from '@radix-ui/themes';
import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';

interface ItemImageWithFallbackProps {
  /**
   * Unused — the wiki image is resolved from the name. Kept because callers
   * have one to hand, and optional because callers rendering something that is
   * not a collection-log item (an accomplishment icon) do not.
   */
  itemId?: number;
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
          background: 'rgb(var(--ig-surface-2))',
          color: 'rgb(var(--ig-text-muted))',
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
