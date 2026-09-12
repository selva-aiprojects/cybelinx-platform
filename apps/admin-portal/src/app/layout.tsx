import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { APP_NAME } from '@cybelinx/shared';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_NAME} — Admin Portal`,
  description: 'Administration portal for the Cybelinx Central SaaS Platform (control plane)',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}