import pool from '../database/postgres.js';
import PlayerWalletRepository from './PlayerWalletRepository.js';
import PlayerInventoryRepository from './PlayerInventoryRepository.js';
import ResourceLedgerRepository from './ResourceLedgerRepository.js';
import { assertInventoryCapacity } from '../gameplay/inventory/InventoryCapacityPolicy.js';
import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

function negate(value) {
    return (-BigInt(normalizeIntegerAmount(value))).toString();
}

function mapJob(row) {
    if (!row) return null;
    return {
        jobId: String(row.id),
        playerId: row.player_id,
        professionId: row.profession_id,
        recipeId: row.recipe_id,
        batchQuantity: Number(row.batch_quantity),
        professionGradeAtStart: Number(row.profession_grade_at_start),
        experienceReward: normalizeIntegerAmount(row.experience_reward),
        status: row.status,
        inputSnapshot: row.input_snapshot || {},
        outputSnapshot: row.output_snapshot || {},
        resultSnapshot: row.result_snapshot || null,
        startOperationId: row.start_operation_id,
        claimOperationId: row.claim_operation_id || null,
        startedAt: row.started_at,
        readyAt: row.ready_at,
        claimedAt: row.claimed_at || null
    };
}

export default class ProfessionRepository {
    constructor(options = {}) {
        this.database = options.database || pool;
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.inventoryRepository = options.inventoryRepository || new PlayerInventoryRepository();
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
    }

    async listProgress(playerId, options = {}) {
        const database = options.client || this.database;
        const result = await database.query(
            `SELECT profession_id, experience, grade, data_revision, created_at, updated_at
             FROM player_professions WHERE player_id = $1 ORDER BY profession_id`,
            [playerId]
        );
        return result.rows.map((row) => ({
            professionId: row.profession_id,
            experience: normalizeIntegerAmount(row.experience),
            grade: Number(row.grade),
            dataRevision: Number(row.data_revision),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    async listJobs(playerId, options = {}) {
        const database = options.client || this.database;
        const result = await database.query(
            `SELECT * FROM profession_craft_jobs
             WHERE player_id = $1 ORDER BY started_at DESC, id DESC`,
            [playerId]
        );
        return result.rows.map(mapJob);
    }

    async listLearnedRecipeIds(playerId, options = {}) {
        const database = options.client || this.database;
        const result = await database.query(
            `SELECT recipe_id FROM player_learned_recipes
             WHERE player_id = $1 ORDER BY learned_at, recipe_id`,
            [playerId]
        );
        return result.rows.map((row) => row.recipe_id);
    }

    async lockProgress(client, playerId, professionId, dataRevision) {
        await client.query(
            `INSERT INTO player_professions (player_id, profession_id, data_revision)
             VALUES ($1, $2, $3)
             ON CONFLICT (player_id, profession_id) DO NOTHING`,
            [playerId, professionId, dataRevision]
        );
        const result = await client.query(
            `SELECT profession_id, experience, grade, data_revision
             FROM player_professions
             WHERE player_id = $1 AND profession_id = $2
             FOR UPDATE`,
            [playerId, professionId]
        );
        if (!result.rowCount) throw new Error('PROFESSION_PROGRESS_NOT_FOUND');
        return {
            professionId: result.rows[0].profession_id,
            experience: normalizeIntegerAmount(result.rows[0].experience),
            grade: Number(result.rows[0].grade),
            dataRevision: Number(result.rows[0].data_revision)
        };
    }

    async hasLearnedRecipe(client, playerId, recipeId) {
        const result = await client.query(
            `SELECT 1 FROM player_learned_recipes
             WHERE player_id = $1 AND recipe_id = $2`,
            [playerId, recipeId]
        );
        return result.rowCount > 0;
    }

    async createJob(client, payload) {
        const result = await client.query(
            `INSERT INTO profession_craft_jobs (
                player_id, profession_id, recipe_id, batch_quantity,
                profession_grade_at_start, experience_reward, input_snapshot,
                output_snapshot, start_operation_id, started_at, ready_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
             RETURNING *`,
            [payload.playerId, payload.professionId, payload.recipeId, payload.batchQuantity,
                payload.professionGradeAtStart, payload.experienceReward,
                JSON.stringify(payload.inputSnapshot), JSON.stringify(payload.outputSnapshot),
                payload.operationId, payload.startedAt, payload.readyAt]
        );
        return mapJob(result.rows[0]);
    }

    async consumeInputs(client, payload) {
        const currency = payload.inputSnapshot.currency;
        const currencyBalance = await this.walletRepository.debit(client, {
            playerId: payload.playerId,
            currencyId: currency.currencyId,
            amount: currency.amount
        });
        const ledgerEntries = [{
            resourceType: 'CURRENCY', resourceId: currency.currencyId,
            delta: negate(currency.amount), balanceAfter: currencyBalance,
            reason: 'PROFESSION_CRAFT_CURRENCY_COST'
        }];
        const consumedMaterials = [];
        for (const material of payload.inputSnapshot.materials || []) {
            const consumed = await this.inventoryRepository.consumeItemAcrossStacks(client, {
                playerId: payload.playerId,
                itemId: material.itemId,
                quantity: material.quantity,
                errorCode: 'INSUFFICIENT_MATERIAL'
            });
            consumedMaterials.push(...consumed);
            ledgerEntries.push({
                resourceType: 'ITEM', resourceId: material.itemId,
                delta: negate(material.quantity),
                balanceAfter: await this.inventoryRepository.getStackQuantity(client, payload.playerId, material.itemId),
                reason: 'PROFESSION_CRAFT_MATERIAL_COST'
            });
        }
        await this.resourceLedgerRepository.recordMany(client, ledgerEntries.map((entry) => ({
            ...entry,
            playerId: payload.playerId,
            referenceType: 'PROFESSION_CRAFT_JOB',
            referenceId: payload.jobId,
            operationId: payload.operationId,
            createdAt: payload.startedAt
        })));
        return { currencyBalance, consumedMaterials };
    }

    async lockJob(client, playerId, jobId) {
        const result = await client.query(
            `SELECT * FROM profession_craft_jobs
             WHERE id = $1 AND player_id = $2 FOR UPDATE`,
            [jobId, playerId]
        );
        if (!result.rowCount) throw new Error('PROFESSION_CRAFT_JOB_NOT_FOUND');
        return mapJob(result.rows[0]);
    }

    async applyItemOutput(client, payload) {
        const reward = {
            type: 'ITEM', itemId: payload.output.itemId,
            quantity: normalizeIntegerAmount(payload.output.quantity)
        };
        const inventoryRows = await this.inventoryRepository.listCapacityRowsForUpdate(client, payload.playerId);
        assertInventoryCapacity(inventoryRows, [reward], payload.inventoryCapacity);
        const inventoryId = await this.inventoryRepository.addStackableItem(client, {
            playerId: payload.playerId,
            itemId: reward.itemId,
            quantity: reward.quantity
        });
        const balanceAfter = await this.inventoryRepository.getStackQuantity(client, payload.playerId, reward.itemId);
        await this.resourceLedgerRepository.record(client, {
            playerId: payload.playerId,
            resourceType: 'ITEM', resourceId: reward.itemId,
            delta: reward.quantity, balanceAfter,
            reason: 'PROFESSION_CRAFT_RESULT',
            referenceType: 'PROFESSION_CRAFT_JOB', referenceId: payload.jobId,
            operationId: payload.operationId, createdAt: payload.claimedAt
        });
        return { ...reward, inventoryId };
    }

    async updateProgress(client, payload) {
        const result = await client.query(
            `UPDATE player_professions
             SET experience = $3, grade = $4, data_revision = $5, updated_at = $6
             WHERE player_id = $1 AND profession_id = $2
             RETURNING experience, grade, data_revision, updated_at`,
            [payload.playerId, payload.professionId, payload.experience, payload.grade,
                payload.dataRevision, payload.updatedAt]
        );
        if (!result.rowCount) throw new Error('PROFESSION_PROGRESS_NOT_FOUND');
        return {
            experience: normalizeIntegerAmount(result.rows[0].experience),
            grade: Number(result.rows[0].grade),
            dataRevision: Number(result.rows[0].data_revision),
            updatedAt: result.rows[0].updated_at
        };
    }

    async completeJob(client, payload) {
        const result = await client.query(
            `UPDATE profession_craft_jobs
             SET status = 'CLAIMED', result_snapshot = $2::jsonb,
                 claim_operation_id = $3, claimed_at = $4
             WHERE id = $1 AND status = 'IN_PROGRESS'
             RETURNING *`,
            [payload.jobId, JSON.stringify(payload.resultSnapshot), payload.operationId, payload.claimedAt]
        );
        if (!result.rowCount) throw new Error('PROFESSION_CRAFT_JOB_NOT_CLAIMABLE');
        return mapJob(result.rows[0]);
    }
}
