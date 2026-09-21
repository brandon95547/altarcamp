import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Field, TextArea, TextInput } from '../../components/ui/Field.js';
import { Stepper } from '../../components/ui/Misc.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { onboardingSteps } from './steps.js';

/** Spec §6 step 2. */
export function ProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bio: '',
    genre: '',
    influences: '',
    missionInterests: '',
    musicLink: '',
    currentDistributor: '',
    currentLabel: '',
    currentPublisher: '',
    proAffiliation: '',
    managementName: '',
    managementEmail: '',
    attorneyName: '',
    attorneyEmail: '',
  });

  const save = useMutation(async () =>
    api.put('/artists/me/profile', {
      bio: form.bio || undefined,
      genre: form.genre || undefined,
      influences: form.influences || undefined,
      missionInterests: form.missionInterests || undefined,
      musicLinks: form.musicLink ? [form.musicLink] : undefined,
      currentDistributor: form.currentDistributor || undefined,
      currentLabel: form.currentLabel || undefined,
      currentPublisher: form.currentPublisher || undefined,
      proAffiliation: form.proAffiliation || undefined,
      managementName: form.managementName || undefined,
      managementEmail: form.managementEmail || undefined,
      attorneyName: form.attorneyName || undefined,
      attorneyEmail: form.attorneyEmail || undefined,
    }),
  );

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await save.run(undefined);
    if (result !== null) navigate('/onboarding/existing-rights');
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Stepper steps={onboardingSteps('profile')} currentIndex={1} />
      <h1 className="text-3xl sm:text-4xl">Your artist profile</h1>
      <p className="mt-2 text-ink-700">
        This is what Altar.Camp knows about you before any conversation about a deal. Everything
        except your genre is optional — but the more we know, the better the terms we can propose.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-5">
        {save.error ? <Callout tone="blocker">{save.error.message}</Callout> : null}

        <Card>
          <CardHeader title="The music" />
          <CardBody className="grid gap-5">
            <Field label="Short biography">
              {(props) => (
                <TextArea
                  {...props}
                  value={form.bio}
                  onChange={set('bio')}
                  placeholder="Who you are, in a few sentences."
                />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Genre">
                {(props) => <TextInput {...props} value={form.genre} onChange={set('genre')} />}
              </Field>
              <Field label="Influences">
                {(props) => (
                  <TextInput {...props} value={form.influences} onChange={set('influences')} />
                )}
              </Field>
            </div>
            <Field
              label="A link to your music"
              hint="Spotify, Bandcamp, YouTube — wherever it lives now."
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={form.musicLink}
                  onChange={set('musicLink')}
                  placeholder="https://"
                />
              )}
            </Field>
            <Field label="Ministry or mission interests">
              {(props) => (
                <TextArea
                  {...props}
                  rows={3}
                  value={form.missionInterests}
                  onChange={set('missionInterests')}
                  placeholder="Where your heart already is."
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="The business, as it stands today"
            description="If any of these already exist, we need to know before we propose anything."
          />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <Field
              label={
                <>
                  Current <Term termKey="distributor" />
                </>
              }
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={form.currentDistributor}
                  onChange={set('currentDistributor')}
                />
              )}
            </Field>
            <Field
              label={
                <>
                  Current <Term termKey="label">record label</Term>
                </>
              }
            >
              {(props) => (
                <TextInput {...props} value={form.currentLabel} onChange={set('currentLabel')} />
              )}
            </Field>
            <Field
              label={
                <>
                  Current <Term termKey="publisher" />
                </>
              }
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={form.currentPublisher}
                  onChange={set('currentPublisher')}
                />
              )}
            </Field>
            <Field
              label={
                <>
                  <Term termKey="pro">PRO</Term> affiliation
                </>
              }
              hint="ASCAP, BMI, SESAC, PRS…"
            >
              {(props) => (
                <TextInput
                  {...props}
                  value={form.proAffiliation}
                  onChange={set('proAffiliation')}
                />
              )}
            </Field>
            <Field label="Manager">
              {(props) => (
                <TextInput
                  {...props}
                  value={form.managementName}
                  onChange={set('managementName')}
                />
              )}
            </Field>
            <Field label="Manager email">
              {(props) => (
                <TextInput
                  {...props}
                  type="email"
                  value={form.managementEmail}
                  onChange={set('managementEmail')}
                />
              )}
            </Field>
            <Field label="Attorney (optional)">
              {(props) => (
                <TextInput {...props} value={form.attorneyName} onChange={set('attorneyName')} />
              )}
            </Field>
            <Field label="Attorney email (optional)">
              {(props) => (
                <TextInput
                  {...props}
                  type="email"
                  value={form.attorneyEmail}
                  onChange={set('attorneyEmail')}
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={save.pending}>
            {save.pending ? 'Saving…' : 'Save and continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate('/onboarding/existing-rights')}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  );
}
