import { bpsToPercent, formatBps, percentToBps } from '@altar/shared';
import { Check, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PercentInput, TextArea } from '../../components/ui/Field.js';
import { Spinner } from '../../components/ui/Misc.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { useMutation, useQuery } from '../../lib/useApi.js';

interface Invitation {
  id: string;
  status: string;
  songTitle: string;
  artistName: string;
  contributorName: string;
  contributorRole: string;
  proposedBps: number | null;
  requestedBps: number | null;
  message: string | null;
  expiresAt: string;
  respondedAt: string | null;
}

/** Spec §33 — accept, ask for a different number, or decline. */
export function InvitationPage() {
  const { token } = useParams();
  const { data, loading, error, reload } = useQuery<{ invitation: Invitation }>(
    token ? `/invitations/${token}` : null,
  );
  const [mode, setMode] = useState<'idle' | 'change'>('idle');
  const [requested, setRequested] = useState('');
  const [message, setMessage] = useState('');

  const respond = useMutation(
    async (payload: {
      action: 'accept' | 'request_change' | 'decline';
      requestedBps?: number;
      message?: string;
    }) => api.post(`/invitations/${token}/respond`, payload),
  );

  if (loading)
    return (
      <div className="altar-container py-16">
        <Spinner />
      </div>
    );
  if (error) {
    return (
      <div className="altar-container py-16">
        <Callout tone="blocker" title="This invitation link is not valid">
          {error.message}
        </Callout>
      </div>
    );
  }
  if (!data) return null;

  const invitation = data.invitation;
  const answered = invitation.status !== 'pending';

  return (
    <div className="altar-container flex justify-center py-14">
      <div className="w-full max-w-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">
          Collaboration invitation
        </p>
        <h1 className="text-3xl sm:text-4xl">
          {invitation.artistName} invited you to collaborate on “{invitation.songTitle}”
        </h1>

        <Card className="mt-6">
          <CardHeader
            title="What is being proposed"
            description={`You are credited as ${invitation.contributorRole.replace(/_/g, ' ')}.`}
          />
          <CardBody className="grid gap-4">
            <div className="rounded-lg bg-ink-100 px-5 py-6 text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-ink-600">
                Your songwriting ownership
              </p>
              <p className="mt-1 font-display text-5xl text-ink-950">
                {invitation.proposedBps === null ? '—' : formatBps(invitation.proposedBps)}
              </p>
            </div>

            {invitation.message ? (
              <p className="rounded-lg border-l-2 border-ember-500 bg-ember-50 px-4 py-3 text-sm text-ink-800">
                “{invitation.message}”
              </p>
            ) : null}

            <p className="text-sm text-ink-700">
              This is your share of the <Term termKey="composition">song</Term> — the lyrics and
              melody, not the recording. Accepting records your agreement permanently. Asking for a
              change tells {invitation.artistName} what you think is right; nothing moves forward
              until you both agree.
            </p>

            {answered ? (
              <Callout tone={invitation.status === 'accepted' ? 'success' : 'info'}>
                {invitation.status === 'accepted'
                  ? 'You approved this split. Nothing further is needed from you right now.'
                  : invitation.status === 'change_requested'
                    ? `You asked for ${invitation.requestedBps === null ? 'a different share' : formatBps(invitation.requestedBps)}. ${invitation.artistName} has been told.`
                    : 'You declined this invitation.'}
              </Callout>
            ) : mode === 'change' ? (
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-900">
                    What percentage do you think is right?
                  </span>
                  <PercentInput
                    value={requested}
                    onChange={(event) => setRequested(event.target.value)}
                    placeholder={
                      invitation.proposedBps ? String(bpsToPercent(invitation.proposedBps)) : '25'
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-900">
                    Anything to add?
                  </span>
                  <TextArea
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={respond.pending || requested.trim() === ''}
                    onClick={async () => {
                      const result = await respond.run({
                        action: 'request_change',
                        requestedBps: percentToBps(Number.parseFloat(requested)),
                        message: message || undefined,
                      });
                      if (result !== null) reload();
                    }}
                  >
                    Send my request
                  </Button>
                  <Button variant="ghost" onClick={() => setMode('idle')}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  size="lg"
                  disabled={respond.pending}
                  onClick={async () => {
                    const result = await respond.run({ action: 'accept' });
                    if (result !== null) reload();
                  }}
                >
                  <Check className="size-5" aria-hidden />
                  Accept
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setMode('change')}>
                  <MessageSquare className="size-5" aria-hidden />
                  Request a change
                </Button>
                <button
                  type="button"
                  className="text-sm text-ink-600 underline hover:text-clay-700 sm:col-span-2"
                  onClick={async () => {
                    const result = await respond.run({ action: 'decline' });
                    if (result !== null) reload();
                  }}
                >
                  I am not involved in this song
                </button>
              </div>
            )}

            {respond.error ? <Callout tone="blocker">{respond.error.message}</Callout> : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
