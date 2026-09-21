import {
  REVENUE_CATEGORY_DEFINITIONS,
  revenueCategoriesFor,
  type RevenueCategory,
  type SplitLine,
} from '@altar/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplitBuilder } from '../../components/splits/SplitBuilder.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';
import { displayName } from './types.js';

/** Spec §10 — "When this song makes money". Every category has its own split. */
export function RevenueStep() {
  const { deal, reload } = useSong();
  const navigate = useNavigate();

  const defaults = revenueCategoriesFor('single_song');
  const [splits, setSplits] = useState<{ category: RevenueCategory; lines: SplitLine[] }[]>(() => {
    const existing = new Map(deal.revenueSplits.map((split) => [split.category, split.lines]));
    return defaults.map((definition) => ({
      category: definition.key,
      lines: existing.get(definition.key) ?? [],
    }));
  });

  const save = useMutation(async () =>
    api.put(`/songs/${deal.song.id}/revenue-splits`, {
      splits: splits.filter((split) => split.lines.length > 0),
    }),
  );

  const participants = deal.contributors.map((contributor) => ({
    id: contributor.id,
    name: displayName(contributor),
    role: contributor.role,
  }));

  const addCategory = (category: RevenueCategory) => {
    if (splits.some((split) => split.category === category)) return;
    setSplits([...splits, { category, lines: [] }]);
  };

  const unused = REVENUE_CATEGORY_DEFINITIONS.filter(
    (definition) => !splits.some((split) => split.category === definition.key),
  );

  return (
    <div className="grid gap-6">
      <Callout tone="info" title="One universal percentage would be a lie">
        Streaming money, publishing money and sync money arrive from different places, at different
        times, to different people. Each one gets its own split here, and each one has to total
        100%.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        {splits.map((split, index) => {
          const definition = REVENUE_CATEGORY_DEFINITIONS.find(
            (entry) => entry.key === split.category,
          );
          if (!definition) return null;
          return (
            <Card key={split.category}>
              <CardHeader
                title={definition.label}
                description={definition.description}
                action={
                  definition.side ? (
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                      {definition.side === 'master' ? 'Recording side' : 'Song side'}
                    </span>
                  ) : null
                }
              />
              <CardBody>
                <SplitBuilder
                  label={definition.label}
                  participants={participants}
                  lines={split.lines}
                  onChange={(lines) =>
                    setSplits(
                      splits.map((entry, position) =>
                        position === index ? { ...entry, lines } : entry,
                      ),
                    )
                  }
                />
              </CardBody>
            </Card>
          );
        })}
      </div>

      {unused.length > 0 ? (
        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-medium text-ink-900">Add another kind of income</p>
            <div className="flex flex-wrap gap-2">
              {unused.map((definition) => (
                <Button
                  key={definition.key}
                  size="sm"
                  variant="secondary"
                  onClick={() => addCategory(definition.key)}
                >
                  <Plus className="size-4" aria-hidden />
                  {definition.label}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {save.error ? <Callout tone="blocker">{save.error.message}</Callout> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={save.pending}
          onClick={async () => {
            const result = await save.run(undefined);
            if (result !== null) reload();
          }}
        >
          {save.pending ? 'Saving…' : 'Save the revenue splits'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate(`/songs/${deal.song.id}/expenses`)}
        >
          Next: costs and recoupment
        </Button>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-lg">A note on producers and features</h3>
          <p className="mt-2 text-sm text-ink-700">
            <Term termKey="producer_points">Producer points</Term> and{' '}
            <Term termKey="featured_artist">featured artist</Term> shares belong in master
            streaming, and they should say whether they come off the top or out of someone's share.
            Put them in the split now — the most common dispute in music is a producer point nobody
            wrote down.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
