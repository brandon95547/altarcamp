import { EDUCATION_LESSONS } from '@altar/shared';
import { ArrowRight, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardFooter, CardHeader } from '../../components/ui/Card.js';
import { Stepper } from '../../components/ui/Misc.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { onboardingSteps } from './steps.js';

interface AnswerResult {
  isCorrect: boolean;
  explanation: string;
  completed: boolean;
  correctCount: number;
}

/** Spec §7 — the orientation. Passing it is what unlocks choosing a path. */
export function EducationPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, setPending] = useState(false);

  const lesson = EDUCATION_LESSONS[index];
  if (!lesson) return null;

  const answer = async (optionId: string) => {
    setSelected(optionId);
    setPending(true);
    try {
      const response = await api.post<AnswerResult>('/artists/me/education', {
        lessonSlug: lesson.slug,
        selectedOptionId: optionId,
      });
      setResult(response);
    } finally {
      setPending(false);
    }
  };

  const next = () => {
    if (index + 1 < EDUCATION_LESSONS.length) {
      setIndex(index + 1);
      setSelected(null);
      setResult(null);
    } else {
      navigate('/onboarding/choose-path');
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Stepper steps={onboardingSteps('education')} currentIndex={3} />

      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Orientation</h1>
        <span className="text-sm font-medium text-ink-600">
          {index + 1} of {EDUCATION_LESSONS.length}
        </span>
      </div>
      <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full rounded-full bg-ember-500 transition-all"
          style={{ width: `${((index + (result ? 1 : 0)) / EDUCATION_LESSONS.length) * 100}%` }}
        />
      </div>

      <Card>
        <CardHeader title={lesson.title} description={lesson.summary} />
        <CardBody className="grid gap-4">
          {lesson.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-ink-800">
              {paragraph}
            </p>
          ))}

          {lesson.terms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-ink-50 px-4 py-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                Terms here
              </span>
              {lesson.terms.map((term) => (
                <Term key={term} termKey={term} />
              ))}
            </div>
          ) : null}
        </CardBody>

        <CardFooter className="block">
          <fieldset className="w-full">
            <legend className="mb-3 font-medium text-ink-950">{lesson.check.prompt}</legend>
            <div className="grid gap-2">
              {lesson.check.options.map((option) => {
                const chosen = selected === option.id;
                const isRight = result && option.id === lesson.check.correctOptionId;
                const isWrongChoice = result && chosen && !result.isCorrect;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(result) || pending}
                    onClick={() => answer(option.id)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      !result && 'border-ink-300 bg-white hover:bg-ink-50',
                      isRight && 'border-moss-500 bg-moss-50 text-moss-900',
                      isWrongChoice && 'border-clay-500 bg-clay-50 text-clay-900',
                      result &&
                        !isRight &&
                        !isWrongChoice &&
                        'border-ink-200 bg-white text-ink-600',
                    )}
                  >
                    <span>{option.label}</span>
                    {isRight ? <Check className="size-5 shrink-0" aria-hidden /> : null}
                    {isWrongChoice ? <X className="size-5 shrink-0" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {result ? (
            <div className="mt-4 w-full">
              <Callout
                tone={result.isCorrect ? 'success' : 'info'}
                title={result.isCorrect ? 'That is right' : 'Worth knowing'}
              >
                {result.explanation}
              </Callout>
              <Button className="mt-4" size="lg" onClick={next}>
                {index + 1 < EDUCATION_LESSONS.length ? 'Next lesson' : 'Choose your path'}
                <ArrowRight className="size-5" aria-hidden />
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
