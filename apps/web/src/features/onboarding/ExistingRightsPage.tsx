import { RIGHTS_CONFLICT_WARNING, RIGHTS_QUESTIONS } from '@altar/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { TextInput } from '../../components/ui/Field.js';
import { Stepper } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { useMutation } from '../../lib/useApi.js';
import { onboardingSteps } from './steps.js';

type Answers = Record<string, { answer: boolean | null; detail: string }>;

/** Spec §6 step 3 — the questions that stop two agreements colliding. */
export function ExistingRightsPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>(
    Object.fromEntries(
      RIGHTS_QUESTIONS.map((question) => [question.key, { answer: null, detail: '' }]),
    ),
  );

  const save = useMutation(async (payload: { key: string; answer: boolean; detail?: string }[]) =>
    api.put<{ conflicts: string[] }>('/artists/me/existing-rights', { answers: payload }),
  );

  const unanswered = RIGHTS_QUESTIONS.filter((question) => answers[question.key]?.answer === null);
  const conflicts = RIGHTS_QUESTIONS.filter(
    (question) => answers[question.key]?.answer === question.conflictWhen,
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = RIGHTS_QUESTIONS.map((question) => ({
      key: question.key,
      answer: Boolean(answers[question.key]?.answer),
      detail: answers[question.key]?.detail || undefined,
    }));
    const result = await save.run(payload);
    if (result) navigate('/onboarding/education');
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Stepper steps={onboardingSteps('existing_rights')} currentIndex={2} />
      <h1 className="text-3xl sm:text-4xl">What do you already have in place?</h1>
      <p className="mt-2 text-ink-700">
        You can work with a label, a distributor, a publisher and a PRO at the same time. The damage
        comes from two of them claiming the same right. Answer honestly — an existing agreement is
        not a problem, an undisclosed one is.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-4">
        {save.error ? <Callout tone="blocker">{save.error.message}</Callout> : null}

        {RIGHTS_QUESTIONS.map((question) => {
          const state = answers[question.key] ?? { answer: null, detail: '' };
          const isConflict = state.answer === question.conflictWhen;
          return (
            <Card key={question.key}>
              <CardBody>
                <fieldset>
                  <legend className="text-lg font-medium text-ink-950">{question.question}</legend>
                  <div className="mt-3 flex gap-2">
                    {[
                      { value: true, label: 'Yes' },
                      { value: false, label: 'No' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.key]: { ...state, answer: option.value },
                          }))
                        }
                        className={
                          state.answer === option.value
                            ? 'h-10 min-w-20 rounded-lg bg-ink-950 px-4 font-medium text-ink-50'
                            : 'h-10 min-w-20 rounded-lg border border-ink-300 bg-white px-4 font-medium text-ink-800 hover:bg-ink-50'
                        }
                        aria-pressed={state.answer === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {isConflict ? (
                    <div className="mt-4 grid gap-3">
                      <Callout tone="warning">{question.conflictNote}</Callout>
                      {question.followUpLabel ? (
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-medium text-ink-900">
                            {question.followUpLabel}
                          </span>
                          <TextInput
                            value={state.detail}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.key]: { ...state, detail: event.target.value },
                              }))
                            }
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
              </CardBody>
            </Card>
          );
        })}

        {conflicts.length > 0 ? (
          <Callout tone="warning" title="Altar.Camp will review this first">
            {RIGHTS_CONFLICT_WARNING}
          </Callout>
        ) : null}

        <div>
          <Button type="submit" size="lg" disabled={save.pending || unanswered.length > 0}>
            {save.pending ? 'Saving…' : 'Save and continue'}
          </Button>
          {unanswered.length > 0 ? (
            <p className="mt-2 text-sm text-ink-600">
              {unanswered.length} {unanswered.length === 1 ? 'question' : 'questions'} still to
              answer.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
