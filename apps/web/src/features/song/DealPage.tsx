import {
  formatMoney,
  type DealSummary,
  type FairDealDisclosure,
  type FiveAnswers,
} from '@altar/shared';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SplitBar } from '../../components/splits/SplitBar.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { DefinitionRow, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { useMutation, useQuery } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';

interface DealResponse {
  summary: DealSummary;
  disclosure: FairDealDisclosure;
  fiveAnswers: FiveAnswers;
  example: {
    rows: { label: string; amountMinor: number; kind: string; note?: string }[];
    unrecoupedBalanceMinor: number;
  };
}

/** Spec §12, §17 and §35 on one page: summary, the four columns, and the five answers. */
export function DealPage() {
  const { songId } = useParams();
  const { deal, reload } = useSong();
  const navigate = useNavigate();
  const { data, loading } = useQuery<DealResponse>(songId ? `/songs/${songId}/deal` : null, [
    deal.song.status,
  ]);

  const generate = useMutation(async () =>
    api.post<{ agreementId: string }>('/agreements', {
      type: 'single_song_collaboration',
      songId,
    }),
  );

  const blockers = deal.issues.filter((issue) => issue.severity === 'blocker');

  if (loading) return <Spinner label="Working out your deal" />;
  if (!data) return null;

  const columns: { title: string; tone: string; items: string[] }[] = [
    { title: 'You keep', tone: 'border-moss-500', items: data.disclosure.youKeep },
    { title: 'You share', tone: 'border-ember-500', items: data.disclosure.youShare },
    { title: 'Altar.Camp receives', tone: 'border-dusk-500', items: data.disclosure.altarReceives },
    { title: 'Altar.Camp provides', tone: 'border-ink-500', items: data.disclosure.altarProvides },
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader
          title={data.summary.heading}
          description="Everything below is generated from what you actually agreed — not typed in by hand."
        />
        <CardBody>
          <dl>
            {data.summary.rows.map((row) => (
              <DefinitionRow key={row.label} label={row.label} value={row.value} note={row.note} />
            ))}
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Master ownership" description="Who owns the recording." />
          <CardBody>
            <SplitBar lines={deal.masterSplits} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Songwriting ownership" description="Who owns the song inside it." />
          <CardBody>
            <SplitBar lines={deal.compositionSplits} />
          </CardBody>
        </Card>
      </div>

      {/* Spec §17 — the fair deal disclosure. */}
      <section>
        <h2 className="mb-1 text-2xl">Understand your deal</h2>
        <p className="mb-4 text-ink-700">
          Four columns, in plain words, before any legal language.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <Card key={column.title} className={cn('border-t-4', column.tone)}>
              <CardBody>
                <h3 className="text-lg">{column.title}</h3>
                <ul className="mt-3 grid gap-2 text-sm text-ink-800">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="If this song earned $10,000"
            description="The waterfall your terms produce."
          />
          <CardBody>
            <dl className="grid gap-1">
              {data.example.rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  className={cn(
                    'flex items-baseline justify-between gap-4 rounded px-3 py-2',
                    row.kind === 'subtotal' && 'bg-ink-100 font-semibold',
                    row.kind === 'share' && 'bg-moss-50',
                  )}
                >
                  <dt className="text-sm text-ink-800">{row.label}</dt>
                  <dd
                    className={cn(
                      'tabular-nums',
                      row.kind === 'deduction' ? 'text-clay-700' : 'text-ink-950',
                    )}
                  >
                    {formatMoney(row.amountMinor)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* Spec §35 */}
        <Card>
          <CardHeader
            title="Your five answers"
            description="If any of these is fuzzy, the record is not ready."
          />
          <CardBody>
            <dl>
              <DefinitionRow label="Who owns the master?" value={data.fiveAnswers.masterOwner} />
              <DefinitionRow label="Who owns the song?" value={data.fiveAnswers.songOwner} />
              <DefinitionRow label="Who gets paid?" value={data.fiveAnswers.whoGetsPaid} />
              <DefinitionRow label="Who collects the money?" value={data.fiveAnswers.whoCollects} />
              <DefinitionRow
                label="What contracts prove it?"
                value={
                  data.fiveAnswers.provingDocuments.length > 0 ? (
                    <ul className="grid gap-1">
                      {data.fiveAnswers.provingDocuments.map((document) => (
                        <li key={document} className="flex items-center gap-2">
                          <FileText className="size-4 text-ink-500" aria-hidden />
                          {document}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Nothing signed yet — the agreement lands in your vault the moment it is.'
                  )
                }
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      {blockers.length > 0 ? (
        <Callout tone="blocker" title="Not ready to generate an agreement">
          <ul className="grid gap-1.5">
            {blockers.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </Callout>
      ) : (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl">Everything adds up</h2>
              <p className="mt-1 text-ink-700">
                Generate the agreement to read it in full — in plain English, as a deal sheet, and
                as the legal text — and then sign it if you are happy.
              </p>
              {generate.error ? (
                <Callout tone="blocker" className="mt-3">
                  {generate.error.message}
                </Callout>
              ) : null}
            </div>
            <Button
              size="lg"
              disabled={generate.pending}
              onClick={async () => {
                const result = await generate.run(undefined);
                if (result) {
                  reload();
                  navigate(`/agreements/${result.agreementId}`);
                }
              }}
            >
              {generate.pending ? 'Generating…' : 'Generate the agreement'}
              <ArrowRight className="size-5" aria-hidden />
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
