import type { UserRole } from '@altar/shared';
import { query, type Queryable } from '../db/pool.js';

export interface AuditEntry {
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Spec §37. Signature trails, split changes and staff actions all land here. The log is
 * append-only by convention — nothing in the API updates or deletes a row.
 */
export async function recordAudit(entry: AuditEntry, client?: Queryable): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, metadata, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.actorUserId ?? null,
      entry.actorRole ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      JSON.stringify(entry.metadata ?? {}),
      entry.ip ?? null,
      entry.userAgent ?? null,
    ],
    client,
  );
}
