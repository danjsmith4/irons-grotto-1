import { PropsWithChildren, ReactNode } from 'react';
import { Card, Flex } from '@radix-ui/themes';

interface DataCardRowProps {
  center?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}

function DataCardRow({ center = null, left, right }: DataCardRowProps) {
  const width = center ? '33%' : '50%';

  return (
    <Flex align="center" justify="between">
      <Flex flexBasis={width}>{left}</Flex>
      {center && (
        <Flex flexBasis={width} justify="center">
          {center}
        </Flex>
      )}
      <Flex flexBasis={width} justify="end">
        {right}
      </Flex>
    </Flex>
  );
}

function DataCardRoot({ children }: PropsWithChildren) {
  return (
    <Card
      style={{
        background: 'var(--theme-card-background)',
        border: '1px solid var(--theme-card-border)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-card-hover-border)';
        e.currentTarget.style.boxShadow = '0 4px 20px var(--theme-card-hover-shadow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-card-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Flex direction="column" gap="3">
        {children}
      </Flex>
    </Card>
  );
}

export const DataCard = {
  Root: DataCardRoot,
  Row: DataCardRow,
};
