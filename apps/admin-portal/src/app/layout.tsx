import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppNav } from './nav';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Admin Portal — Cybelinx',
    template: '%s — Admin Portal',
  },
  description: 'Administration portal for the Cybelinx Central SaaS Platform (control plane)',
  icons: {
    icon: '/cybelinx-logo-kits.png',
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <AppNav />
          <div className="main">
            <main className="content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}