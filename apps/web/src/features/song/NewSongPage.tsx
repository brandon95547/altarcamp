import {
  COLLABORATION_TYPES,
  COLLABORATION_TYPE_LABELS,
  RECORDING_STATUSES,
  RECORDING_STATUS_LABELS,
  type CollaborationType,
  type RecordingStatus,
} from '@altar/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Field, RadioGroup, Select, TextArea, TextInput } from '../../components/ui/Field.js';
import { PageHeader } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';

/** Spec §8 steps 1 and 2. */
export function NewSongPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idea');
  const [collaborationType, setCollaborationType] = useState<CollaborationType | null>(null);
  const [expectedReleaseDate, setExpectedReleaseDate] = useState('');
  const [notes, setNotes] = useState('');

  const create = useMutation(async () =>
    api.post<{ song: { id: string } }>('/songs', {
      title,
      recordingStatus,
      collaborationType: collaborationType ?? undefined,
      expectedReleaseDate: expectedReleaseDate || null,
      notes: notes || undefined,
    }),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await create.run(undefined);
    if (result) navigate(`/songs/${result.song.id}/collaborators`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        eyebrow="New song"
        title="Start a song"
        description="A working title is enough to begin. Everything else can change until the agreement is generated."
      />

      <form onSubmit={submit} className="grid gap-5">
        {create.error ? <Callout tone="blocker">{create.error.message}</Callout> : null}

        <Card>
          <CardBody className="grid gap-5">
            <Field label="Working title" required>
              {(props) => (
                <TextInput
                  {...props}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </Field>

            <Field
              label="Where is the recording?"
              hint="This is only a status — it does not lock anything."
            >
              {(props) => (
                <Select
                  {...props}
                  value={recordingStatus}
                  onChange={(event) => setRecordingStatus(event.target.value as RecordingStatus)}
                >
                  {RECORDING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {RECORDING_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-900">
                What kind of collaboration is this?
              </p>
              <RadioGroup
                name="collaborationType"
                value={collaborationType}
                onChange={setCollaborationType}
                options={COLLABORATION_TYPES.map((type) => ({
                  value: type,
                  label: COLLABORATION_TYPE_LABELS[type],
                }))}
              />
            </div>

            <Field
              label="Target release date"
              hint="A best guess. Nothing is scheduled from it yet."
            >
              {(props) => (
                <TextInput
                  {...props}
                  type="date"
                  value={expectedReleaseDate}
                  onChange={(event) => setExpectedReleaseDate(event.target.value)}
                />
              )}
            </Field>

            <Field label="Anything we should know?">
              {(props) => (
                <TextArea
                  {...props}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <div>
          <Button type="submit" size="lg" disabled={create.pending || title.trim().length === 0}>
            {create.pending ? 'Creating…' : 'Create the song'}
          </Button>
        </div>
      </form>
    </div>
  );
}
