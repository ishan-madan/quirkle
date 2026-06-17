export class UserRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async upsertByExternalId(externalUserId, displayName, client) {
        const executor = client ?? this.pool;
        const { rows } = await executor.query(`
      insert into users (external_user_id, display_name)
      values ($1, $2)
      on conflict (external_user_id)
      do update set
        display_name = excluded.display_name,
        updated_at = now()
      returning *
      `, [externalUserId, displayName]);
        return rows[0];
    }
    async getByExternalId(externalUserId) {
        const { rows } = await this.pool.query('select * from users where external_user_id = $1', [
            externalUserId,
        ]);
        return rows[0] ?? null;
    }
}
