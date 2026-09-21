import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.js';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { EmptyState, PageHeader, Spinner } from '../../components/ui/Misc.js';
import { formatDate } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';

interface AgreementRow {
  id: string;
  type: string;
  status: string;
  title: string;
  song_title: string | null;
  created_at: string;
  completed_at: string | null;
  signer_count: number;
  signed_count: number;
}

/** "My deal" in the artist navigation — every agreement, and where each one stands. */
export function MyDealPage() {
  const { data, loading, error } = useQuery<{ agreements: AgreementRow[] }>('/agreements');

  return (
    <div>
      <PageHeader
        eyebrow="My deal"
        title="Your agreements"
        description="Everything Altar.Camp has proposed or signed with you, in one place, forever."
      />

      {loading ? <Spinner /> : null}
      {error ? <Callout tone="blocker">{error.message}</Callout> : null}

      {data && data.agreements.length === 0 ? (
        <EmptyState
          title="Nothing signed yet"
          description="Agreements appear here as soon as one is generated — before anyone signs, not after."
          action={<ButtonLink to="/songs">Go to your music</ButtonLink>}
        />
      ) : null}

      <div className="grid gap-3">
        {data?.agreements.map((agreement) => (
          <Card key={agreement.id}>
            <CardHeader
              title={
                <Link to={`/agreements/${agreement.id}`} className="hover:text-ember-700">
                  {agreement.title}
                </Link>
              }
              description={`Created ${formatDate(agreement.created_at)}${
                agreement.completed_at
                  ? ` · Fully signed ${formatDate(agreement.completed_at)}`
                  : ''
              }`}
              action={<StatusBadge status={agreement.status} />}
            />
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-700">
                {agreement.signed_count} of {agreement.signer_count} signatures
              </p>
              <ButtonLink to={`/agreements/${agreement.id}`} variant="secondary" size="sm">
                {agreement.status === 'signed' ? 'Read it' : 'Review and sign'}
              </ButtonLink>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
