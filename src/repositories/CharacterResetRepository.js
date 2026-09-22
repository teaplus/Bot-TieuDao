import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

export default class CharacterResetRepository {
    async getPlayer(database, playerId, options = {}) {
        const result = await database.query(
            `SELECT id, name, account_status, realm_id, realm_stage, cultivation,
                    spirit_root_id, spirit_root_quality_tier_id, rebirth_count,
                    character_reset_count, last_character_reset_at
             FROM players WHERE id = $1${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [playerId]
        );
        if (!result.rowCount) return null;
        const row = result.rows[0];
        return {
            playerId: row.id,
            name: row.name,
            accountStatus: row.account_status,
            realmId: Number(row.realm_id),
            realmStage: Number(row.realm_stage),
            cultivation: String(row.cultivation),
            spiritRootId: row.spirit_root_id,
            spiritRootQualityTierId: row.spirit_root_quality_tier_id,
            rebirthCount: Number(row.rebirth_count || 0),
            characterResetCount: Number(row.character_reset_count || 0),
            lastCharacterResetAt: row.last_character_reset_at
        };
    }

    async assertNoActiveState(database, playerId) {
        const checks = [
            ['activity_runs', "status = 'IN_PROGRESS'", 'CHARACTER_RESET_ACTIVITY_IN_PROGRESS'],
            ['profession_craft_jobs', "status = 'IN_PROGRESS'", 'CHARACTER_RESET_CRAFT_IN_PROGRESS'],
            ['player_minigame_rounds', "status = 'ACTIVE'", 'CHARACTER_RESET_MINIGAME_ACTIVE']
        ];
        for (const [table, predicate, errorCode] of checks) {
            const result = await database.query(
                `SELECT 1 FROM ${table} WHERE player_id = $1 AND ${predicate} LIMIT 1 FOR UPDATE`,
                [playerId]
            );
            if (result.rowCount) throw new Error(errorCode);
        }
    }

    async collectBeforeSnapshot(database, player) {
        const result = await database.query(
            `SELECT
                (SELECT COUNT(*) FROM inventory_stacks WHERE player_id = $1)::int AS inventory_stacks,
                (SELECT COUNT(*) FROM equipment_instances WHERE player_id = $1)::int AS equipment_instances,
                (SELECT COUNT(*) FROM player_items WHERE player_id = $1)::int AS legacy_items,
                (SELECT COUNT(*) FROM player_skills WHERE player_id = $1)::int AS skills,
                (SELECT COUNT(*) FROM player_cultivation_arts WHERE player_id = $1)::int AS cultivation_arts,
                (SELECT COUNT(*) FROM player_professions WHERE player_id = $1)::int AS professions,
                (SELECT COUNT(*) FROM player_learned_recipes WHERE player_id = $1)::int AS recipes`,
            [player.playerId]
        );
        return { ...player, resetCounts: result.rows[0] };
    }

    async resetCharacter(database, payload) {
        const resetTables = [
            'player_spirit_root_roll_history',
            'player_spirit_root_reroll_entitlements',
            'player_rebirth_history',
            'inventory_stacks',
            'equipment_instances',
            'player_items',
            'player_skills',
            'player_cultivation_arts',
            'player_professions',
            'player_learned_recipes',
            'idle_accumulators',
            'cultivation_leaderboard_entries',
            'player_map_movements',
            'player_map_states',
            'shop_sessions'
        ];
        for (const table of resetTables) {
            await database.query(`DELETE FROM ${table} WHERE player_id = $1`, [payload.playerId]);
        }
        const resetCurrencies = await database.query(
            `WITH balances AS (
                SELECT currency_id, amount
                FROM player_wallets
                WHERE player_id = $1 AND currency_id <> 'SPIRIT_STONE' AND amount <> 0
                ORDER BY currency_id FOR UPDATE
             ), updated AS (
                UPDATE player_wallets wallet
                SET amount = 0, updated_at = $2::timestamptz
                FROM balances
                WHERE wallet.player_id = $1 AND wallet.currency_id = balances.currency_id
                RETURNING wallet.currency_id
             )
             SELECT balances.currency_id, balances.amount AS previous_amount
             FROM balances JOIN updated USING (currency_id)
             ORDER BY balances.currency_id`,
            [payload.playerId, payload.resetAt]
        );
        const playerResult = await database.query(
            `UPDATE players SET
                name = 'Lữ Khách', account_status = 'GUEST', character_registered_at = NULL,
                realm_id = 1, realm_stage = 1, cultivation = 0,
                base_atk = 40, base_def = 20, base_hp = 200, base_spd = 5,
                spiritual_root = 'Tạp Căn', spirit_root_id = NULL,
                spirit_root_quality_tier_id = 'LOWER_GRADE', cultivation_art_id = 'CP_NEUTRAL_HOANG',
                sect_id = NULL, sect_rejoin_available_at = NULL, sect_policy_revision = NULL,
                rebirth_count = 0, rebirth_policy_revision = 1,
                creation_rerolls_used = 0, creation_rule_revision = 1,
                realm_stat_policy_revision = 1,
                sect_points = 0, honor_points = 0, event_points = 0,
                last_cultivate = $2::timestamptz, last_treasure_hunt = NULL,
                character_reset_count = character_reset_count + 1,
                last_character_reset_at = $2::timestamptz
             WHERE id = $1 AND account_status = 'REGISTERED'
             RETURNING id, character_reset_count, last_character_reset_at`,
            [payload.playerId, payload.resetAt]
        );
        if (!playerResult.rowCount) throw new Error('CHARACTER_RESET_PLAYER_NOT_REGISTERED');
        const resetNumber = Number(playerResult.rows[0].character_reset_count);
        const history = await database.query(
            `INSERT INTO player_character_reset_history (
                player_id, reset_number, operation_id, policy_revision,
                retained_spirit_stone, before_snapshot, reset_at
             ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
             RETURNING id, reset_at`,
            [
                payload.playerId,
                resetNumber,
                payload.operationId,
                payload.policyRevision,
                normalizeIntegerAmount(payload.retainedSpiritStone),
                JSON.stringify(payload.beforeSnapshot),
                payload.resetAt
            ]
        );
        return {
            historyId: String(history.rows[0].id),
            resetNumber,
            resetAt: history.rows[0].reset_at,
            resetCurrencies: resetCurrencies.rows.map((row) => ({
                currencyId: row.currency_id,
                previousAmount: String(row.previous_amount),
                balanceAfter: '0'
            }))
        };
    }
}
