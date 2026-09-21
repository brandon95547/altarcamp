import {
  EDUCATION_LESSONS,
  EDUCATION_PASS_THRESHOLD,
  lessonBySlug,
  MISSION_QUESTIONS,
  RIGHTS_QUESTIONS,
  type ApplicationStatus,
  type DealPath,
  type OnboardingStep,
} from '@altar/shared';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { badRequest, notFound } from '../../lib/errors.js';

export interface ArtistRecord {
  id: string;
  user_id: string;
  artist_name: string;
  legal_name: string;
  email: string;
  country: string;
  region: string | null;
  website: string | null;
  onboarding_step: OnboardingStep;
  deal_path: DealPath | null;
  application_status: ApplicationStatus | null;
  created_at: string;
}

export async function getArtist(artistId: string): Promise<ArtistRecord> {
  const artist = await queryOne<ArtistRecord>(
    `SELECT a.id, a.user_id, a.artist_name, u.legal_name, u.email, a.country, a.region,
            a.website, a.onboarding_step, a.deal_path, a.application_status, a.created_at
       FROM artists a JOIN users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [artistId],
  );
  if (!artist) throw notFound('Artist not found.');
  return artist;
}

export async function getProfile(artistId: string) {
  const profile = await queryOne(
    `SELECT bio, photo_url, genre, influences, mission_interests, music_links,
            current_distributor, current_label, current_publisher, pro_affiliation,
            management_name, management_email, attorney_name, attorney_email
       FROM artist_profiles WHERE artist_id = $1`,
    [artistId],
  );
  const socials = await query(
    `SELECT platform, url FROM artist_social_profiles WHERE artist_id = $1 ORDER BY platform`,
    [artistId],
  );
  return { profile, socials };
}

export async function saveProfile(artistId: string, input: Record<string, unknown>): Promise<void> {
  await withTransaction(async (client) => {
    await query(
      `UPDATE artist_profiles SET
         bio = COALESCE($2, bio),
         photo_url = COALESCE($3, photo_url),
         genre = COALESCE($4, genre),
         influences = COALESCE($5, influences),
         mission_interests = COALESCE($6, mission_interests),
         music_links = COALESCE($7, music_links),
         current_distributor = COALESCE($8, current_distributor),
         current_label = COALESCE($9, current_label),
         current_publisher = COALESCE($10, current_publisher),
         pro_affiliation = COALESCE($11, pro_affiliation),
         management_name = COALESCE($12, management_name),
         management_email = COALESCE($13, management_email),
         attorney_name = COALESCE($14, attorney_name),
         attorney_email = COALESCE($15, attorney_email),
         updated_at = now()
       WHERE artist_id = $1`,
      [
        artistId,
        input['bio'] ?? null,
        input['photoUrl'] ?? null,
        input['genre'] ?? null,
        input['influences'] ?? null,
        input['missionInterests'] ?? null,
        input['musicLinks'] ? JSON.stringify(input['musicLinks']) : null,
        input['currentDistributor'] ?? null,
        input['currentLabel'] ?? null,
        input['currentPublisher'] ?? null,
        input['proAffiliation'] ?? null,
        input['managementName'] ?? null,
        input['managementEmail'] ?? null,
        input['attorneyName'] ?? null,
        input['attorneyEmail'] ?? null,
      ],
      client,
    );
    await advanceOnboarding(artistId, 'existing_rights', client);
  });
}

/**
 * Onboarding only ever moves forward. An artist revisiting their profile after signing
 * should not be dragged back to step two.
 */
const STEP_ORDER: OnboardingStep[] = [
  'account',
  'profile',
  'existing_rights',
  'education',
  'choose_path',
];

export async function advanceOnboarding(
  artistId: string,
  step: OnboardingStep,
  client?: Parameters<typeof query>[2],
): Promise<void> {
  await query(
    `UPDATE artists SET onboarding_step = $2::onboarding_step, updated_at = now()
      WHERE id = $1
        AND array_position($3::text[], onboarding_step::text) < array_position($3::text[], $2)`,
    [artistId, step, STEP_ORDER],
    client,
  );
}

export async function saveRightsDisclosures(
  artistId: string,
  answers: { key: string; answer: boolean; detail?: string }[],
): Promise<{ conflicts: string[] }> {
  const conflicts: string[] = [];
  await withTransaction(async (client) => {
    for (const answer of answers) {
      const question = RIGHTS_QUESTIONS.find((candidate) => candidate.key === answer.key);
      if (!question) throw badRequest(`Unknown question: ${answer.key}`);
      const hasConflict = answer.answer === question.conflictWhen;
      if (hasConflict) conflicts.push(question.key);
      await query(
        `INSERT INTO rights_disclosures (artist_id, question_key, answer, detail, has_conflict)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (artist_id, question_key)
         DO UPDATE SET answer = EXCLUDED.answer, detail = EXCLUDED.detail,
                       has_conflict = EXCLUDED.has_conflict, reviewed_at = NULL, reviewed_by = NULL`,
        [artistId, answer.key, answer.answer, answer.detail ?? null, hasConflict],
        client,
      );
    }
    await advanceOnboarding(artistId, 'education', client);
  });
  return { conflicts };
}

export async function getRightsDisclosures(artistId: string) {
  return query<{
    question_key: string;
    answer: boolean;
    detail: string | null;
    has_conflict: boolean;
    reviewed_at: string | null;
  }>(
    `SELECT question_key, answer, detail, has_conflict, reviewed_at
       FROM rights_disclosures WHERE artist_id = $1`,
    [artistId],
  );
}

/** Unreviewed conflicts block agreement generation — spec §34. */
export async function hasOpenRightsConflict(artistId: string): Promise<{
  label: boolean;
  distribution: boolean;
  publishing: boolean;
}> {
  const rows = await query<{
    question_key: string;
    has_conflict: boolean;
    reviewed_at: string | null;
  }>(
    `SELECT question_key, has_conflict, reviewed_at FROM rights_disclosures
      WHERE artist_id = $1 AND has_conflict = TRUE AND reviewed_at IS NULL`,
    [artistId],
  );
  const keys = new Set(rows.map((row) => row.question_key));
  return {
    label: keys.has('signed_to_label'),
    distribution: keys.has('exclusive_distribution'),
    publishing: keys.has('publishing_agreement'),
  };
}

export async function recordEducationAnswer(
  artistId: string,
  lessonSlug: string,
  selectedOptionId: string,
): Promise<{ isCorrect: boolean; explanation: string; completed: boolean; correctCount: number }> {
  const lesson = lessonBySlug(lessonSlug);
  if (!lesson) throw notFound('That lesson does not exist.');
  const isCorrect = lesson.check.correctOptionId === selectedOptionId;

  await query(
    `INSERT INTO education_progress (artist_id, lesson_slug, selected_option_id, is_correct)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (artist_id, lesson_slug)
     DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id,
                   is_correct = EXCLUDED.is_correct, completed_at = now()`,
    [artistId, lessonSlug, selectedOptionId, isCorrect],
  );

  const progress = await getEducationProgress(artistId);
  if (progress.completed) {
    await advanceOnboarding(artistId, 'choose_path');
  }
  return {
    isCorrect,
    explanation: lesson.check.explanation,
    completed: progress.completed,
    correctCount: progress.correctCount,
  };
}

export async function getEducationProgress(artistId: string) {
  const rows = await query<{
    lesson_slug: string;
    selected_option_id: string;
    is_correct: boolean;
  }>(
    `SELECT lesson_slug, selected_option_id, is_correct FROM education_progress WHERE artist_id = $1`,
    [artistId],
  );
  const correctCount = rows.filter((row) => row.is_correct).length;
  return {
    answers: rows,
    correctCount,
    total: EDUCATION_LESSONS.length,
    // Passing means getting most of them right, and every lesson attempted.
    completed: rows.length === EDUCATION_LESSONS.length && correctCount >= EDUCATION_PASS_THRESHOLD,
  };
}

export async function choosePath(artistId: string, path: DealPath): Promise<void> {
  const progress = await getEducationProgress(artistId);
  if (!progress.completed) {
    throw badRequest(
      'Finish the short orientation first — it takes about five minutes, and it is what makes the rest of this make sense.',
    );
  }
  await withTransaction(async (client) => {
    await query(
      `UPDATE artists SET deal_path = $2::deal_path, onboarding_step = 'choose_path',
              application_status = CASE WHEN $2::deal_path = 'one_year'
                                        THEN 'started'::application_status ELSE NULL END,
              updated_at = now()
        WHERE id = $1`,
      [artistId, path],
      client,
    );
    if (path === 'one_year') {
      await query(
        `INSERT INTO mission_applications (artist_id, status) VALUES ($1, 'started')
         ON CONFLICT (artist_id) DO NOTHING`,
        [artistId],
        client,
      );
    }
  });
}

export async function getMissionApplication(artistId: string) {
  const application = await queryOne<{
    id: string;
    status: ApplicationStatus;
    submitted_at: string | null;
    review_notes: string | null;
    interview_at: string | null;
  }>(
    `SELECT id, status, submitted_at, review_notes, interview_at
       FROM mission_applications WHERE artist_id = $1`,
    [artistId],
  );
  if (!application) return null;
  const answers = await query<{ question_key: string; value: string }>(
    `SELECT question_key, value FROM mission_answers WHERE application_id = $1`,
    [application.id],
  );
  return { ...application, answers };
}

export async function saveMissionAnswers(
  artistId: string,
  answers: { key: string; value: string }[],
  submit: boolean,
): Promise<{ status: ApplicationStatus }> {
  const application = await queryOne<{ id: string; status: ApplicationStatus }>(
    `SELECT id, status FROM mission_applications WHERE artist_id = $1`,
    [artistId],
  );
  if (!application)
    throw badRequest('Choose the one-year path before filling in a mission profile.');

  return withTransaction(async (client) => {
    for (const answer of answers) {
      if (!MISSION_QUESTIONS.some((question) => question.key === answer.key)) {
        throw badRequest(`Unknown question: ${answer.key}`);
      }
      await query(
        `INSERT INTO mission_answers (application_id, question_key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (application_id, question_key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [application.id, answer.key, answer.value],
        client,
      );
    }

    let status = application.status;
    if (submit) {
      const saved = await query<{ question_key: string; value: string }>(
        `SELECT question_key, value FROM mission_answers WHERE application_id = $1`,
        [application.id],
        client,
      );
      const answered = new Map(saved.map((row) => [row.question_key, row.value.trim()]));
      const missing = MISSION_QUESTIONS.filter(
        (question) => question.required && !answered.get(question.key),
      );
      if (missing.length > 0) {
        throw badRequest(
          `Still to answer: ${missing.map((question) => question.question).join(' ')}`,
        );
      }
      status = 'altar_review';
      await query(
        `UPDATE mission_applications SET status = 'altar_review', submitted_at = now(), updated_at = now()
          WHERE id = $1`,
        [application.id],
        client,
      );
      await query(
        `UPDATE artists SET application_status = 'altar_review', updated_at = now() WHERE id = $1`,
        [artistId],
        client,
      );
    }
    return { status };
  });
}
