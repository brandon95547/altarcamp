import {
  CONTRIBUTOR_ROLES,
  CONTRIBUTOR_ROLE_LABELS,
  CONTRIBUTOR_REQUIRED_FIELDS,
  formatBps,
  type ContributorRole,
} from '@altar/shared';
import { Copy, Mail, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Badge, StatusBadge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Checkbox, Field, Select, TextInput } from '../../components/ui/Field.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';
import { displayName } from './types.js';

/** Spec §8 and §33 — who is on the record, and whether they have approved their share. */
export function CollaboratorsStep() {
  const { deal, reload } = useSong();
  const [form, setForm] = useState({
    legalName: '',
    stageName: '',
    email: '',
    role: 'songwriter' as ContributorRole,
    proAffiliation: '',
    publisherName: '',
    requiresApproval: true,
  });
  const [invitationLink, setInvitationLink] = useState<{ name: string; url: string } | null>(null);

  const add = useMutation(async () =>
    api.post(`/songs/${deal.song.id}/contributors`, {
      legalName: form.legalName,
      stageName: form.stageName || undefined,
      email: form.email || undefined,
      role: form.role,
      proAffiliation: form.proAffiliation || undefined,
      publisherName: form.publisherName || undefined,
      requiresApproval: form.requiresApproval,
    }),
  );

  const remove = useMutation(async (contributorId: string) =>
    api.delete(`/songs/${deal.song.id}/contributors/${contributorId}`),
  );

  const invite = useMutation(async (contributorId: string) =>
    api.post<{ token: string; url: string }>(
      `/songs/${deal.song.id}/contributors/${contributorId}/invite`,
      {},
    ),
  );

  const required = CONTRIBUTOR_REQUIRED_FIELDS[form.role];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await add.run(undefined);
    if (result) {
      setForm({
        ...form,
        legalName: '',
        stageName: '',
        email: '',
        proAffiliation: '',
        publisherName: '',
      });
      reload();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-4">
        <Card>
          <CardHeader
            title="Everyone on this recording"
            description="Anyone whose name appears in a split has to approve their own percentage before an agreement can be generated."
          />
          <CardBody className="grid gap-3">
            {deal.contributors.map((contributor) => {
              const compositionShare = deal.compositionSplits
                .filter((line) => line.participantId === contributor.id)
                .reduce((total, line) => total + line.bps, 0);
              const masterShare = deal.masterSplits
                .filter((line) => line.participantId === contributor.id)
                .reduce((total, line) => total + line.bps, 0);

              return (
                <div
                  key={contributor.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-ink-200 px-4 py-3"
                >
                  {/* On a phone the name takes its own line; the badges wrap beneath it
                      rather than squeezing it to one character per line. */}
                  <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <p className="font-medium text-ink-950">
                      {displayName(contributor)}
                      {contributor.stage_name &&
                      contributor.stage_name !== contributor.legal_name ? (
                        <span className="ml-2 text-sm font-normal text-ink-600">
                          {contributor.legal_name}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-ink-600">
                      {CONTRIBUTOR_ROLE_LABELS[contributor.role]}
                      {contributor.email ? ` · ${contributor.email}` : ''}
                      {contributor.pro_affiliation ? ` · ${contributor.pro_affiliation}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {compositionShare > 0 ? (
                      <Badge tone="dusk">Song {formatBps(compositionShare)}</Badge>
                    ) : null}
                    {masterShare > 0 ? (
                      <Badge tone="ember">Master {formatBps(masterShare)}</Badge>
                    ) : null}
                    {contributor.requires_approval ? (
                      <StatusBadge status={contributor.approval_status} />
                    ) : (
                      <Badge tone="moss">You</Badge>
                    )}

                    {contributor.requires_approval && contributor.approval_status !== 'accepted' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={invite.pending}
                        onClick={async () => {
                          const result = await invite.run(contributor.id);
                          if (result)
                            setInvitationLink({ name: displayName(contributor), url: result.url });
                        }}
                      >
                        <Mail className="size-4" aria-hidden />
                        Invite
                      </Button>
                    ) : null}

                    {contributor.requires_approval ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await remove.run(contributor.id);
                          reload();
                        }}
                        className="rounded p-2 text-ink-500 hover:bg-clay-50 hover:text-clay-700"
                        aria-label={`Remove ${displayName(contributor)}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {remove.error ? <Callout tone="blocker">{remove.error.message}</Callout> : null}

        {invitationLink ? (
          <Callout tone="success" title={`Invitation ready for ${invitationLink.name}`}>
            <p>
              Send them this link. It shows the exact percentage being proposed, and lets them
              accept or ask for a different one.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs">
                {invitationLink.url}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void navigator.clipboard?.writeText(invitationLink.url)}
              >
                <Copy className="size-4" aria-hidden />
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs">
              Email delivery arrives in phase 2 — for now the artist passes the link on directly.
            </p>
          </Callout>
        ) : null}
      </div>

      <Card className="h-fit">
        <CardHeader title="Add someone" description="Only what their role actually needs." />
        <CardBody>
          <form onSubmit={submit} className="grid gap-4">
            {add.error ? <Callout tone="blocker">{add.error.message}</Callout> : null}

            <Field label="Their role" required>
              {(props) => (
                <Select
                  {...props}
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as ContributorRole })
                  }
                >
                  {CONTRIBUTOR_ROLES.filter(
                    (role) => role !== 'label' && role !== 'primary_artist',
                  ).map((role) => (
                    <option key={role} value={role}>
                      {CONTRIBUTOR_ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Legal name" required hint="The name that goes on the agreement.">
              {(props) => (
                <TextInput
                  {...props}
                  required
                  value={form.legalName}
                  onChange={(event) => setForm({ ...form, legalName: event.target.value })}
                />
              )}
            </Field>

            <Field label="Name they go by">
              {(props) => (
                <TextInput
                  {...props}
                  value={form.stageName}
                  onChange={(event) => setForm({ ...form, stageName: event.target.value })}
                />
              )}
            </Field>

            <Field label="Email" hint="Where their invitation and signing link go.">
              {(props) => (
                <TextInput
                  {...props}
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              )}
            </Field>

            {required.includes('pro_affiliation') ? (
              <Field label="PRO affiliation" hint="ASCAP, BMI, SESAC, PRS…">
                {(props) => (
                  <TextInput
                    {...props}
                    value={form.proAffiliation}
                    onChange={(event) => setForm({ ...form, proAffiliation: event.target.value })}
                  />
                )}
              </Field>
            ) : null}

            {required.includes('publisher_name') ? (
              <Field label="Publisher" hint="Leave blank if they are self-published.">
                {(props) => (
                  <TextInput
                    {...props}
                    value={form.publisherName}
                    onChange={(event) => setForm({ ...form, publisherName: event.target.value })}
                  />
                )}
              </Field>
            ) : null}

            <Checkbox
              checked={form.requiresApproval}
              onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })}
              label="They must approve their own share"
              description="Leave this on. It is what makes the split defensible later."
            />

            <Button type="submit" disabled={add.pending || form.legalName.trim().length < 2}>
              <UserPlus className="size-4" aria-hidden />
              {add.pending ? 'Adding…' : 'Add to this song'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
