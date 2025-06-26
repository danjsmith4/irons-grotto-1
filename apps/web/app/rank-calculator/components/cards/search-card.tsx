'use client';

import { Text, Flex } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import { DataCard } from '../data-card';
import { Input } from '../input';

interface SearchCardSchema {
  query: string;
}

export function SearchCard({
  query,
  onChange,
}: {
  query: string;
  onChange: (value: string) => void;
}) {
  return (
    <DataCard.Root>
      <DataCard.Row
        left={<Text weight="medium">Search</Text>}
        right={<Text>Explore your clog</Text>}
      />
      <Flex mt="2">
        <Input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your clog..."
        size="1"
        hasError={false}
        />
      </Flex>
    </DataCard.Root>
  );
}
