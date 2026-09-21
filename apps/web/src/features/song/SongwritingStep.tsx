import { type SplitLine } from '@altar/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Term } from '../../components/ui/Term.js';
import { SplitBuilder } from '../../components/splits/SplitBuilder.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';
import { displayName } from './types.js';

/** Spec §8 step 3 — the songwriter split builder. */
export function SongwritingStep() {
  const { deal, reload } = useSong();
  const navigate = useNavigate();
  const [lines, setLines] = useState<SplitLine[]>(deal.compositionSplits);
  const [saved, setSaved] = useState(false);

  const save = useMutation(async () =>
    api.put(`/songs/${deal.song.id}/splits`, { rightType: 'composition', lines }),
  );

  const participants = deal.contributors.map((contributor) => ({
    id: contributor.id,
    name: displayName(contributor),
    role: contributor.role,
  }));

  const submit = async () => {
    const result = await save.run(undefined);
    if (result !== null) {
      setSaved(true);
      reload();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader
          title="Who wrote this song?"
          description="The song itself — lyrics, melody, composition. This is not about who owns the recording."
        />
        <CardBody>
          <SplitBuilder
            label="Songwriting ownership"
            participants={participants}
            lines={lines}
            onChange={(next) => {
              setLines(next);
              setSaved(false);
            }}
            includeAltar={false}
            helpText="Each writer approves their own percentage. It has to total exactly 100% before anything can be generated."
          />

          {save.error ? (
            <Callout tone="blocker" className="mt-4">
              {save.error.message}
            </Callout>
          ) : null}

          {saved ? (
            <Callout tone="success" className="mt-4" title="Saved">
              Invite anyone who has not approved their share yet, from the previous step.
            </Callout>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button size="lg" onClick={submit} disabled={save.pending}>
              {save.pending ? 'Saving…' : 'Save the songwriting split'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate(`/songs/${deal.song.id}/master`)}
            >
              Next: the recording
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid h-fit gap-4">
        <Card>
          <CardBody>
            <h3 className="text-lg">Why this is separate</h3>
            <p className="mt-2 text-sm text-ink-700">
              The <Term termKey="composition">song</Term> and the{' '}
              <Term termKey="master">recording</Term> are two different pieces of property. A label
              can own a recording while every word and note inside it still belongs to the writers.
              Altar.Camp asks the two questions separately, always.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg">Publishing and PROs</h3>
            <p className="mt-2 text-sm text-ink-700">
              Each writer collects their own share through their <Term termKey="pro">PRO</Term> and,
              if they have one, their <Term termKey="publisher">publisher</Term>. Add those details
              on each collaborator so the registrations can be done properly at release.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg">Approvals</h3>
            <ul className="mt-2 grid gap-2 text-sm">
              {deal.contributors
                .filter((contributor) => contributor.requires_approval)
                .map((contributor) => (
                  <li key={contributor.id} className="flex items-center justify-between gap-2">
                    <span className="text-ink-800">{displayName(contributor)}</span>
                    <span
                      className={
                        contributor.approval_status === 'accepted'
                          ? 'font-medium text-moss-700'
                          : 'font-medium text-clay-700'
                      }
                    >
                      {contributor.approval_status === 'accepted' ? 'Approved' : 'Waiting'}
                    </span>
                  </li>
                ))}
              {deal.contributors.filter((contributor) => contributor.requires_approval).length ===
              0 ? (
                <li className="text-ink-600">Nobody else is on this song yet.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
