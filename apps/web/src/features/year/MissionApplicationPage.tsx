import { MISSION_QUESTIONS } from '@altar/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Field, RadioGroup, TextArea, TextInput } from '../../components/ui/Field.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { useMutation, useQuery } from '../../lib/useApi.js';

/** Spec §14 — the mission profile that feeds Altar.Camp's internal approval workflow. */
export function MissionApplicationPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{
    application: { status: string; answers: { question_key: string; value: string }[] } | null;
  }>('/artists/me/mission-application');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.application) {
      setAnswers(
        Object.fromEntries(
          data.application.answers.map((answer) => [answer.question_key, answer.value]),
        ),
      );
    }
  }, [data]);

  const save = useMutation(async (submit: boolean) =>
    api.put('/artists/me/mission-application', {
      submit,
      answers: MISSION_QUESTIONS.map((question) => ({
        key: question.key,
        value: answers[question.key] ?? '',
      })),
    }),
  );

  if (loading) return <Spinner />;

  const submitted = data?.application && data.application.status !== 'started';
  const missing = MISSION_QUESTIONS.filter(
    (question) => question.required && !(answers[question.key] ?? '').trim(),
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="One year"
        title="Your mission profile"
        description="Answer honestly rather than impressively. This is what Altar.Camp reads before proposing anything, and a year that does not fit your life helps nobody."
      />

      {submitted ? (
        <Callout tone="success" className="mb-6" title="Submitted">
          Altar.Camp has your profile. You can still change your answers until terms are proposed.
        </Callout>
      ) : null}

      {save.error ? (
        <Callout tone="blocker" className="mb-6">
          {save.error.message}
        </Callout>
      ) : null}

      <div className="grid gap-4">
        {MISSION_QUESTIONS.map((question) => (
          <Card key={question.key}>
            <CardBody>
              <Field
                label={question.question}
                hint={question.helpText}
                required={question.required}
              >
                {(props) =>
                  question.kind === 'yes_no' ? (
                    <RadioGroup
                      name={question.key}
                      value={(answers[question.key] as 'yes' | 'no' | undefined) ?? null}
                      onChange={(value) => setAnswers({ ...answers, [question.key]: value })}
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                    />
                  ) : question.kind === 'long_text' ? (
                    <TextArea
                      {...props}
                      rows={4}
                      value={answers[question.key] ?? ''}
                      onChange={(event) =>
                        setAnswers({ ...answers, [question.key]: event.target.value })
                      }
                    />
                  ) : (
                    <TextInput
                      {...props}
                      value={answers[question.key] ?? ''}
                      onChange={(event) =>
                        setAnswers({ ...answers, [question.key]: event.target.value })
                      }
                    />
                  )
                }
              </Field>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={save.pending || missing.length > 0}
          onClick={async () => {
            const result = await save.run(true);
            // The year page opens its "you're done for now" dialog from this state.
            if (result) navigate('/year', { state: { submitted: true } });
          }}
        >
          {save.pending ? 'Sending…' : 'Submit to Altar.Camp'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          disabled={save.pending}
          onClick={async () => {
            await save.run(false);
          }}
        >
          Save for later
        </Button>
        {missing.length > 0 ? (
          <p className="text-sm text-ink-600">
            {missing.length} {missing.length === 1 ? 'answer' : 'answers'} still needed before
            submitting.
          </p>
        ) : null}
      </div>
    </div>
  );
}
