import { useMantineColorScheme } from '@mantine/core';
import { useEffect } from 'react';

export function useTheme() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  // Keep data-theme in sync for CSS that hasn't been migrated yet.
  // Removed in Task 7 once all [data-theme="dark"] rules are gone.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0D1B2A' : '#F3F0E9');
  }, [dark]);

  return [dark, toggleColorScheme];
}
