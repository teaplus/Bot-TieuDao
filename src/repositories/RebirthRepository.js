import ResourceLedgerRepository from './ResourceLedgerRepository.js';
import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

function negate(value) {
    return (-BigInt(normalizeIntegerAmount(value))).toString();
}

export default class RebirthRepository {
    constructor(options = {}) {
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
    }

    async assertNoActivityInProgress(client, playerId) {
        const result = await client.query(
            `SELECT id FROM activity_runs
             WHERE player_id = $1 AND status = 'IN_PROGRESS'
             ORDER BY id LIMIT 1 FOR UPDATE`,
            [playerId]
        );
        if (result.rowCount) throw new Error('REBIRTH_ACTIVITY_IN_PROGRESS');

        const craftJob = await client.query(
            `SELECT id FROM profession_craft_jobs
             WHERE player_id = $1 AND status = 'IN_PROGRESS'
             ORDER BY id LIMIT 1 FOR UPDATE`,
            [playerId]
        );
        if (craftJob.rowCount) throw new Error('REBIRTH_PROFESSION_JOB_IN_PROGRESS');
    }

    async applyReset(client, payload) {
        const balances = await client.query(
            `SELECT currency_id, amount FROM player_wallets
             WHERE player_id = $1 ORDER BY currency_id FOR UPDATE`,
            [payload.playerId]
        );
        const resetBalances = balances.rows.filter((row) => row.currency_id !== 'SPIRIT_STONE');
        const counts = await client.query(
            `SELECT
                (SELECT COUNT(*) FROM inventory_stacks WHERE player_id = $1) AS inventory_stacks,
                (SELECT COUNT(*) FROM equipment_instances WHERE player_id = $1) AS equipment_instances,
                (SELECT COUNT(*) FROM player_items WHERE player_id = $1) AS legacy_items,
                (SELECT COUNT(*) FROM player_skills WHERE player_id = $1) AS learned_skills,
                (SELECT COUNT(*) FROM player_cultivation_arts WHERE player_id = $1) AS cultivation_arts`,
            [payload.playerId]
        );
        const beforeSnapshot = {
            ...payload.beforeSnapshot,
            resetCounts: counts.rows[0],
            resetCurrencies: Object.fromEntries(resetBalances.map((row) => [row.currency_id, String(row.amount)]))
        };

        for (const table of ['inventory_stacks', 'equipment_instances', 'player_items', 'player_skills', 'player_cultivation_arts']) {
            await client.query(`DELETE FROM ${table} WHERE player_id = $1`, [payload.playerId]);
        }
        await client.query(
            `INSERT INTO player_cultivation_arts (player_id, art_id) VALUES ($1, $2)`,
            [payload.playerId, payload.cultivationArtId]
        );
        await client.query(
            `UPDATE player_wallets SET amount = 0, updated_at = $2
             WHERE player_id = $1 AND currency_id <> 'SPIRIT_STONE'`,
            [payload.playerId, payload.rebornAt]
        );
        const playerResult = await client.query(
            `UPDATE players SET
                realm_id = $2, realm_stage = $3, cultivation = 0,
                base_atk = $4, base_def = $5, base_hp = $6, base_spd = $7,
                cultivation_art_id = $8, sect_id = NULL,
                sect_rejoin_available_at = NULL, sect_policy_revision = NULL,
                sect_points = 0, honor_points = 0, event_points = 0,
                rebirth_count = $9, rebirth_policy_revision = $10, last_cultivate = $11
             WHERE id = $1 RETURNING id, rebirth_count`,
            [payload.playerId, payload.realmId, payload.realmStage, payload.baseStats.atk,
                payload.baseStats.def, payload.baseStats.hp, payload.baseStats.spd,
                payload.cultivationArtId, payload.rebirthCount, payload.policyRevision, payload.rebornAt]
        );
        if (!playerResult.rowCount) throw new Error('PLAYER_NOT_FOUND');
        await client.query(
            `INSERT INTO idle_accumulators (player_id, source_id, checkpoint_at, rules_revision)
             VALUES ($1, 'CULTIVATION', $2, 'cultivation-rules-v3')
             ON CONFLICT (player_id, source_id) DO UPDATE SET checkpoint_at = EXCLUDED.checkpoint_at`,
            [payload.playerId, payload.rebornAt]
        );

        const afterSnapshot = {
            realmId: payload.realmId, realmStage: payload.realmStage, cultivation: '0',
            baseStats: payload.baseStats, cultivationArtId: payload.cultivationArtId,
            sectId: null, rebirthCount: payload.rebirthCount,
            spiritRootId: payload.beforeSnapshot.spiritRootId,
            spiritRootQualityTierId: payload.beforeSnapshot.spiritRootQualityTierId || null,
            retainedSpiritStone: payload.retainedSpiritStone
        };
        const history = await client.query(
            `INSERT INTO player_rebirth_history (
                player_id, rebirth_number, policy_id, policy_revision, operation_id,
                before_snapshot, after_snapshot, reborn_at
             ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
             RETURNING id, reborn_at`,
            [payload.playerId, payload.rebirthCount, payload.policyId, payload.policyRevision,
                payload.operationId, JSON.stringify(beforeSnapshot), JSON.stringify(afterSnapshot), payload.rebornAt]
        );
        const historyId = String(history.rows[0].id);
        await client.query(
            `INSERT INTO player_spirit_root_reroll_entitlements (
                player_id, rebirth_number, status, granted_at
             ) VALUES ($1, $2, 'AVAILABLE', $3)
             ON CONFLICT (player_id, rebirth_number) DO NOTHING`,
            [payload.playerId, payload.rebirthCount, payload.rebornAt]
        );
        await this.resourceLedgerRepository.recordMany(client, resetBalances.map((row) => ({
            playerId: payload.playerId, resourceType: 'CURRENCY', resourceId: row.currency_id,
            delta: negate(row.amount), balanceAfter: '0', reason: 'REBIRTH_RESET',
            referenceType: 'REBIRTH', referenceId: historyId,
            operationId: payload.operationId, createdAt: payload.rebornAt
        })));

        return { historyId, beforeSnapshot, afterSnapshot, rebornAt: history.rows[0].reborn_at };
    }
}
