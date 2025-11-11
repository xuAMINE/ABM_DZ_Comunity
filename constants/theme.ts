// constants/theme.ts
export type Theme = {
  bg: string;
  text: string;
  border: string;
  border2: string;
  inputBg: string;
  placeholder: string;
  primary: string;
  chipBg: string;
  card: string;
  success: string;
};

export const lightTheme: Theme = {
  bg: '#f6f7f9',
  text: '#0f172a',
  border: '#e5e7eb',
  border2: '#d1d5db',
  inputBg: '#ffffff',
  placeholder: '#94a3b8',
  primary: '#2563eb',
  chipBg: '#f3f4f6',
  card: '#ffffff',
  success: '#16a34a',
};

export const darkTheme: Theme = {
  bg: '#0b0f13',
  text: '#e5e7eb',
  border: '#1f2937',
  border2: '#374151',
  inputBg: '#111827',
  placeholder: '#6b7280',
  primary: '#3b82f6',
  chipBg: '#0f172a',
  card: '#111827',
  success: '#22c55e',
};

export type ThemeMode = 'system' | 'light' | 'dark';
