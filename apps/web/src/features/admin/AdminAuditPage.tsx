import { Card, CardBody } from '../../components/ui/Card.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { formatDateTime, titleCase } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  ip: string | null;
  actor_name: string | null;
  actor_role: string | null;
}

/** Spec §37 — the audit log, including every signature. */
export function AdminAuditPage() {
  const { data, loading } = useQuery<{ entries: AuditEntry[] }>('/admin/audit');

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="What has happened"
        description="Signatures, split changes, rights reviews and staff actions. Append-only."
      />

      {loading ? <Spinner /> : null}

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-600">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Who</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data?.entries.map((entry) => (
                <tr key={entry.id} className="border-t border-ink-200 align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-ink-700">
                    {formatDateTime(entry.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    {entry.actor_name ?? 'Anonymous'}
                    {entry.actor_role ? (
                      <span className="block text-xs text-ink-600">
                        {titleCase(entry.actor_role)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink-950">{entry.action}</td>
                  <td className="px-5 py-3 text-ink-700">{entry.entity_type}</td>
                  <td className="max-w-md px-5 py-3">
                    <code className="block truncate text-xs text-ink-600">
                      {JSON.stringify(entry.metadata)}
                    </code>
                  </td>
                </tr>
              ))}
              {data && data.entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-600">
                    Nothing logged yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
