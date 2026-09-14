import Link from 'next/link';

export const metadata = { title: 'Users & Roles' };

export default function UsersPage() {
  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Users & Roles</h1>
          <p>Identity, member and role management for the platform.</p>
        </div>
      </div>

      <section className="card card-pad">
        <h2 className="card-title" style={{ marginTop: 0 }}>
          Not available yet
        </h2>
        <p className="muted">
          The control plane API does not yet expose user, role or membership management endpoints.
          This page is a placeholder for when they land.
        </p>
        <div className="stack" style={{ marginTop: '0.5rem' }}>
          <div>
            <strong className="small">Available today</strong>
            <ul className="muted small" style={{ paddingLeft: '1rem', marginBottom: 0 }}>
              <li>
                Read-only <strong>members</strong> list on every tenant detail page (roles included).
              </li>
              <li>
                Bootstrap identity <code className="mono">seed-dev-admin-0001</code> with the{' '}
                <code className="mono">CYBELINX_PLATFORM_ADMIN</code> role seeded by migration V6.
              </li>
            </ul>
          </div>
          <div>
            <strong className="small">Reference documentation</strong>
            <ul className="muted small" style={{ paddingLeft: '1rem', marginBottom: 0 }}>
              <li>
                Roles and permission codes live in the backend under{' '}
                <code className="mono">com.cybelinx.platform.api.domain</code> (roles) and{' '}
                <code className="mono">TenantConstants</code>/<code className="mono">ProductConstants</code>.
              </li>
              <li>
                Identity and mapping logic in{' '}
                <code className="mono">com.cybelinx.platform.api.security</code>.
              </li>
            </ul>
          </div>
        </div>
        <div className="flex" style={{ marginTop: '1rem' }}>
          <Link href="/tenants" className="btn btn-primary btn-sm">
            Browse tenants
          </Link>
          <Link href="/settings" className="btn btn-ghost btn-sm">
            API settings
          </Link>
        </div>
      </section>
    </div>
  );
}