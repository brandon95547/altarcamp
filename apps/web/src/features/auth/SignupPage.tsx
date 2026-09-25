import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Checkbox, EmailInput, Field, PhoneInput, TextInput, UrlInput } from '../../components/ui/Field.js';
import { ApiError } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.js';

/** Spec §6 step 1. */
export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intendedPath = params.get('path');

  const [form, setForm] = useState({
    legalName: '',
    artistName: '',
    email: '',
    phone: '',
    password: '',
    country: 'United States',
    region: '',
    website: '',
    instagram: '',
  });
  const [isOfAge, setIsOfAge] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signUp({
        legalName: form.legalName,
        artistName: form.artistName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        country: form.country,
        region: form.region || undefined,
        website: form.website || undefined,
        isOfAge: true,
        socialProfiles: form.instagram ? [{ platform: 'Instagram', url: form.instagram }] : [],
      });
      navigate(`/onboarding/profile${intendedPath ? `?path=${intendedPath}` : ''}`, {
        replace: true,
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : null);
    } finally {
      setPending(false);
    }
  };

  const fieldError = (path: string) =>
    error?.details.find((detail) => detail.path === path)?.message ?? null;

  return (
    <div className="altar-container flex justify-center py-14">
      <div className="w-full max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">
          Step 1 of 5
        </p>
        <h1 className="text-3xl sm:text-4xl">Create your account</h1>
        <p className="mt-2 text-ink-700">
          {intendedPath === 'one_year'
            ? 'You are starting the one-year path. Nothing is committed yet — you will choose after the orientation.'
            : 'Nothing is committed by signing up. You choose one song or one year later, once you understand both.'}
        </p>

        <Card className="mt-6">
          <CardBody>
            <form onSubmit={submit} className="grid gap-5">
              {error && error.details.length === 0 ? (
                <Callout tone="blocker">{error.message}</Callout>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Legal name"
                  required
                  hint="As it will appear on agreements."
                  error={fieldError('legalName')}
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      required
                      autoComplete="name"
                      value={form.legalName}
                      onChange={set('legalName')}
                    />
                  )}
                </Field>
                <Field label="Artist or stage name" required error={fieldError('artistName')}>
                  {(props) => (
                    <TextInput
                      {...props}
                      required
                      value={form.artistName}
                      onChange={set('artistName')}
                    />
                  )}
                </Field>
                <Field label="Email" required error={fieldError('email')}>
                  {(props) => (
                    <EmailInput
                      {...props}
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={set('email')}
                    />
                  )}
                </Field>
                <Field label="Phone" error={fieldError('phone')}>
                  {(props) => (
                    <PhoneInput
                      {...props}
                      value={form.phone}
                      onChange={set('phone')}
                    />
                  )}
                </Field>
                <Field
                  label="Password"
                  required
                  hint="At least 12 characters. This account holds your contracts."
                  error={fieldError('password')}
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={12}
                      value={form.password}
                      onChange={set('password')}
                    />
                  )}
                </Field>
                <Field label="Country" required error={fieldError('country')}>
                  {(props) => (
                    <TextInput
                      {...props}
                      required
                      autoComplete="country-name"
                      value={form.country}
                      onChange={set('country')}
                    />
                  )}
                </Field>
                <Field label="State or province" error={fieldError('region')}>
                  {(props) => <TextInput {...props} value={form.region} onChange={set('region')} />}
                </Field>
                <Field label="Website" error={fieldError('website')}>
                  {(props) => (
                    <UrlInput
                      {...props}
                      placeholder="https://"
                      value={form.website}
                      onChange={set('website')}
                    />
                  )}
                </Field>
                <Field
                  label="Instagram or main social profile"
                  error={fieldError('socialProfiles')}
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      placeholder="https://instagram.com/…"
                      value={form.instagram}
                      onChange={set('instagram')}
                    />
                  )}
                </Field>
              </div>

              <Checkbox
                checked={isOfAge}
                onChange={(event) => setIsOfAge(event.target.checked)}
                label="I am 18 or older, or I have a parent or guardian who will sign with me."
                description="Agreements signed by a minor need a guardian. Altar.Camp handles that case in person."
              />

              <Button type="submit" size="lg" disabled={pending || !isOfAge}>
                {pending ? 'Creating your account…' : 'Create account'}
              </Button>

              <p className="text-sm text-ink-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-ember-700 hover:text-ember-800">
                  Sign in
                </Link>
                .
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
