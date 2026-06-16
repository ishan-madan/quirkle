import type { Pool, PoolClient } from 'pg';
import type { DbUser } from '../types.js';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async upsertByExternalId(
    externalUserId: string,
    displayName: string,
    client?: PoolClient
  ): Promise<DbUser> {
    const executor = client ?? this.pool;
    const { rows } = await executor.query<DbUser>(
      `
      insert into users (external_user_id, display_name)
      values ($1, $2)
      on conflict (external_user_id)
      do update set
        display_name = excluded.display_name,
        updated_at = now()
      returning *
      `,
      [externalUserId, displayName]
    );

    return rows[0]!;
  }

  async getByExternalId(externalUserId: string): Promise<DbUser | null> {
    const { rows } = await this.pool.query<DbUser>('select * from users where external_user_id = $1', [
      externalUserId,
    ]);
    return rows[0] ?? null;
  }
}
