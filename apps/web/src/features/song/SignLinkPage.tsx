import { useParams } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { useMutation, useQuery } from '../../lib/useApi.js';
import { AgreementView, type AgreementPayload, type SignSubmission } from './AgreementView.js';

interface SignLinkPayload extends AgreementPayload {
  signer: { id: string; name: string; signedAt: string | null };
}

/** A collaborator with no Altar.Camp account signs through their one-time link. */
export function SignLinkPage() {
  const { token } = useParams();
  const { data, loading, error, reload } = useQuery<SignLinkPayload>(
    token ? `/agreements/sign/${token}` : null,
  );

  const sign = useMutation(async (submission: SignSubmission) =>
    api.post(`/agreements/${data?.agreement.id}/sign`, { ...submission, signingToken: token }),
  );

  return (
    <div className="altar-container py-12">
      {loading ? <Spinner label="Opening the agreement" /> : null}
      {error ? (
        <Callout tone="blocker" title="This signing link is not valid">
          {error.message}
        </Callout>
      ) : null}

      {data ? (
        <>
          <PageHeader
            eyebrow="You have been asked to sign"
            title={data.agreement.title}
            description={`Signing as ${data.signer.name}. Read all three views before you decide — nothing here is hidden from you.`}
          />
          <AgreementView
            payload={data}
            canSign={!data.signer.signedAt}
            signerName={data.signer.name}
            signing={sign.pending}
            signError={sign.error}
            signed={Boolean(data.signer.signedAt)}
            onSign={async (submission) => {
              const result = await sign.run(submission);
              if (result !== null) reload();
            }}
          />
        </>
      ) : null}
    </div>
  );
}
