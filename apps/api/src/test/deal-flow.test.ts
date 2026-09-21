import { EDUCATION_LESSONS, percentToBps } from '@altar/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SIGNING_AFFIRMATION_KEYS, TestClient, uniqueEmail } from './client.js';

let client: TestClient;

interface SongDealResponse {
  song: { id: string; status: string };
  contributors: { id: string; legal_name: string; role: string; requires_approval: boolean }[];
  issues: { code: string; severity: string; message: string }[];
}

interface AgreementResponse {
  agreement: { id: string; status: string };
  version: {
    version: number;
    document_hash: string;
    rendered_legal: string;
    rendered_simple: string;
  };
  signers: { id: string; name: string; party: string; signed_at: string | null }[];
}

/** An artist who has completed onboarding and is ready to build a deal. */
async function readyArtist(): Promise<void> {
  await client.post('/api/auth/signup', {
    legalName: 'Jesse Hart',
    artistName: 'River & Rule',
    email: uniqueEmail('jesse'),
    password: 'correct horse battery staple',
    country: 'United States',
    isOfAge: true,
  });
  await client.put('/api/artists/me/existing-rights', {
    answers: [
      { key: 'signed_to_label', answer: false },
      { key: 'exclusive_distribution', answer: false },
      { key: 'publishing_agreement', answer: false },
      { key: 'management_agreement', answer: false },
      { key: 'owns_masters', answer: true },
      { key: 'controls_songwriting', answer: true },
    ],
  });
  for (const lesson of EDUCATION_LESSONS) {
    await client.post('/api/artists/me/education', {
      lessonSlug: lesson.slug,
      selectedOptionId: lesson.check.correctOptionId,
    });
  }
  await client.post('/api/artists/me/path', { path: 'single_song' });
}

/** A complete, signable single-song deal. Returns the song id. */
async function buildDeal(): Promise<{
  songId: string;
  artistContributorId: string;
  writerId: string;
}> {
  const created = await client.post<{ song: { id: string } }>('/api/songs', {
    title: 'Amazing Grace Again',
    recordingStatus: 'mixing',
    collaborationType: 'artist_altar',
  });
  const songId = created.body.song.id;

  const writer = await client.post<{ contributor: { id: string } }>(
    `/api/songs/${songId}/contributors`,
    {
      legalName: 'Mary Jones',
      email: 'mary@example.test',
      role: 'songwriter',
      proAffiliation: 'ASCAP',
    },
  );
  const writerId = writer.body.contributor.id;

  const deal = await client.get<SongDealResponse>(`/api/songs/${songId}`);
  const artistContributorId = deal.body.contributors.find(
    (contributor) => contributor.role === 'primary_artist',
  )!.id;

  await client.put(`/api/songs/${songId}/splits`, {
    rightType: 'composition',
    lines: [
      {
        participantId: artistContributorId,
        participantName: 'River & Rule',
        bps: percentToBps(75),
      },
      { participantId: writerId, participantName: 'Mary Jones', bps: percentToBps(25) },
    ],
  });

  await client.put(`/api/songs/${songId}/splits`, {
    rightType: 'master',
    masterStructure: 'shared',
    lines: [
      {
        participantId: artistContributorId,
        participantName: 'River & Rule',
        bps: percentToBps(50),
      },
      { participantId: 'altar', participantName: 'Altar.Camp', bps: percentToBps(50) },
    ],
  });

  await client.put(`/api/songs/${songId}/revenue-splits`, {
    splits: [
      {
        category: 'master_streaming',
        lines: [
          {
            participantId: artistContributorId,
            participantName: 'River & Rule',
            bps: percentToBps(50),
          },
          { participantId: 'altar', participantName: 'Altar.Camp', bps: percentToBps(50) },
        ],
      },
      {
        category: 'publishing',
        lines: [
          {
            participantId: artistContributorId,
            participantName: 'River & Rule',
            bps: percentToBps(75),
          },
          { participantId: writerId, participantName: 'Mary Jones', bps: percentToBps(25) },
        ],
      },
    ],
  });

  await client.put(`/api/songs/${songId}/recoupment`, {
    payer: 'altar',
    recoupable: true,
    recoupedFrom: 'master_revenue',
    artistPersonallyLiable: false,
    afterRecoupment: 'Revenue splits at the agreed percentages.',
    investmentCapMinor: 500_000,
    plannedExpenses: [
      {
        category: 'recording',
        description: 'Four days tracking',
        amountMinor: 180_000,
        recoupable: true,
      },
    ],
    acknowledged: true,
  });

  return { songId, artistContributorId, writerId };
}

async function approveWriter(songId: string, writerId: string): Promise<void> {
  const invite = await client.post<{ token: string }>(
    `/api/songs/${songId}/contributors/${writerId}/invite`,
    {},
  );
  const anonymous = await TestClient.create();
  await anonymous.post(`/api/invitations/${invite.body.token}/respond`, { action: 'accept' });
  await anonymous.close();
}

beforeAll(async () => {
  client = await TestClient.create();
});

afterAll(async () => {
  await client?.close();
});

describe('split rules', () => {
  it('refuses a songwriting split that does not total 100%', async () => {
    await readyArtist();
    const created = await client.post<{ song: { id: string } }>('/api/songs', {
      title: 'Short Split',
    });
    const songId = created.body.song.id;
    const deal = await client.get<SongDealResponse>(`/api/songs/${songId}`);
    const artistId = deal.body.contributors[0]!.id;

    const response = await client.put<{ error: { code: string; message: string } }>(
      `/api/songs/${songId}/splits`,
      {
        rightType: 'composition',
        lines: [
          { participantId: artistId, participantName: 'River & Rule', bps: percentToBps(90) },
        ],
      },
    );
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('10% is unassigned');
  });

  it('refuses someone who is not on the song', async () => {
    await readyArtist();
    const created = await client.post<{ song: { id: string } }>('/api/songs', {
      title: 'Stranger',
    });
    const response = await client.put(`/api/songs/${created.body.song.id}/splits`, {
      rightType: 'composition',
      lines: [
        {
          participantId: '11111111-1111-4111-8111-111111111111',
          participantName: 'Nobody',
          bps: percentToBps(100),
        },
      ],
    });
    expect(response.status).toBe(400);
  });

  it('keeps master and songwriting as separate records', async () => {
    await readyArtist();
    const { songId } = await buildDeal();
    const deal = await client.get<
      SongDealResponse & {
        masterSplits: { bps: number }[];
        compositionSplits: { bps: number }[];
      }
    >(`/api/songs/${songId}`);
    expect(deal.body.masterSplits.map((line) => line.bps)).toEqual([5000, 5000]);
    expect(deal.body.compositionSplits.map((line) => line.bps)).toEqual([7500, 2500]);
  });
});

describe('generating an agreement', () => {
  it('refuses while a collaborator has not approved their share', async () => {
    await readyArtist();
    const { songId } = await buildDeal();

    const response = await client.post<{ error: { code: string; details: { message: string }[] } }>(
      '/api/agreements',
      { type: 'single_song_collaboration', songId },
    );
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('deal_not_ready');
    expect(
      response.body.error.details.some((detail) => detail.message.includes('Mary Jones')),
    ).toBe(true);
  });

  it('refuses while the expense terms have not been acknowledged', async () => {
    await readyArtist();
    const { songId, writerId } = await buildDeal();
    await approveWriter(songId, writerId);
    await client.put(`/api/songs/${songId}/recoupment`, {
      payer: 'altar',
      recoupable: true,
      recoupedFrom: 'master_revenue',
      artistPersonallyLiable: false,
      afterRecoupment: '',
      investmentCapMinor: null,
      plannedExpenses: [],
      acknowledged: false,
    });

    // Acknowledgement is never withdrawn once given, so this song is still signable —
    // the rule under test is that a song which never acknowledged cannot generate.
    const fresh = await client.post<{ song: { id: string } }>('/api/songs', {
      title: 'Unacknowledged',
    });
    const response = await client.post<{ error: { details: { message: string }[] } }>(
      '/api/agreements',
      {
        type: 'single_song_collaboration',
        songId: fresh.body.song.id,
      },
    );
    expect(response.status).toBe(422);
    expect(
      response.body.error.details.some((detail) => detail.message.includes('recoupment terms')),
    ).toBe(true);
  });

  it('generates all three views and a document hash once everything adds up', async () => {
    await readyArtist();
    const { songId, writerId } = await buildDeal();
    await approveWriter(songId, writerId);

    const generated = await client.post<{ agreementId: string }>('/api/agreements', {
      type: 'single_song_collaboration',
      songId,
    });
    expect(generated.status).toBe(201);

    const agreement = await client.get<AgreementResponse>(
      `/api/agreements/${generated.body.agreementId}`,
    );
    expect(agreement.body.version.document_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(agreement.body.version.rendered_simple).toContain('Amazing Grace Again');
    expect(agreement.body.version.rendered_legal).toContain('SINGLE SONG COLLABORATION AGREEMENT');
    // No unresolved template tokens ever reach a document someone signs.
    expect(agreement.body.version.rendered_legal).not.toMatch(/\{\{[a-z_]+\}\}/);
    expect(agreement.body.signers.map((signer) => signer.party)).toContain('altar');
  });
});

describe('signing', () => {
  async function signableAgreement(): Promise<{
    agreementId: string;
    songId: string;
    hash: string;
  }> {
    await readyArtist();
    const { songId, writerId } = await buildDeal();
    await approveWriter(songId, writerId);
    const generated = await client.post<{ agreementId: string }>('/api/agreements', {
      type: 'single_song_collaboration',
      songId,
    });
    const agreement = await client.get<AgreementResponse>(
      `/api/agreements/${generated.body.agreementId}`,
    );
    return {
      agreementId: generated.body.agreementId,
      songId,
      hash: agreement.body.version.document_hash,
    };
  }

  it('refuses a hash that does not match what is on file', async () => {
    const { agreementId } = await signableAgreement();
    const response = await client.post<{ error: { message: string } }>(
      `/api/agreements/${agreementId}/sign`,
      {
        typedName: 'Jesse Hart',
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: '0'.repeat(64),
        agreementVersion: 1,
      },
    );
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('changed while it was open');
  });

  it('refuses a name that is not the signer', async () => {
    const { agreementId, hash } = await signableAgreement();
    const response = await client.post<{ error: { message: string } }>(
      `/api/agreements/${agreementId}/sign`,
      {
        typedName: 'Someone Else',
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: hash,
        agreementVersion: 1,
      },
    );
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Jesse Hart');
  });

  it('refuses when an affirmation is missing', async () => {
    const { agreementId, hash } = await signableAgreement();
    const response = await client.post(`/api/agreements/${agreementId}/sign`, {
      typedName: 'Jesse Hart',
      affirmations: SIGNING_AFFIRMATION_KEYS.slice(0, 3),
      documentHash: hash,
      agreementVersion: 1,
    });
    expect(response.status).toBe(400);
  });

  it('records a certificate and refuses a second signature from the same signer', async () => {
    const { agreementId, hash } = await signableAgreement();
    const first = await client.post<{ status: string; certificateHash: string }>(
      `/api/agreements/${agreementId}/sign`,
      {
        typedName: 'Jesse Hart',
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: hash,
        agreementVersion: 1,
      },
    );
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('partially_signed');
    expect(first.body.certificateHash).toMatch(/^[0-9a-f]{64}$/);

    const certificates = await client.get<{
      certificates: { signer_name: string; ip: string | null }[];
    }>(`/api/agreements/${agreementId}/certificate`);
    expect(certificates.body.certificates).toHaveLength(1);
    expect(certificates.body.certificates[0]?.signer_name).toBe('Jesse Hart');

    const second = await client.post<{ error: { message: string } }>(
      `/api/agreements/${agreementId}/sign`,
      {
        typedName: 'Jesse Hart',
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: hash,
        agreementVersion: 1,
      },
    );
    expect(second.status).toBe(400);
    expect(second.body.error.message).toContain('already signed');
  });

  it('freezes the percentages once anything is signed', async () => {
    const { agreementId, songId, hash } = await signableAgreement();
    await client.post(`/api/agreements/${agreementId}/sign`, {
      typedName: 'Jesse Hart',
      affirmations: SIGNING_AFFIRMATION_KEYS,
      documentHash: hash,
      agreementVersion: 1,
    });

    const deal = await client.get<SongDealResponse>(`/api/songs/${songId}`);
    const artistId = deal.body.contributors.find((c) => c.role === 'primary_artist')!.id;
    const response = await client.put<{ error: { message: string } }>(
      `/api/songs/${songId}/splits`,
      {
        rightType: 'master',
        lines: [
          { participantId: artistId, participantName: 'River & Rule', bps: percentToBps(100) },
        ],
      },
    );
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('amendment');
  });

  it('files the signed agreement in the vault, where it cannot be deleted', async () => {
    const { agreementId, hash } = await signableAgreement();
    await client.post(`/api/agreements/${agreementId}/sign`, {
      typedName: 'Jesse Hart',
      affirmations: SIGNING_AFFIRMATION_KEYS,
      documentHash: hash,
      agreementVersion: 1,
    });

    // The writer signs through a one-time link, then Altar.Camp countersigns.
    const agreement = await client.get<AgreementResponse>(`/api/agreements/${agreementId}`);
    for (const signer of agreement.body.signers.filter((s) => s.party === 'contributor')) {
      const link = await client.post<{ url: string }>(
        `/api/agreements/${agreementId}/signers/${signer.id}/link`,
        {},
      );
      const token = link.body.url.split('/').pop()!;
      const guest = await TestClient.create();
      await guest.post(`/api/agreements/${agreementId}/sign`, {
        signingToken: token,
        typedName: signer.name,
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: hash,
        agreementVersion: 1,
      });
      await guest.close();
    }

    const staff = await TestClient.create();
    await staff.post('/api/auth/login', {
      email: 'admin@altar.test',
      password: 'TestAdminPassword!2026',
    });
    const countersigned = await staff.post<{ status: string }>(
      `/api/agreements/${agreementId}/sign`,
      {
        typedName: 'Altar.Camp',
        affirmations: SIGNING_AFFIRMATION_KEYS,
        documentHash: hash,
        agreementVersion: 1,
      },
    );
    expect(countersigned.body.status).toBe('signed');
    await staff.close();

    const documents = await client.get<{
      documents: { id: string; is_system: boolean; folder: string }[];
    }>('/api/documents');
    const filed = documents.body.documents.find((document) => document.is_system);
    expect(filed?.folder).toBe('agreements');

    const deletion = await client.delete<{ error: { message: string } }>(
      `/api/documents/${filed!.id}`,
    );
    expect(deletion.status).toBe(400);
    expect(deletion.body.error.message).toContain('stay in your vault');
  });
});

describe('access control', () => {
  it("will not show one artist another artist's song", async () => {
    await readyArtist();
    const { songId } = await buildDeal();

    const other = await TestClient.create();
    await other.post('/api/auth/signup', {
      legalName: 'Other Artist',
      artistName: 'Other',
      email: uniqueEmail('other'),
      password: 'correct horse battery staple',
      country: 'United States',
      isOfAge: true,
    });
    const response = await other.get(`/api/songs/${songId}`);
    expect(response.status).toBe(403);
    await other.close();
  });

  it('will not let an artist propose their own one-year terms', async () => {
    await readyArtist();
    const response = await client.post(
      '/api/admin/artists/11111111-1111-4111-8111-111111111111/propose-year',
      {
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        masterArtistBps: 10_000,
        masterAltarBps: 0,
        compositionArtistBps: 10_000,
        compositionAltarBps: 0,
        revenue: [{ category: 'master_streaming', artistBps: 10_000, altarBps: 0 }],
      },
    );
    expect(response.status).toBe(403);
  });
});

describe('collaborator invitations', () => {
  it('carries the proposed percentage and records a change request', async () => {
    await readyArtist();
    const { songId, writerId } = await buildDeal();
    const invite = await client.post<{ token: string }>(
      `/api/songs/${songId}/contributors/${writerId}/invite`,
      {},
    );

    const guest = await TestClient.create();
    const viewed = await guest.get<{ invitation: { proposedBps: number; songTitle: string } }>(
      `/api/invitations/${invite.body.token}`,
    );
    expect(viewed.body.invitation.proposedBps).toBe(2500);
    expect(viewed.body.invitation.songTitle).toBe('Amazing Grace Again');

    const responded = await guest.post<{ status: string }>(
      `/api/invitations/${invite.body.token}/respond`,
      { action: 'request_change', requestedBps: 3333, message: 'I wrote the bridge too.' },
    );
    expect(responded.body.status).toBe('change_requested');

    // A change request does not silently rewrite the split, and it blocks generation.
    const deal = await client.get<SongDealResponse>(`/api/songs/${songId}`);
    expect(deal.body.issues.some((issue) => issue.message.includes('different percentage'))).toBe(
      true,
    );

    const second = await guest.post(`/api/invitations/${invite.body.token}/respond`, {
      action: 'accept',
    });
    expect(second.status).toBe(400);
    await guest.close();
  });
});
