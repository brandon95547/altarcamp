import { AGREEMENT_STATUSES } from '@altar/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Select } from '../../components/ui/Field.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { formatDate, titleCase } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';

interface AgreementRow {
  id: string;
  type: string;
  status: string;
  title: string;
  artist_name: string;
  song_title: string | null;
  created_at: string;
  completed_at: string | null;
  signer_count: number;
  signed_count: number;
}

/** Spec §26 — the contract pipeline. */
export function AdminAgreementsPage() {
  const [status, setStatus] = useState('');
  const { data, loading } = useQuery<{ agreements: AgreementRow[] }>(
    status ? `/admin/agreements?status=${status}` : '/admin/agreements',
    [status],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Contracts"
        title="Agreement pipeline"
        description="Draft, sent, viewed, signed — and what is waiting on whom."
        actions={
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-56"
          >
            <option value="">All statuses</option>
            {AGREEMENT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? <Spinner /> : null}

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-600">
              <tr>
                <th className="px-5 py-3">Agreement</th>
                <th className="px-5 py-3">Artist</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Signatures</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.agreements.map((agreement) => (
                <tr key={agreement.id} className="border-t border-ink-200">
                  <td className="px-5 py-3">
                    <Link
                      to={`/agreements/${agreement.id}`}
                      className="font-medium text-ink-950 hover:text-ember-700"
                    >
                      {agreement.title}
                    </Link>
                    <span className="block text-xs text-ink-600">{titleCase(agreement.type)}</span>
                  </td>
                  <td className="px-5 py-3">{agreement.artist_name}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={agreement.status} />
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {agreement.signed_count} / {agreement.signer_count}
                  </td>
                  <td className="px-5 py-3">{formatDate(agreement.created_at)}</td>
                </tr>
              ))}
              {data && data.agreements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-600">
                    Nothing here yet.
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
