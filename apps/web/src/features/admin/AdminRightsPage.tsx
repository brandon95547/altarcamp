import { RIGHTS_QUESTIONS } from '@altar/shared';
import { Link } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { useQuery } from '../../lib/useApi.js';

interface ArtistRow {
  id: string;
  artist_name: string;
  email: string;
  has_conflict: boolean;
  application_status: string | null;
}

/** Spec §6 and §34 — artists whose existing commitments must be reviewed before signing. */
export function AdminRightsPage() {
  const { data, loading } = useQuery<{ artists: ArtistRow[] }>('/admin/artists');
  const flagged = data?.artists.filter((artist) => artist.has_conflict) ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Rights"
        title="Existing commitments to review"
        description="An artist who declared an existing label, distribution, publishing or management agreement cannot have an Altar.Camp agreement generated until someone here has read it."
      />

      {loading ? <Spinner /> : null}

      {flagged.length === 0 ? (
        <Callout tone="success" title="Nothing waiting">
          No artist currently has an unreviewed conflict.
        </Callout>
      ) : (
        <Card>
          <CardHeader title={`${flagged.length} to review`} />
          <CardBody>
            <ul className="grid gap-2">
              {flagged.map((artist) => (
                <li
                  key={artist.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-clay-200 bg-clay-50 px-4 py-3"
                >
                  <Link
                    to={`/admin/artists/${artist.id}`}
                    className="font-medium text-ink-950 hover:text-ember-700"
                  >
                    {artist.artist_name}
                  </Link>
                  <span className="text-sm text-ink-700">{artist.email}</span>
                  <span className="ml-auto text-sm text-clay-800">Awaiting review</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="What we ask every artist"
          description="Spec §6 — the disclosure questionnaire."
        />
        <CardBody>
          <ul className="grid gap-3">
            {RIGHTS_QUESTIONS.map((question) => (
              <li key={question.key}>
                <p className="font-medium text-ink-950">{question.question}</p>
                <p className="text-sm text-ink-700">{question.conflictNote}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
