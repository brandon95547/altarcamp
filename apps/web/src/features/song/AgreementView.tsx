import {
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_VIEWS,
  AGREEMENT_VIEW_LABELS,
  SIGNING_AFFIRMATIONS,
  type AgreementStatus,
  type AgreementView as ViewKey,
} from '@altar/shared';
import { Check, Copy, Link2, PenLine, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Checkbox, TextInput } from '../../components/ui/Field.js';
import { Markdown } from '../../components/ui/Markdown.js';
import { cn } from '../../lib/cn.js';
import { formatDateTime } from '../../lib/format.js';
import type { ApiError } from '../../lib/api.js';

export interface AgreementPayload {
  agreement: {
    id: string;
    type: string;
    status: string;
    title: string;
    song_title: string | null;
    created_at: string;
    completed_at: string | null;
  };
  version: {
    version: number;
    rendered_simple: string;
    rendered_deal_sheet: string;
    rendered_legal: string;
    document_hash: string;
  } | null;
  signers: {
    id: string;
    party: string;
    name: string;
    email: string | null;
    is_required: boolean;
    signed_at: string | null;
  }[];
}

export interface SignSubmission {
  typedName: string;
  affirmations: string[];
  documentHash: string;
  agreementVersion: number;
}

/**
 * Spec §21 — one agreement, three views, and a signature block that refuses until every
 * statement is confirmed and the typed name matches.
 */
export function AgreementView({
  payload,
  canSign,
  signerName,
  onSign,
  signing,
  signError,
  signed,
  onIssueLink,
}: {
  payload: AgreementPayload;
  canSign: boolean;
  signerName: string | null;
  onSign: (submission: SignSubmission) => Promise<void>;
  signing: boolean;
  signError: ApiError | null;
  signed: boolean;
  /** Only the artist and staff can issue a collaborator's signing link. */
  onIssueLink?: (signerId: string) => Promise<string | null>;
}) {
  const [view, setView] = useState<ViewKey>('simple');
  const [affirmed, setAffirmed] = useState<string[]>([]);
  const [typedName, setTypedName] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});

  const { agreement, version, signers } = payload;
  if (!version) {
    return <Callout tone="blocker">This agreement has no content yet.</Callout>;
  }

  const body =
    view === 'simple'
      ? version.rendered_simple
      : view === 'deal_sheet'
        ? version.rendered_deal_sheet
        : version.rendered_legal;

  const allAffirmed = SIGNING_AFFIRMATIONS.every((affirmation) =>
    affirmed.includes(affirmation.key),
  );
  const remaining = signers.filter((signer) => signer.is_required && !signer.signed_at);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {AGREEMENT_VIEWS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                view === key
                  ? 'bg-ink-950 text-ink-50'
                  : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-300 hover:bg-ink-50',
              )}
            >
              {AGREEMENT_VIEW_LABELS[key]}
            </button>
          ))}
          <span className="ml-auto text-sm text-ink-600">
            Version {version.version} ·{' '}
            {AGREEMENT_STATUS_LABELS[agreement.status as AgreementStatus] ?? agreement.status}
          </span>
        </div>

        <Card>
          <CardBody className="px-6 py-6 sm:px-8">
            <Markdown source={body} />
          </CardBody>
        </Card>

        <p className="text-xs text-ink-600">
          Document hash (SHA-256): <code className="break-all">{version.document_hash}</code>
          <br />
          This hash covers the words and the numbers behind them. If either changed, the signature
          would no longer match.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader title="Signatures" />
          <CardBody className="grid gap-3">
            {signers.map((signer) => (
              <div key={signer.id} className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-950">{signer.name}</p>
                    <p className="text-xs uppercase tracking-wide text-ink-600">{signer.party}</p>
                  </div>
                  {signer.signed_at ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-moss-700">
                      <Check className="size-4" aria-hidden />
                      {formatDateTime(signer.signed_at).split(',')[0]}
                    </span>
                  ) : (
                    <StatusBadge status="pending" />
                  )}
                </div>

                {onIssueLink && signer.party === 'contributor' && !signer.signed_at ? (
                  links[signer.id] ? (
                    <div className="flex items-center gap-1.5 rounded bg-ink-100 px-2 py-1.5">
                      <code className="min-w-0 flex-1 truncate text-xs">{links[signer.id]}</code>
                      <button
                        type="button"
                        className="rounded p-1 text-ink-600 hover:bg-white hover:text-ink-900"
                        onClick={() => void navigator.clipboard?.writeText(links[signer.id] ?? '')}
                        aria-label={`Copy ${signer.name}'s signing link`}
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 self-start text-xs font-medium text-ember-700 hover:text-ember-800"
                      onClick={async () => {
                        const url = await onIssueLink(signer.id);
                        if (url) setLinks((current) => ({ ...current, [signer.id]: url }));
                      }}
                    >
                      <Link2 className="size-3.5" aria-hidden />
                      Get their signing link
                    </button>
                  )
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>

        {signed || agreement.status === 'signed' ? (
          <Callout tone="success" title="Signed">
            {remaining.length > 0
              ? `Your signature is recorded. Waiting on ${remaining.map((signer) => signer.name).join(', ')}.`
              : 'Fully signed. A copy is in your document vault, with the signature certificate attached.'}
          </Callout>
        ) : canSign ? (
          <Card>
            <CardHeader
              title="Sign this agreement"
              description="Confirm each statement, then type your name."
            />
            <CardBody className="grid gap-4">
              <div className="grid gap-2.5">
                {SIGNING_AFFIRMATIONS.map((affirmation) => (
                  <Checkbox
                    key={affirmation.key}
                    checked={affirmed.includes(affirmation.key)}
                    onChange={(event) =>
                      setAffirmed((current) =>
                        event.target.checked
                          ? [...current, affirmation.key]
                          : current.filter((key) => key !== affirmation.key),
                      )
                    }
                    label={<span className="text-sm">{affirmation.label}</span>}
                  />
                ))}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-900">
                  Type your full legal name{signerName ? ` — ${signerName}` : ''}
                </span>
                <TextInput
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder={signerName ?? 'Your legal name'}
                  autoComplete="off"
                />
              </label>

              {signError ? <Callout tone="blocker">{signError.message}</Callout> : null}

              <Button
                size="lg"
                disabled={signing || !allAffirmed || typedName.trim().length < 2}
                onClick={() =>
                  onSign({
                    typedName: typedName.trim(),
                    affirmations: affirmed,
                    documentHash: version.document_hash,
                    agreementVersion: version.version,
                  })
                }
              >
                <PenLine className="size-5" aria-hidden />
                {signing ? 'Signing…' : 'Sign agreement'}
              </Button>

              <p className="flex items-start gap-2 text-xs text-ink-600">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Your signature records the version, the document hash, the statements you confirmed,
                the time, and the device it came from. You receive a certificate with all of it.
              </p>
            </CardBody>
          </Card>
        ) : (
          <Callout tone="info" title="You are not a signer on this agreement">
            You can read it in full. Only the parties named above can sign it.
          </Callout>
        )}
      </div>
    </div>
  );
}
