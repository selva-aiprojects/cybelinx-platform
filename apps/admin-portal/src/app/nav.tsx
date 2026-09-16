'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@cybelinx/shared';

const NAV_SECTIONS = [
  {
    label: 'Platform',
    links: [
      { href: '/tenants', label: 'Tenants', icon: '▤' },
      { href: '/products', label: 'Products', icon: '▣' },
      { href: '/onboarding', label: 'Product Onboarding', icon: '🚀' },
      { href: '/storeai/merchant', label: 'Store Merchant Portal', icon: '⚡' },
    ],
  },
  {
    label: 'Operations',
    links: [
      { href: '/subscriptions', label: 'Subscriptions', icon: '⇄' },
      { href: '/users', label: 'Users & Roles', icon: '◉' },
      { href: '/audit', label: 'Audit Log', icon: '▤' },
      { href: '/events', label: 'Platform Events', icon: '⚡' },
    ],
  },
  {
    label: 'System',
    links: [{ href: '/settings', label: 'Settings', icon: '⚙' }],
  },
];

export function AppNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sidebar">
      <a 
        href="https://cybelinx.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="brand" 
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
      >
        <Image
          src="/cybelinx-logo.png"
          alt="Cybelinx"
          width={573}
          height={160}
          style={{ height: 32, width: 'auto' }}
          priority
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Admin Portal</div>
          <div className="brand-readout" style={{ color: '#64748b', fontSize: '0.75rem' }}>Control Plane</div>
        </div>
      </a>

      <nav className="nav">
        <Link href="/" className={`nav-link${isActive('/') && pathname === '/' ? ' active' : ''}`}>
          <span className="nav-icon">◧</span>
          Dashboard
        </Link>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-section">{section.label}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${isActive(link.href) ? ' active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {APP_NAME}
        <br />
        v0.1.0 · dev build
      </div>
    </aside>
  );
}