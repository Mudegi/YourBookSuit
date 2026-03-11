'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';

export default function OrgPagesLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
