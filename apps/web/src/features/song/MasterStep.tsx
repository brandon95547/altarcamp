import {
  MASTER_STRUCTURES,
  MASTER_STRUCTURE_LABELS,
  percentToBps,
  type MasterStructure,
  type SplitLine,
} from '@altar/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplitBuilder } from '../../components/splits/SplitBuilder.js';
import { SplitBar } from '../../components/splits/SplitBar.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Field, RadioGroup, TextArea } from '../../components/ui/Field.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';
import { displayName } from './types.js';

/** Spec §9 — who owns the recording, shown against the songwriting split so the two stay distinct. */
export function MasterStep() {
  const { deal, reload } = useSong();
  const navigate = useNavigate();
  const [structure, setStructure] = useState<MasterStructure>(deal.masterTerms.structure);
  const [note, setNote] = useState(deal.masterTerms.structure_note ?? '');
  const [lines, setLines] = useState<SplitLine[]>(deal.masterSplits);

  const artist = deal.contributors.find((contributor) => contributor.role === 'primary_artist');

  const applyStructure = (next: MasterStructure) => {
    setStructure(next);
    if (!artist) return;
    const artistLine = { participantId: artist.id, participantName: displayName(artist) };
    const altarLine = { participantId: 'altar', participantName: 'Altar.Camp' };
    if (
      next === 'artist_owns_all' ||
      next === 'exclusive_license' ||
      next === 'limited_term_license'
    ) {
      setLines([{ ...artistLine, bps: percentToBps(100) }]);
    } else if (next === 'altar_owns_all') {
      setLines([{ ...altarLine, bps: percentToBps(100) }]);
    } else if (next === 'shared') {
      setLines([
        { ...artistLine, bps: percentToBps(50) },
        { ...altarLine, bps: percentToBps(50) },
      ]);
    }
  };

  const save = useMutation(async () =>
    api.put(`/songs/${deal.song.id}/splits`, {
      rightType: 'master',
      lines,
      masterStructure: structure,
      structureNote: note || undefined,
    }),
  );

  const participants = deal.contributors.map((contributor) => ({
    id: contributor.id,
    name: displayName(contributor),
    role: contributor.role,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="grid gap-4">
        <Card>
          <CardHeader
            title="Who owns the recording?"
            description="The master is this specific recording — the takes, the mix, the file that gets released."
          />
          <CardBody className="grid gap-5">
            <RadioGroup
              name="masterStructure"
              value={structure}
              onChange={applyStructure}
              options={MASTER_STRUCTURES.map((option) => ({
                value: option,
                label: MASTER_STRUCTURE_LABELS[option],
                description:
                  option === 'exclusive_license'
                    ? 'You keep ownership; Altar.Camp gets the exclusive right to exploit it.'
                    : option === 'limited_term_license'
                      ? 'You keep ownership; the licence ends and everything reverts to you automatically.'
                      : undefined,
              }))}
            />

            {structure === 'other' || structure === 'limited_term_license' ? (
              <Field
                label="Describe the arrangement"
                hint="This text goes into the agreement itself."
              >
                {(props) => (
                  <TextArea
                    {...props}
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                )}
              </Field>
            ) : null}

            <SplitBuilder
              label="Master ownership"
              participants={participants}
              lines={lines}
              onChange={setLines}
              helpText="Ownership of the recording, in shares that total exactly 100%."
            />

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
                {save.pending ? 'Saving…' : 'Save master ownership'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate(`/songs/${deal.song.id}/revenue`)}
              >
                Next: when it earns
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid h-fit gap-4">
        <Card>
          <CardHeader title="The two, side by side" />
          <CardBody className="grid gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-ink-600">
                Master ownership
              </p>
              <SplitBar lines={lines} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-ink-600">
                Songwriting ownership
              </p>
              <SplitBar lines={deal.compositionSplits} />
            </div>
            <p className="text-sm text-ink-700">
              These are different numbers for different property, and that is normal. Owning the{' '}
              <Term termKey="master" /> does not transfer the{' '}
              <Term termKey="composition">song</Term>, and owning the song does not transfer the
              recording.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
