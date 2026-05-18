import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontFamilyMonospace: "'IBM Plex Mono', 'Menlo', monospace",

  breakpoints: {
    xs: '380px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
  },

  // Index 5 is the primary swatch — full token values in :root block in app.css
  colors: {
    navy: [
      '#EDF2F9', '#D6E2F0', '#B0C8E4', '#8AAED8', '#4A7AB5',
      '#1E3A5F', '#193353', '#142C47', '#0F253B', '#0A1E2F',
    ],
    amber: [
      '#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24',
      '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F',
    ],
  },

  primaryColor: 'navy',
  primaryShade: { light: 5, dark: 5 },

  other: {
    bg:        '#F3F0E9',
    bgDark:    '#0D1B2A',
    surface:   '#FFFFFF',
    border:    '#E2DDD3',
    green:     '#166534',
    greenLight:'#DCFCE7',
    red:       '#991B1B',
    redLight:  '#FEE2E2',
    serif:     "'Fraunces', Georgia, serif",
  },
});
