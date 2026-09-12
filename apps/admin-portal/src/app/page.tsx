import { APP_NAME } from '@cybelinx/shared';

const services = [
  ['Control Plane API', '/api/v1/health', 'NestJS modular monolith — tenants, identity, RBAC, entitlements, resources, provisioning'],
  ['Event Worker', '/api/v1/health', 'Separate deployable process — outbox polling and event consumers'],
  ['Admin Portal', '/', 'Next.js App Router — administration console for platform metadata'],
] as const;

export default function HomePage() {
  return (
    <main>
      <header>
        <div className="badge">Scaffold</div>
        <h1>{APP_NAME}</h1>
        <p className="lede">
          Central SaaS plumbing for Cybelinx products — centralized control plane, not business
          functionality. Business data stays inside the products.
        </p>
      </header>

      <section>
        <h2>Services</h2>
        <ul>
          {services.map(([name, path, detail]) => (
            <li key={name}>
              <strong>{name}</strong> <code>{path}</code> — {detail}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Next steps</h2>
        <p>Implementation roadmap, API references and ADRs are tracked in the docs/ directory.</p>
      </section>
    </main>
  );
}