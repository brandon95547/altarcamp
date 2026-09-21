import { EDUCATION_LESSONS, servicesFor } from '@altar/shared';
import { loadConfig } from '../../config.js';
import { hashPassword } from '../../lib/password.js';
import { AGREEMENT_TEMPLATES } from '../../templates/index.js';
import { query, queryOne, withTransaction } from '../pool.js';

type Log = (message: string) => void;

/**
 * Idempotent seed, safe to run on every boot.
 *
 * It publishes the agreement templates (a template version is never overwritten — a new
 * version is added, so signed documents keep pointing at the text that was signed), makes
 * sure an administrator exists, and in development sets up one artist mid-flow so the
 * product can be walked through without ten minutes of typing.
 */
export async function seed(log: Log = () => {}): Promise<void> {
  const config = loadConfig();
  await seedTemplates(log);
  await seedAdmin(log);
  if (config.SEED_DEMO) {
    await seedDemoArtist(log);
  }
}

async function seedTemplates(log: Log): Promise<void> {
  for (const template of AGREEMENT_TEMPLATES) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM agreement_templates WHERE type = $1 AND version = $2`,
      [template.type, template.version],
    );
    if (existing) continue;
    await withTransaction(async (client) => {
      await query(
        `UPDATE agreement_templates SET is_active = FALSE WHERE type = $1`,
        [template.type],
        client,
      );
      await query(
        `INSERT INTO agreement_templates (type, version, title, simple_body, deal_sheet_body, legal_body, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [
          template.type,
          template.version,
          template.title,
          template.simpleBody,
          template.dealSheetBody,
          template.legalBody,
        ],
        client,
      );
    });
    log(`  seeded template ${template.type} v${template.version}`);
  }
}

async function seedAdmin(log: Log): Promise<void> {
  const config = loadConfig();
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [config.ADMIN_EMAIL],
  );
  if (existing) return;

  await query(
    `INSERT INTO users (email, password_hash, legal_name, role, email_verified)
     VALUES ($1, $2, 'Altar.Camp Administrator', 'admin', TRUE)`,
    [config.ADMIN_EMAIL.toLowerCase(), await hashPassword(config.ADMIN_PASSWORD)],
  );
  log(`  seeded administrator ${config.ADMIN_EMAIL}`);
}

const DEMO_EMAIL = 'jesse@example.com';
const DEMO_PASSWORD = 'AltarCampDemo!2026';

async function seedDemoArtist(log: Log): Promise<void> {
  const existing = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1`, [
    DEMO_EMAIL,
  ]);
  if (existing) return;

  await withTransaction(async (client) => {
    const user = await queryOne<{ id: string }>(
      `INSERT INTO users (email, password_hash, legal_name, phone, role, email_verified)
       VALUES ($1, $2, 'Jesse Hart', '+1 615 555 0142', 'artist', TRUE) RETURNING id`,
      [DEMO_EMAIL, await hashPassword(DEMO_PASSWORD)],
      client,
    );
    if (!user) return;

    const artist = await queryOne<{ id: string }>(
      `INSERT INTO artists (user_id, artist_name, country, region, website, age_confirmed, onboarding_step, deal_path)
       VALUES ($1, 'River & Rule', 'United States', 'Tennessee', 'https://riverandrule.example', TRUE, 'choose_path', 'single_song')
       RETURNING id`,
      [user.id],
      client,
    );
    if (!artist) return;

    await query(
      `INSERT INTO artist_profiles (artist_id, bio, genre, influences, mission_interests, pro_affiliation, current_distributor)
       VALUES ($1, $2, 'Folk worship', 'The Innocence Mission, Rich Mullins, Sandra McCracken',
               'Prison ministry, church planting in East Africa', 'BMI', 'DistroKid')`,
      [
        artist.id,
        'Nashville-based folk duo writing hymns for people who are not sure they believe them yet.',
      ],
      client,
    );

    for (const question of [
      ['signed_to_label', false],
      ['exclusive_distribution', false],
      ['publishing_agreement', false],
      ['management_agreement', false],
      ['owns_masters', true],
      ['controls_songwriting', true],
    ] as const) {
      await query(
        `INSERT INTO rights_disclosures (artist_id, question_key, answer, has_conflict)
         VALUES ($1, $2, $3, FALSE)`,
        [artist.id, question[0], question[1]],
        client,
      );
    }

    for (const lesson of EDUCATION_LESSONS) {
      await query(
        `INSERT INTO education_progress (artist_id, lesson_slug, selected_option_id, is_correct)
         VALUES ($1, $2, $3, TRUE)`,
        [artist.id, lesson.slug, lesson.check.correctOptionId],
        client,
      );
    }

    const song = await queryOne<{ id: string }>(
      `INSERT INTO songs (artist_id, title, collaboration_type, recording_status, status, expected_release_date, samples_declared)
       VALUES ($1, 'Amazing Grace Again', 'artist_altar', 'mixing', 'splits_proposed', CURRENT_DATE + 60, FALSE)
       RETURNING id`,
      [artist.id],
      client,
    );
    if (!song) return;

    await query(
      `INSERT INTO master_terms (song_id, structure) VALUES ($1, 'shared')`,
      [song.id],
      client,
    );

    const jesse = await queryOne<{ id: string }>(
      `INSERT INTO contributors (song_id, user_id, legal_name, stage_name, email, role, pro_affiliation, requires_approval, approval_status, approved_at)
       VALUES ($1, $2, 'Jesse Hart', 'River & Rule', $3, 'primary_artist', 'BMI', FALSE, 'accepted', now())
       RETURNING id`,
      [song.id, user.id, DEMO_EMAIL],
      client,
    );
    const mary = await queryOne<{ id: string }>(
      `INSERT INTO contributors (song_id, legal_name, stage_name, email, role, pro_affiliation, requires_approval, approval_status)
       VALUES ($1, 'Mary Jones', 'Mary Jones', 'mary@example.com', 'songwriter', 'ASCAP', TRUE, 'pending')
       RETURNING id`,
      [song.id],
      client,
    );
    const david = await queryOne<{ id: string }>(
      `INSERT INTO contributors (song_id, legal_name, stage_name, email, role, requires_approval, approval_status)
       VALUES ($1, 'David Lee', 'D. Lee', 'david@example.com', 'producer', TRUE, 'pending')
       RETURNING id`,
      [song.id],
      client,
    );
    if (!jesse || !mary || !david) return;

    const splits: [string, string | null, string | null, string, number][] = [
      // right_type, revenue_category, contributor, name, bps
      ['composition', null, jesse.id, 'River & Rule', 5_000],
      ['composition', null, mary.id, 'Mary Jones', 2_500],
      ['composition', null, david.id, 'D. Lee', 2_500],
      ['master', null, jesse.id, 'River & Rule', 5_000],
      ['master', null, null, 'Altar.Camp', 5_000],
    ];
    for (const [rightType, _revenue, contributorId, name, bps] of splits) {
      await query(
        `INSERT INTO splits (song_id, right_type, participant_kind, contributor_id, participant_name, bps)
         VALUES ($1, $2::right_type, $3, $4, $5, $6)`,
        [song.id, rightType, contributorId ? 'contributor' : 'label', contributorId, name, bps],
        client,
      );
    }

    const revenue: [string, [string | null, string, number][]][] = [
      [
        'master_streaming',
        [
          [jesse.id, 'River & Rule', 4_500],
          [null, 'Altar.Camp', 5_000],
          [david.id, 'D. Lee', 500],
        ],
      ],
      [
        'publishing',
        [
          [jesse.id, 'River & Rule', 5_000],
          [mary.id, 'Mary Jones', 2_500],
          [david.id, 'D. Lee', 2_500],
        ],
      ],
      [
        'sync_licensing',
        [
          [jesse.id, 'River & Rule', 5_000],
          [null, 'Altar.Camp', 5_000],
        ],
      ],
    ];
    for (const [category, lines] of revenue) {
      for (const [contributorId, name, bps] of lines) {
        await query(
          `INSERT INTO splits (song_id, revenue_category, participant_kind, contributor_id, participant_name, bps)
           VALUES ($1, $2::revenue_category, $3, $4, $5, $6)`,
          [song.id, category, contributorId ? 'contributor' : 'label', contributorId, name, bps],
          client,
        );
      }
    }

    const terms = await queryOne<{ id: string }>(
      `INSERT INTO recoupment_terms (song_id, payer, recoupable, recouped_from, artist_personally_liable,
                                     after_recoupment, investment_cap_minor)
       VALUES ($1, 'altar', TRUE, 'master_revenue', FALSE,
               'Once Altar.Camp has recovered what it spent, revenue is split at the agreed percentages with nothing further deducted for those costs.',
               500000)
       RETURNING id`,
      [song.id],
      client,
    );
    if (terms) {
      for (const expense of [
        ['recording', 'Four days at Skylark, tracking and overdubs', 180_000],
        ['mixing', 'Mix and two revisions', 90_000],
        ['mastering', 'Master for streaming and vinyl', 30_000],
        ['artwork', 'Cover photography and layout', 40_000],
        ['marketing', 'Release campaign', 120_000],
      ] as const) {
        await query(
          `INSERT INTO planned_expenses (recoupment_terms_id, category, description, amount_minor, recoupable)
           VALUES ($1, $2::expense_category, $3, $4, TRUE)`,
          [terms.id, expense[0], expense[1], expense[2]],
          client,
        );
      }
    }

    log(`  seeded demo artist ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  });
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
export const DEMO_SERVICES = servicesFor('single_song').map((service) => service.key);
