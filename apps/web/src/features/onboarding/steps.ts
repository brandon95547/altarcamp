import type { OnboardingStep } from '@altar/shared';

export const ONBOARDING_ROUTE: Record<OnboardingStep, string> = {
  account: '/signup',
  profile: '/onboarding/profile',
  existing_rights: '/onboarding/existing-rights',
  education: '/onboarding/education',
  choose_path: '/onboarding/choose-path',
};

export const ONBOARDING_STEP_LABELS = [
  { key: 'account', label: 'Account' },
  { key: 'profile', label: 'Profile' },
  { key: 'existing_rights', label: 'Existing rights' },
  { key: 'education', label: 'Orientation' },
  { key: 'choose_path', label: 'Choose your path' },
] as const;

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEP_LABELS.findIndex((candidate) => candidate.key === step);
}

export function onboardingSteps(current: OnboardingStep) {
  const index = stepIndex(current);
  return ONBOARDING_STEP_LABELS.map((step, position) => ({
    label: step.label,
    complete: position < index,
  }));
}
