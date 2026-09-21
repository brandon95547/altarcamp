import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.js';
import { useMutation, useQuery } from '../../lib/useApi.js';
import { AgreementView, type AgreementPayload, type SignSubmission } from './AgreementView.js';

export function AgreementPage() {
  const { agreementId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useQuery<AgreementPayload>(
    agreementId ? `/agreements/${agreementId}` : null,
  );

  const sign = useMutation(async (submission: SignSubmission) =>
    api.post(`/agreements/${agreementId}/sign`, submission),
  );

  const issueLink = useMutation(async (signerId: string) =>
    api.post<{ url: string }>(`/agreements/${agreementId}/signers/${signerId}/link`, {}),
  );

  if (loading) return <Spinner label="Opening your agreement" />;
  if (error)
    return (
      <Callout tone="blocker" title="We could not open this agreement">
        {error.message}
      </Callout>
    );
  if (!data) return null;

  const mySigner = data.signers.find(
    (signer) =>
      (signer.party === 'artist' && signer.name === user?.legalName) ||
      (signer.party === 'altar' && (user?.role === 'admin' || user?.role === 'legal_admin')) ||
      signer.email === user?.email,
  );

  return (
    <div>
      <Link
        to={data.agreement.song_title ? '/songs' : '/dashboard'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>

      <PageHeader
        eyebrow="Agreement"
        title={data.agreement.title}
        description="Read it in plain English first, then as a deal sheet, then in full. The words never change between views — only how much detail you are shown."
      />

      <AgreementView
        payload={data}
        canSign={Boolean(mySigner && !mySigner.signed_at)}
        signerName={mySigner?.name ?? null}
        signing={sign.pending}
        signError={sign.error}
        signed={Boolean(mySigner?.signed_at)}
        onSign={async (submission) => {
          const result = await sign.run(submission);
          if (result !== null) reload();
        }}
        onIssueLink={async (signerId) => {
          const result = await issueLink.run(signerId);
          return result?.url ?? null;
        }}
      />
    </div>
  );
}
