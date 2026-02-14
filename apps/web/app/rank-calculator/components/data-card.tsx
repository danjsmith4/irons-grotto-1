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
        background: 'rgba(45, 27, 78, 0.6)',
        border: '1px solid rgba(233, 30, 99, 0.2)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(233, 30, 99, 0.4)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(233, 30, 99, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(233, 30, 99, 0.2)';
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
