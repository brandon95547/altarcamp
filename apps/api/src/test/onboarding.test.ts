import { EDUCATION_LESSONS } from '@altar/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestClient, uniqueEmail } from './client.js';

let client: TestClient;

beforeAll(async () => {
  client = await TestClient.create();
});

afterAll(async () => {
  await client?.close();
});

async function signUp(email = uniqueEmail()) {
  const response = await client.post<{ user: { id: string; artistId: string } }>(
    '/api/auth/signup',
    {
      legalName: 'Tamsin Oyelaran',
      artistName: 'Tamsin O',
      email,
      password: 'correct horse battery staple',
      country: 'United States',
      region: 'Tennessee',
      isOfAge: true,
    },
  );
  return response;
}

async function completeEducation() {
  for (const lesson of EDUCATION_LESSONS) {
    await client.post('/api/artists/me/education', {
      lessonSlug: lesson.slug,
      selectedOptionId: lesson.check.correctOptionId,
    });
  }
}

describe('signing up', () => {
  it('creates the account and the artist together', async () => {
    const response = await signUp();
    expect(response.status).toBe(201);
    expect(response.body.user.artistId).toBeTruthy();

    const me = await client.get<{ artist: { onboarding_step: string } }>('/api/artists/me');
    expect(me.status).toBe(200);
    expect(me.body.artist.onboarding_step).toBe('profile');
  });

  it('refuses a duplicate email without revealing anything else', async () => {
    const email = uniqueEmail();
    await signUp(email);
    const second = await signUp(email);
    expect(second.status).toBe(409);
  });

  it('refuses a short password', async () => {
    const response = await client.post('/api/auth/signup', {
      legalName: 'Short Password',
      artistName: 'SP',
      email: uniqueEmail(),
      password: 'short',
      country: 'United States',
      isOfAge: true,
    });
    expect(response.status).toBe(400);
  });
});

describe('the orientation gate', () => {
  it('will not let an artist choose a path before completing it', async () => {
    await signUp();
    const response = await client.post<{ error: { message: string } }>('/api/artists/me/path', {
      path: 'single_song',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('orientation');
  });

  it('opens the choice once the orientation is passed', async () => {
    await signUp();
    await completeEducation();

    const progress = await client.get<{ education: { completed: boolean; correctCount: number } }>(
      '/api/artists/me',
    );
    expect(progress.body.education.completed).toBe(true);
    expect(progress.body.education.correctCount).toBe(EDUCATION_LESSONS.length);

    const chosen = await client.post('/api/artists/me/path', { path: 'single_song' });
    expect(chosen.status).toBe(200);
  });

  it('tells the artist why a wrong answer was wrong', async () => {
    await signUp();
    const lesson = EDUCATION_LESSONS[0]!;
    const wrong = lesson.check.options.find(
      (option) => option.id !== lesson.check.correctOptionId,
    )!;
    const response = await client.post<{ isCorrect: boolean; explanation: string }>(
      '/api/artists/me/education',
      { lessonSlug: lesson.slug, selectedOptionId: wrong.id },
    );
    expect(response.body.isCorrect).toBe(false);
    expect(response.body.explanation.length).toBeGreaterThan(10);
  });
});

describe('existing rights disclosure', () => {
  it('flags a conflict and blocks the deal until staff review it', async () => {
    await signUp();
    const response = await client.put<{ conflicts: string[] }>('/api/artists/me/existing-rights', {
      answers: [
        { key: 'signed_to_label', answer: true, detail: 'Another Label Inc' },
        { key: 'exclusive_distribution', answer: false },
        { key: 'publishing_agreement', answer: false },
        { key: 'management_agreement', answer: false },
        { key: 'owns_masters', answer: true },
        { key: 'controls_songwriting', answer: true },
      ],
    });
    expect(response.status).toBe(200);
    expect(response.body.conflicts).toContain('signed_to_label');
  });

  it('records "no" to owning your masters as a conflict too', async () => {
    await signUp();
    const response = await client.put<{ conflicts: string[] }>('/api/artists/me/existing-rights', {
      answers: [
        { key: 'signed_to_label', answer: false },
        { key: 'exclusive_distribution', answer: false },
        { key: 'publishing_agreement', answer: false },
        { key: 'management_agreement', answer: false },
        { key: 'owns_masters', answer: false },
        { key: 'controls_songwriting', answer: true },
      ],
    });
    expect(response.body.conflicts).toContain('owns_masters');
  });
});

describe('sessions', () => {
  it('rejects an unauthenticated request for artist data', async () => {
    const anonymous = await TestClient.create();
    const response = await anonymous.get('/api/artists/me');
    expect(response.status).toBe(401);
    await anonymous.close();
  });

  it('ends the session on sign out', async () => {
    await signUp();
    await client.post('/api/auth/logout');
    const response = await client.get<{ user: unknown }>('/api/auth/me');
    expect(response.body.user).toBeNull();
  });

  it('keeps administrators out of the artist-only endpoints and vice versa', async () => {
    const staff = await TestClient.create();
    await staff.post('/api/auth/login', {
      email: 'admin@altar.test',
      password: 'TestAdminPassword!2026',
    });
    const overview = await staff.get('/api/admin/overview');
    expect(overview.status).toBe(200);
    const artistOnly = await staff.get('/api/artists/me');
    expect(artistOnly.status).toBe(403);
    await staff.close();

    await signUp();
    const artistAttempt = await client.get('/api/admin/overview');
    expect(artistAttempt.status).toBe(403);
  });
});
