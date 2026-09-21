import type { NotificationType } from '@altar/shared';
import { query, type Queryable } from '../db/pool.js';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Spec §32. Phase 1 delivers in-app only; email and push read the same rows, so adding a
 * channel later means adding a sender, not changing every call site.
 */
export async function notify(input: NotificationInput, client?: Queryable): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)`,
    [input.userId, input.type, input.title, input.body ?? '', input.link ?? null],
    client,
  );
}

export async function notifyMany(inputs: NotificationInput[], client?: Queryable): Promise<void> {
  for (const input of inputs) {
    await notify(input, client);
  }
}
