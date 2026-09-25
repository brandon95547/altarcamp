import { ButtonLink } from '../../components/ui/Button.js';

export function NotFoundPage() {
  return (
    <div className="altar-container py-24 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-ember-600">404</p>
      <h1 className="mt-3 text-3xl">That page is not here</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-700">
        The link may be old, or the page may have moved. Nothing you have signed or saved is
        affected.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink to="/">Back to the start</ButtonLink>
        <ButtonLink to="/dashboard" variant="secondary">
          My dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
