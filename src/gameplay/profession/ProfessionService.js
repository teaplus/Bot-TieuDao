import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import ProfessionRepository from '../../repositories/ProfessionRepository.js';
import { compareIntegerAmounts, normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function multiplyAmount(value, quantity) {
    return (BigInt(normalizeIntegerAmount(value)) * BigInt(quantity)).toString();
}

export default class ProfessionService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.repository = options.repository || new ProfessionRepository(options);
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    async getDashboard(playerId) {
        const runtimePlayer = await this.loadPlayer(playerId);
        const persisted = await this.repository.listProgress(playerId);
        const jobs = await this.repository.listJobs(playerId);
        const learnedRecipeIds = new Set(await this.repository.listLearnedRecipeIds(playerId));
        const progressById = new Map(persisted.map((entry) => [entry.professionId, entry]));
        return {
            playerId,
            professions: Object.values(this.gameDataManager.getCollection('professions') || {}).map((profession) => {
                const progress = progressById.get(profession.id) || {
                    professionId: profession.id, experience: '0', grade: 1,
                    dataRevision: this.rules().revision
                };
                const activeJob = jobs.find((job) => job.professionId === profession.id && job.status === 'IN_PROGRESS');
                return {
                    id: profession.id, name: profession.name, status: profession.status,
                    grade: progress.grade, gradeName: this.grade(progress.grade)?.name || String(progress.grade),
                    experience: progress.experience,
                    currentGradeExperience: this.grade(progress.grade).cumulativeExperience,
                    nextGradeExperience: progress.grade < 9
                        ? this.grade(progress.grade + 1).cumulativeExperience : null,
                    recipes: this.recipeViews(profession.id, progress, runtimePlayer, learnedRecipeIds),
                    activeJob: activeJob ? this.jobView(activeJob) : null
                };
            })
        };
    }

    async start(playerId, recipeId, batchQuantity = 1, options = {}) {
        if (!options.operationId) throw new Error('PROFESSION_START_OPERATION_ID_REQUIRED');
        const batch = Number(batchQuantity);
        const rules = this.rules();
        if (!Number.isSafeInteger(batch) || batch < rules.batch.minimum || batch > rules.batch.maximum) {
            throw new Error('PROFESSION_BATCH_OUT_OF_RANGE');
        }
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'PROFESSION_CRAFT_START',
            requestHash: createRequestHash({ operationType: 'PROFESSION_CRAFT_START', playerId, recipeId, batch })
        }, async (client) => {
            const player = await this.loadPlayer(playerId, client, true);
            const recipe = this.recipe(recipeId);
            const profession = this.gameDataManager.requireRecord('professions', recipe.professionId);
            if (profession.status !== 'ACTIVE') throw new Error('PROFESSION_NOT_ACTIVE');
            const progress = await this.repository.lockProgress(client, playerId, profession.id, rules.revision);
            await this.assertRecipeAvailable(client, recipe, progress, player);

            const recipeGrade = this.grade(recipe.professionGrade);
            const durationMinutes = Number(recipe.durationMinutes || recipeGrade.baseDurationMinutes) * batch;
            const startedAt = options.startedAt || this.timeProvider.now();
            const readyAt = new Date(new Date(startedAt).getTime() + durationMinutes * 60_000);
            const inputSnapshot = {
                currency: {
                    currencyId: recipe.costCurrency.currencyId,
                    amount: multiplyAmount(recipe.costCurrency.amount, batch)
                },
                materials: recipe.materials.map((material) => ({
                    itemId: material.itemId,
                    quantity: multiplyAmount(material.quantity, batch)
                }))
            };
            const outputSnapshot = {
                ...recipe.output,
                quantity: multiplyAmount(recipe.output.quantity, batch)
            };
            const experienceReward = this.experienceReward(recipe.professionGrade, progress.grade, batch);
            const job = await this.repository.createJob(client, {
                playerId, professionId: profession.id, recipeId: recipe.id, batchQuantity: batch,
                professionGradeAtStart: progress.grade, experienceReward, inputSnapshot, outputSnapshot,
                operationId: options.operationId, startedAt, readyAt
            });
            const consumed = await this.repository.consumeInputs(client, {
                playerId, jobId: job.jobId, inputSnapshot,
                operationId: options.operationId, startedAt
            });
            return { outcome: 'PROFESSION_CRAFT_STARTED', job: this.jobView(job), consumed };
        });
    }

    async claim(playerId, jobId, options = {}) {
        if (!options.operationId) throw new Error('PROFESSION_CLAIM_OPERATION_ID_REQUIRED');
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'PROFESSION_CRAFT_CLAIM',
            businessKey: `PROFESSION_CRAFT_JOB:${jobId}`,
            retentionPolicy: 'ONE_TIME_CLAIM',
            requestHash: createRequestHash({ operationType: 'PROFESSION_CRAFT_CLAIM', playerId, jobId: String(jobId) })
        }, async (client) => {
            const player = await this.loadPlayer(playerId, client, true);
            const job = await this.repository.lockJob(client, playerId, jobId);
            if (job.status !== 'IN_PROGRESS') throw new Error('PROFESSION_CRAFT_JOB_NOT_CLAIMABLE');
            const claimedAt = options.claimedAt || this.timeProvider.now();
            if (new Date(claimedAt).getTime() < new Date(job.readyAt).getTime()) {
                throw new Error('PROFESSION_CRAFT_JOB_NOT_READY');
            }
            if (job.outputSnapshot.type !== 'ITEM') {
                throw new Error('PROFESSION_EQUIPMENT_OUTPUT_POLICY_REQUIRED');
            }
            const itemRules = this.gameDataManager.getCollection('itemRules') || {};
            const output = await this.repository.applyItemOutput(client, {
                playerId, jobId: job.jobId, output: job.outputSnapshot,
                inventoryCapacity: Number(itemRules.inventory?.defaultSlot || 0),
                operationId: options.operationId, claimedAt
            });
            const progress = await this.repository.lockProgress(
                client, playerId, job.professionId, this.rules().revision
            );
            const experience = (BigInt(progress.experience) + BigInt(job.experienceReward)).toString();
            const grade = this.resolvePromotedGrade(experience, progress.grade, player.realmId);
            const updatedProgress = await this.repository.updateProgress(client, {
                playerId, professionId: job.professionId, experience, grade,
                dataRevision: this.rules().revision, updatedAt: claimedAt
            });
            const resultSnapshot = { output, experienceReward: job.experienceReward, progress: updatedProgress };
            const completedJob = await this.repository.completeJob(client, {
                jobId: job.jobId, resultSnapshot, operationId: options.operationId, claimedAt
            });
            return {
                outcome: 'PROFESSION_CRAFT_CLAIMED',
                job: this.jobView(completedJob), output, progress: updatedProgress
            };
        });
    }

    async assertRecipeAvailable(client, recipe, progress, player) {
        if (progress.grade < recipe.professionGrade) throw new Error('PROFESSION_GRADE_LOCKED');
        if (!this.isRealmUnlocked(recipe.requiredRealm, player.realmId)) throw new Error('REALM_LOCKED');
        if (recipe.unlockMode === 'LEARNED'
            && !await this.repository.hasLearnedRecipe(client, player.playerId, recipe.id)) {
            throw new Error('PROFESSION_RECIPE_NOT_LEARNED');
        }
        const currencyBalance = player.currencies?.[recipe.costCurrency.currencyId] || '0';
        if (compareIntegerAmounts(currencyBalance, recipe.costCurrency.amount) < 0) {
            throw new Error('INSUFFICIENT_CURRENCY');
        }
    }

    recipeViews(professionId, progress, player, learnedRecipeIds = new Set()) {
        return Object.values(this.gameDataManager.getCollection('craftTemplates') || {})
            .filter((recipe) => recipe.professionId === professionId)
            .map((recipe) => {
                const outputId = recipe.output.itemId || recipe.output.equipmentTemplateId;
                const outputCollection = recipe.output.type === 'EQUIPMENT'
                    ? 'equipmentTemplates' : 'itemTemplates';
                const grade = this.grade(recipe.professionGrade);
                const learned = recipe.unlockMode !== 'LEARNED' || learnedRecipeIds.has(recipe.id);
                return {
                    id: recipe.id, name: recipe.name, professionGrade: recipe.professionGrade,
                    professionGradeName: grade.name,
                    requiredRealm: recipe.requiredRealm, unlockMode: recipe.unlockMode, learned,
                    output: recipe.output,
                    outputName: this.gameDataManager.getRecord(outputCollection, outputId)?.name || outputId,
                    costCurrency: {
                        ...recipe.costCurrency,
                        owned: player.currencies?.[recipe.costCurrency.currencyId] || '0'
                    },
                    materials: recipe.materials.map((material) => {
                        const template = this.gameDataManager.getRecord(
                            'itemTemplates',
                            material.itemId
                        );
                        const map = template?.mapId
                            ? this.gameDataManager.getRecord('maps', template.mapId)
                            : null;
                        return {
                            ...material,
                            name: template?.name || material.itemId,
                            owned: this.countItem(player, material.itemId),
                            resourceFamily: template?.family || null,
                            resourceRole: template?.role || null,
                            source: {
                                mapId: map?.id || null,
                                mapName: map?.name || null,
                                methods: [...(template?.sources || [])]
                            }
                        };
                    }),
                    durationMinutes: Number(recipe.durationMinutes || grade.baseDurationMinutes),
                    available: progress.grade >= recipe.professionGrade
                        && this.isRealmUnlocked(recipe.requiredRealm, player.realmId)
                        && learned
                };
            });
    }

    jobView(job) {
        const now = this.timeProvider.now();
        return {
            ...job,
            computedStatus: job.status === 'IN_PROGRESS' && new Date(now) >= new Date(job.readyAt)
                ? 'READY' : job.status
        };
    }

    experienceReward(recipeGrade, currentGrade, batch) {
        const rules = this.rules();
        let reward = BigInt(this.grade(recipeGrade).recipeExperience) * BigInt(batch);
        if (currentGrade - recipeGrade >= rules.lowGradeExperiencePenalty.minimumGradeDifference) {
            reward = reward * BigInt(rules.lowGradeExperiencePenalty.multiplierBasisPoints) / 10_000n;
        }
        return reward.toString();
    }

    resolvePromotedGrade(experience, currentGrade, playerRealmId) {
        const currentRealm = this.gameDataManager.getRecord('realms', playerRealmId);
        let resolved = currentGrade;
        for (const grade of Object.values(this.gameDataManager.getCollection('professionGrades') || {})) {
            const requiredRealm = Object.values(this.gameDataManager.getCollection('realms') || {})
                .find((realm) => realm.code === grade.minRealm);
            if (compareIntegerAmounts(experience, grade.cumulativeExperience) >= 0
                && Number(requiredRealm?.order || Infinity) <= Number(currentRealm?.order || 0)) {
                resolved = Math.max(resolved, grade.grade);
            }
        }
        return resolved;
    }

    async loadPlayer(playerId, client = null, forUpdate = false) {
        const player = await this.playerRuntimeRepository?.findById(playerId, {
            client: client || undefined, forUpdate
        });
        if (!player) throw new Error('PLAYER_NOT_FOUND');
        return player;
    }

    isRealmUnlocked(requiredRealmCode, playerRealmId) {
        if (!requiredRealmCode) return true;
        const required = Object.values(this.gameDataManager.getCollection('realms') || {})
            .find((realm) => realm.code === requiredRealmCode);
        const current = this.gameDataManager.getRecord('realms', playerRealmId);
        return Boolean(required && current && Number(current.order) >= Number(required.order));
    }

    countItem(player, itemId) {
        return (player.inventory?.runtimeItems || [])
            .filter((entry) => entry.templateId === itemId)
            .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
    }

    recipe(recipeId) {
        return this.gameDataManager.requireRecord('craftTemplates', recipeId);
    }

    grade(grade) {
        return this.gameDataManager.requireRecord('professionGrades', String(grade));
    }

    rules() {
        return this.gameDataManager.getCollection('professionRules');
    }
}
