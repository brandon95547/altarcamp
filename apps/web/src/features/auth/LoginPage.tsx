import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Field, TextInput } from '../../components/ui/Field.js';
import { ApiError } from '../../lib/api.js';
import { isStaff, useAuth } from '../../lib/auth.js';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (isStaff(user) ? '/admin' : '/dashboard'), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="altar-container flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl">Sign in</h1>
        <p className="mt-2 text-ink-700">
          Your agreements, splits and documents are where you left them.
        </p>

        <Card className="mt-6">
          <CardBody>
            <form onSubmit={submit} className="grid gap-4">
              {error ? <Callout tone="blocker">{error}</Callout> : null}

              <Field label="Email">
                {(props) => (
                  <TextInput
                    {...props}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                )}
              </Field>

              <Field label="Password">
                {(props) => (
                  <TextInput
                    {...props}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                )}
              </Field>

              <Button type="submit" size="lg" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="mt-5 text-ink-700">
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-ember-700 hover:text-ember-800">
            Create one
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
