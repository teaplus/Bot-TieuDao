import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import ProfessionService from '../gameplay/profession/ProfessionService.js';
import { getProfessionShortages } from '../commands/player/nghenghiep.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const now = new Date('2026-07-23T00:00:00.000Z');
const player = {
    playerId: 'profession-audit-player', realmId: 2,
    currencies: { SPIRIT_STONE: '1000' },
    inventory: {
        runtimeItems: [
            { templateId: 'HERB_TU_LINH_THAO', quantity: 100 },
            { templateId: 'HERB_THANH_TAM_THAO', quantity: 100 }
        ]
    }
};
const state = {
    progress: { professionId: 'ALCHEMIST', experience: '90', grade: 1, dataRevision: 1 },
    job: null,
    consumed: null,
    appliedOutput: null
};
const repository = {
    async listProgress() { return [state.progress]; },
    async listJobs() { return state.job ? [state.job] : []; },
    async listLearnedRecipeIds() {
        return ['CRAFT_BREAKTHROUGH_PILL', 'CRAFT_SPIRIT_GATHERING_PILL'];
    },
    async lockProgress() { return { ...state.progress }; },
    async hasLearnedRecipe(_client, _playerId, recipeId) {
        return ['CRAFT_BREAKTHROUGH_PILL', 'CRAFT_SPIRIT_GATHERING_PILL'].includes(recipeId);
    },
    async createJob(_client, payload) {
        state.job = {
            jobId: '501', status: 'IN_PROGRESS', resultSnapshot: null,
            startOperationId: payload.operationId, claimOperationId: null,
            claimedAt: null, ...payload
        };
        return state.job;
    },
    async consumeInputs(_client, payload) {
        state.consumed = payload.inputSnapshot;
        return { currencyBalance: '1000', consumedMaterials: [] };
    },
    async lockJob() { return { ...state.job }; },
    async applyItemOutput(_client, payload) {
        state.appliedOutput = payload.output;
        return { type: 'ITEM', itemId: payload.output.itemId, quantity: payload.output.quantity, inventoryId: 'S:1' };
    },
    async updateProgress(_client, payload) {
        state.progress = {
            professionId: payload.professionId, experience: payload.experience,
            grade: payload.grade, dataRevision: payload.dataRevision, updatedAt: payload.updatedAt
        };
        return state.progress;
    },
    async completeJob(_client, payload) {
        state.job = {
            ...state.job, status: 'CLAIMED', resultSnapshot: payload.resultSnapshot,
            claimOperationId: payload.operationId, claimedAt: payload.claimedAt
        };
        return state.job;
    }
};
const operationExecutor = { async execute(_operation, work) { return work({}); } };
const service = new ProfessionService({
    playerRuntimeRepository: { async findById() { return player; } },
    gameDataManager, repository, operationExecutor,
    timeProvider: { now: () => now }
});

const dashboard = await service.getDashboard(player.playerId);
assert(dashboard.professions.length === 5, 'Dashboard must expose all five approved professions');
assert(dashboard.professions.filter((entry) => entry.status === 'ACTIVE').length === 3,
    'Exactly three professions must be ACTIVE in MVP');
const breakthroughRecipe = dashboard.professions
    .find((entry) => entry.id === 'ALCHEMIST')
    ?.recipes.find((entry) => entry.id === 'CRAFT_BREAKTHROUGH_PILL');
assert(breakthroughRecipe.materials.every((material) => (
    material.source.mapId === 'THANH_VAN_SON_MACH'
    && material.source.methods.includes('GATHERING')
)), 'Recipe materials must expose their gathering map source', breakthroughRecipe?.materials);
const spiritGatheringRecipe = dashboard.professions
    .find((entry) => entry.id === 'ALCHEMIST')
    ?.recipes.find((entry) => entry.id === 'CRAFT_SPIRIT_GATHERING_PILL');
assert(spiritGatheringRecipe.output.itemId === 'SPIRIT_GATHERING_PILL'
    && spiritGatheringRecipe.materials[0].itemId === 'HERB_TU_LINH_THAO'
    && spiritGatheringRecipe.materials[0].quantity === 3,
'Tụ Linh Đan recipe does not match approved content', spiritGatheringRecipe);
assert(spiritGatheringRecipe.materials[0].source.methods.includes('MONSTER_DROP'),
'Tụ Linh Thảo source must include monster drop', spiritGatheringRecipe.materials[0]);

const started = await service.start(player.playerId, 'CRAFT_BREAKTHROUGH_PILL', 2, {
    operationId: 'profession-start-audit', startedAt: now
});
assert(started.outcome === 'PROFESSION_CRAFT_STARTED', 'Craft job did not start');
assert(state.consumed.materials.length === 2
    && state.consumed.materials[0].itemId === 'HERB_TU_LINH_THAO'
    && state.consumed.materials[0].quantity === '8'
    && state.consumed.materials[1].itemId === 'HERB_THANH_TAM_THAO'
    && state.consumed.materials[1].quantity === '2',
'Batch must scale every explicit material linearly', state.consumed);
assert(state.job.outputSnapshot.quantity === '2', 'Batch must scale output linearly', state.job.outputSnapshot);
assert(state.job.experienceReward === '20', 'Batch must scale recipe EXP linearly', state.job);
assert(new Date(state.job.readyAt).getTime() - now.getTime() === 120_000,
    'Grade-one duration must be one minute per unit');
assert(service.experienceReward(1, 3, 1) === '2', 'Low-grade recipe penalty must floor 10 EXP to 25%');

let notReadyError = null;
try {
    await service.claim(player.playerId, state.job.jobId, {
        operationId: 'profession-claim-too-early', claimedAt: new Date(now.getTime() + 60_000)
    });
} catch (error) {
    notReadyError = error.message;
}
assert(notReadyError === 'PROFESSION_CRAFT_JOB_NOT_READY', 'Claim must reject an unfinished job', notReadyError);

const claimed = await service.claim(player.playerId, state.job.jobId, {
    operationId: 'profession-claim-audit', claimedAt: new Date(now.getTime() + 180_000)
});
assert(claimed.outcome === 'PROFESSION_CRAFT_CLAIMED', 'Ready job did not claim');
assert(claimed.progress.experience === '110', 'Claim must award snapshotted EXP');
assert(claimed.progress.grade === 2, 'Realm-qualified profession grade promotion failed');
assert(state.appliedOutput.itemId === 'BREAKTHROUGH_PILL', 'Claim output does not match recipe snapshot');
const shortages = getProfessionShortages({
    costCurrency: { currencyId: 'SPIRIT_STONE', amount: '10', owned: '5' },
    materials: [{ name: 'Linh Thảo', quantity: 5, owned: 3 }]
}, 2);
assert(shortages.length === 2, 'UI must detect both currency and material shortages', shortages);
assert(shortages.find((entry) => entry.type === 'CURRENCY')?.missing === '15',
    'UI currency shortage is incorrect', shortages);
assert(shortages.find((entry) => entry.type === 'ITEM')?.missing === '7',
    'UI material shortage is incorrect', shortages);

const migrationSql = fs.readFileSync(
    new URL('../database/migrations/025_profession_foundation.sql', import.meta.url), 'utf8'
);
assert(migrationSql.includes('profession_craft_jobs_one_active_slot'), 'Migration must enforce one active slot per profession');
assert(migrationSql.includes("status IN ('IN_PROGRESS', 'CLAIMED', 'FAILED')"), 'Migration job status constraint is missing');
assert(migrationSql.includes('start_operation_id TEXT NOT NULL'), 'Start operation identity must be persisted');
assert(migrationSql.includes('claim_operation_id TEXT'), 'Claim operation identity must be persisted');
const commandSource = fs.readFileSync(new URL('../commands/player/nghenghiep.js', import.meta.url), 'utf8');
const clientSource = fs.readFileSync(new URL('../core/ExtendedClient.js', import.meta.url), 'utf8');
const legacyCraftSource = fs.readFileSync(new URL('../gameplay/craft/CraftService.js', import.meta.url), 'utf8');
assert(commandSource.includes("name: 'nghenghiep'"), 'Profession slash command is missing');
assert(commandSource.includes("component.id") && commandSource.includes("professionService.start")
    && commandSource.includes("professionService.claim"), 'Profession command must pass Discord operation identity to use cases');
assert(commandSource.includes("name: '⚠️ Không đủ nguyên liệu'")
    && commandSource.includes('shortages.length === 0'),
'Profession command must explain shortages and disable start');
assert(commandSource.includes("sourceMethods.push('/thuthap')")
    && commandSource.includes('material.source?.mapName'),
'Profession command must display material source and map');
assert(clientSource.includes('this.professionService = options.professionService'),
    'Profession service is not exposed by ExtendedClient');
assert(legacyCraftSource.includes("throw new Error('CRAFT_START_CLAIM_REQUIRED')"),
    'Legacy immediate craft path must be disabled');

console.log(JSON.stringify({
    status: 'PASS',
    checks: [
        'five-profession-registry', 'three-active-professions', 'lazy-linear-batch',
        'consume-at-start-snapshot', 'not-ready-claim-guard', 'claim-output-and-exp',
        'realm-gated-promotion', 'low-grade-exp-penalty', 'one-active-slot-ddl',
        'operation-identity-ddl', 'profession-dashboard-command',
        'discord-operation-identity', 'legacy-immediate-craft-disabled',
        'shortage-calculation', 'shortage-warning-and-start-guard'
    ]
}, null, 2));
