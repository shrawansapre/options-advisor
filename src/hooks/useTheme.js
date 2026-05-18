import { useMantineColorScheme } from '@mantine/core';

export function useTheme() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return [colorScheme === 'dark', toggleColorScheme];
}
