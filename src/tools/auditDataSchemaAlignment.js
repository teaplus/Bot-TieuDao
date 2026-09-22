import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import Player from '../core/Player.js';
import ItemFactory from '../factories/ItemFactory.js';
import SkillFactory from '../factories/SkillFactory.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import CultivationArtService from '../gameplay/player/CultivationArtService.js';
import PlayerStartService from '../gameplay/player/PlayerStartService.js';
import SkillService from '../gameplay/player/SkillService.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import FormulaEngine from '../battle/formulas/FormulaEngine.js';
import GameDataNormalizer from '../foundation/game-data/GameDataNormalizer.js';
import GameDataValidator from '../foundation/game-data/GameDataValidator.js';
import BattleSkillFactory from '../battle/factory/BattleSkillFactory.js';
import MonsterGeneratorService from '../gameplay/monsters/MonsterGeneratorService.js';
import MapEncounterService from '../gameplay/maps/MapEncounterService.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';
import BattleEngine from '../battle/BattleEngine.js';
import BattleContext from '../battle/context/BattleContext.js';
import ActionExecutor, { EXECUTABLE_BATTLE_ACTION_TYPES } from '../battle/actions/ActionExecutor.js';
import ConditionEvaluator from '../battle/conditions/ConditionEvaluator.js';
import createSeededRandom from '../platform/random/createSeededRandom.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';
import BattleResult from '../battle/results/BattleResult.js';
import ElementRelationResolver from '../battle/elements/ElementRelationResolver.js';
import SectEffectResolver from '../gameplay/sect/SectEffectResolver.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

function createFakeRuntimePlayer(overrides = {}) {
    return new RuntimePlayerFactory().create({
        playerId: 'audit-player',
        name: 'Audit Player',
        realmId: 1,
        cultivation: 0,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Hoa Linh Can',
        spiritStones: 100,
        baseAtk: 10,
        baseDef: 10,
        baseHp: 100,
        baseSpd: 10,
        inventory: [
            {
                instanceId: 'audit-art-book',
                itemId: 'CP_WOOD_HOANG',
                quantity: 1,
                rarity: 'HOANG',
                instanceData: {}
            },
            {
                instanceId: 'audit-skill-book',
                itemId: 'BOOK_SK_FIRE_HOANG',
                quantity: 1,
                rarity: 'HOANG',
                instanceData: {}
            }
        ],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastCultivate: new Date(),
        lastTreasureHunt: null,
        ...overrides
    });
}

const APPROVED_PENDING_BATTLE_ACTION_TYPES = Object.freeze([]);

function auditBattleSkillFactory(gameDataManager) {
    const factory = new BattleSkillFactory({ gameDataManager });
    const skill = factory.create('SK_FIRE_HOANG');

    assert(skill, 'BattleSkillFactory cannot create the normalized fire skill');
    assert(skill.target === 'ENEMY_SINGLE', 'Battle skill target object was not normalized to a strategy', skill);
    assert(skill.actions.length === 2, 'Battle skill lost normalized actions', skill);
    assert(skill.actions[0].order === 1 && skill.actions[1].order === 2, 'Battle actions are not deterministically ordered', skill.actions);
    assert(skill.actions[0].id === 'SK_FIRE_HOANG_ACTION_01'
        && skill.actions[1].id === 'SK_FIRE_HOANG_ACTION_02', 'Battle action identity was not preserved', skill.actions);
    assert(skill.actions[0].effectId === 'ELEMENT_FIRE', 'Battle effect action lost effectId', skill.actions[0]);
    assert(skill.actions[1].formulaId === 'SKILL_DAMAGE', 'Battle damage action lost formulaId', skill.actions[1]);
    assert(Object.isFrozen(skill) && Object.isFrozen(skill.actions) && skill.actions.every(Object.isFrozen), 'Runtime battle skill must be immutable', skill);

    return {
        skillId: skill.id,
        target: skill.target,
        actionIds: skill.actions.map((action) => action.id),
        actionTypes: skill.actions.map((action) => action.type)
    };
}

function auditMonsterRewardResolution(gameDataManager) {
    const service = new MonsterGeneratorService({ gameDataManager, random: () => 0 });
    const luyenKhiMonster = service.createMonster('TPL_MON_FIRE_001');
    const trucCoMonster = service.createMonster('TPL_MON_FIRE_002');

    assert(luyenKhiMonster.rewardTableId === 'MONSTER_LUYEN_KHI', 'Monster reward alias did not resolve for LUYEN_KHI', luyenKhiMonster);
    assert(trucCoMonster.rewardTableId === 'MONSTER_TRUC_CO', 'Monster reward alias did not resolve for TRUC_CO', trucCoMonster);
    const nguyenAnhMonster = service.createMonster('TPL_MON_DRAGON_001');
    const nguyenAnhTable = gameDataManager.requireRecord('rewardTables', nguyenAnhMonster.rewardTableId);
    const nguyenAnhCurrency = nguyenAnhTable.rewards.find((reward) => reward.rewardType === 'CURRENCY');
    const nguyenAnhEquipment = nguyenAnhTable.rewards.find((reward) => reward.rewardType === 'EQUIPMENT');
    assert(nguyenAnhMonster.realmId === 4 && nguyenAnhMonster.stage === 1, 'Nguyen Anh monster baseline must use registry realm and stage 1', nguyenAnhMonster);
    assert(nguyenAnhTable.rollCount === 1, 'Nguyen Anh reward rollCount is not aligned with approved baseline', nguyenAnhTable);
    assert(nguyenAnhCurrency?.quantity?.min === 80 && nguyenAnhCurrency?.quantity?.max === 160, 'Nguyen Anh currency baseline is not 80-160', nguyenAnhCurrency);
    assert(nguyenAnhEquipment?.chance === 8 && nguyenAnhEquipment?.gradePoolId === 'MAP_KET_DAN', 'Nguyen Anh equipment baseline is not aligned', nguyenAnhEquipment);
    const nguyenAnhRewardService = new RewardTableService({ gameDataManager, random: () => 0 });
    assert(nguyenAnhRewardService.pickEquipmentGrade(nguyenAnhEquipment.gradePoolId) === 'HUYEN', 'Nguyen Anh reward did not resolve MAP_KET_DAN grade weights');
    const daoToTable = gameDataManager.requireRecord('rewardTables', 'MONSTER_DAO_TO');
    const daoToEquipment = daoToTable.rewards.find((reward) => reward.rewardType === 'EQUIPMENT');
    assert(daoToTable.rollCount === 1 && daoToEquipment?.chance === 8
        && daoToEquipment?.gradePoolId === 'MAP_DAO_TO',
    'Dao To reward tier is not aligned with the approved late-game policy', daoToTable);
    assert(nguyenAnhRewardService.pickEquipmentGrade('MAP_DAO_TO') === 'THAN',
        'Dao To grade pool did not resolve to THAN');

    const errors = [];
    new GameDataValidator().validateMonsterData({
        realms: gameDataManager.getCollection('realms'),
        rewardTables: gameDataManager.getCollection('rewardTables'),
        monsterRules: {
            rewardResolution: {
                aliases: {
                    BROKEN_ALIAS: {
                        strategy: 'BY_REALM_ORDER',
                        realmOrderTableIds: { 1: 'MISSING_TABLE' }
                    }
                }
            }
        },
        monsterTemplates: {}
    }, errors);
    assert(errors.some((error) => error.includes('rewardTables.MISSING_TABLE')), 'Monster reward alias validator accepted a missing target', { errors });

    return {
        BASIC_MONSTER_DROP: {
            1: luyenKhiMonster.rewardTableId,
            2: trucCoMonster.rewardTableId,
            3: new MonsterGeneratorService({ gameDataManager, random: () => 0 })
                .createMonster('TPL_MON_LIGHTNING_002').rewardTableId,
            4: nguyenAnhMonster.rewardTableId,
            15: 'MONSTER_DAO_TO'
        }
    };
}

function auditMapAndGradePoolRuntime(gameDataManager) {
    const mapService = new MapEncounterService({ gameDataManager, random: () => 0 });
    const selection = mapService.select('THANH_VAN_SON_MACH', 1);
    assert(selection.pool.id === 'POOL_TRUC_LAM', 'Map did not resolve its spawn pool', selection);
    assert(selection.monsterId === 'MON_BEAST_SPIRIT_RABBIT', 'Weighted map selection is not deterministic with injected random', selection);

    let lockedError = null;
    try {
        mapService.select('HUYEN_MOC_QUOC', 1);
    } catch (error) {
        lockedError = error.message;
    }
    assert(lockedError === 'MAP_LOCKED:HUYEN_MOC_QUOC', 'Map unlock condition was not enforced', { lockedError });

    const thienMonSelection = mapService.select('DONG_HOANG_DAI_LUC', 3);
    assert(thienMonSelection.monsterId === 'MON_BEAST_WHITE_TIGER'
        && thienMonSelection.variantId === 'NORMAL', 'Active THIEN_MON selection mismatch', thienMonSelection);

    const rewardService = new RewardTableService({ gameDataManager, random: () => 0 });
    assert(rewardService.pickEquipmentGrade('MAP_TRUC_CO') === 'HOANG', 'Direct gradePoolId lookup did not use configured weights');

    return {
        activeMaps: Object.values(gameDataManager.getCollection('maps')).filter((map) => map.status === 'ACTIVE').length,
        pendingMaps: Object.values(gameDataManager.getCollection('maps')).filter((map) => map.status === 'CONTENT_PENDING').length,
        selectedMonsterId: selection.monsterId,
        thienMonMonsterId: thienMonSelection.monsterId,
        lockedError,
        gradePoolContract: 'DIRECT_REFERENCE'
    };
}

function auditBattleExecutorCoverage(gameDataManager) {
    const coreEffects = Object.values(gameDataManager.getCollection('coreEffects') || {});
    const skills = Object.values(gameDataManager.getCollection('skills') || {});
    const usedActionTypes = [...new Set([
        ...coreEffects.flatMap((effect) => (effect.actions || []).map((action) => action.type)),
        ...skills.flatMap((skill) => (skill.combat?.actions || []).map((action) => action.type))
    ])].sort();
    const unsupported = usedActionTypes.filter((actionType) => !ActionExecutor.supports(actionType));
    const unexpectedUnsupported = unsupported.filter(
        (actionType) => !APPROVED_PENDING_BATTLE_ACTION_TYPES.includes(actionType)
    );
    const stalePending = APPROVED_PENDING_BATTLE_ACTION_TYPES.filter(
        (actionType) => !unsupported.includes(actionType)
    );

    assert(unexpectedUnsupported.length === 0, 'GameData uses battle actions without executor or approved blocker', {
        unexpectedUnsupported,
        usedActionTypes
    });
    assert(stalePending.length === 0, 'Pending battle action allowlist is stale', { stalePending, unsupported });

    const customExecutor = new ActionExecutor({
        gameDataManager,
        random: () => 0,
        actionExecutors: {
            AUDIT_CUSTOM: (context, actor, action, targets) => ({
                actionType: action.type,
                actorId: actor.id,
                targetIds: targets.map((target) => target.id),
                results: [{ type: 'AUDIT_CUSTOM_RESULT' }]
            })
        }
    });
    const customActor = createAuditBattleEntity('registry-actor', 'A');
    const customTarget = createAuditBattleEntity('registry-target', 'B');
    const customContext = new BattleContext({ teams: { A: [customActor], B: [customTarget] } });
    const customResult = customExecutor.execute(
        customContext,
        customActor,
        { type: 'AUDIT_CUSTOM' },
        [customTarget]
    );
    assert(customExecutor.supports('AUDIT_CUSTOM'), 'Injected Action executor was not registered');
    assert(customResult.results[0].type === 'AUDIT_CUSTOM_RESULT', 'Injected Action executor was not dispatched', customResult);
    assert(ActionExecutor.supports('AUDIT_CUSTOM') === false, 'Custom executor leaked into built-in static coverage');

    return {
        usedActionTypes,
        executableActionTypes: EXECUTABLE_BATTLE_ACTION_TYPES,
        pendingActionTypes: unsupported,
        registryDispatch: true,
        customInjection: true
    };
}

function createAuditBattleEntity(id, team, overrides = {}) {
    return new BattleEntity({
        id,
        name: id,
        team,
        sourceType: 'AUDIT',
        battleStat: { hp: 100, atk: 100, def: 0, spd: 10, ...(overrides.battleStat || {}) },
        skills: overrides.skills || [],
        effects: overrides.effects || [],
        currentHP: overrides.currentHP
    });
}

function auditApprovedCombatPolicies() {
    const skippedActor = createAuditBattleEntity('control-skip', 'A', {
        skills: ['SK_FIRE_HOANG'],
        effects: [{ id: 'STUN', controlDirective: 'SKIP_ACTION', remainingTurns: 1 }]
    });
    const skipTarget = createAuditBattleEntity('control-skip-target', 'B');
    const skipContext = new BattleContext({ teams: { A: [skippedActor], B: [skipTarget] }, random: () => 0 });
    new BattleEngine({ random: () => 0 }).executeTurn(skipContext, skippedActor);
    assert(skipTarget.currentHP === '100', 'SKIP_ACTION allowed an attack', { events: skipContext.eventQueue });
    assert(skipContext.eventQueue.some((event) => event.type === 'TURN_END'), 'SKIP_ACTION skipped TURN_END lifecycle');
    assert(!skippedActor.effects.some((effect) => effect.id === 'STUN'), 'One-turn control did not expire after lifecycle');

    const silencedActor = createAuditBattleEntity('control-silence', 'A', {
        skills: ['SK_FIRE_HOANG'],
        effects: [{ id: 'SILENCE', controlDirective: 'BASIC_ATTACK_ONLY', remainingTurns: 2 }]
    });
    const silenceTarget = createAuditBattleEntity('control-silence-target', 'B');
    const silenceContext = new BattleContext({ teams: { A: [silencedActor], B: [silenceTarget] }, random: () => 0 });
    new BattleEngine({ random: () => 0 }).executeTurn(silenceContext, silencedActor);
    assert(silenceContext.combatLog.some((entry) => entry.details?.skillId === 'BASIC_ATTACK'), 'BASIC_ATTACK_ONLY did not replace active skill');
    assert(!silenceContext.eventQueue.some((event) => event.type === 'APPLY_EFFECT'), 'Silenced actor executed an active skill effect');

    const chainActor = createAuditBattleEntity('chain-actor', 'A');
    const chainTargets = [1, 2, 3, 4].map((index) => createAuditBattleEntity(`chain-target-${index}`, 'B'));
    const chainContext = new BattleContext({ teams: { A: [chainActor], B: chainTargets }, random: () => 0 });
    const chainEngine = new BattleEngine({ random: () => 0 });
    const chainResult = chainEngine.actionPipeline.executeResolved({
        battleContext: chainContext,
        caster: chainActor,
        action: {
        type: 'CHAIN_DAMAGE',
        arguments: {
            formulaId: 'LIGHTNING_CHAIN',
            maxTargets: 3,
            allowRepeat: false,
            targetStrategy: 'ENEMY_RANDOM_WITHOUT_REPLACEMENT',
            jumpMultipliers: [1, 0.7, 0.4]
        }
        },
        candidates: [chainTargets[0]]
    }).actionResult;
    assert(new Set(chainResult.targetIds).size === 3 && chainResult.targetIds.length === 3, 'CHAIN_DAMAGE target selection repeated or used wrong count', chainResult);
    assert(JSON.stringify(chainResult.results.map((result) => result.amount)) === JSON.stringify(['64', '44', '25']), 'CHAIN_DAMAGE jump multipliers are incorrect', chainResult.results);

    const attacker = createAuditBattleEntity('passive-attacker', 'A');
    const defender = createAuditBattleEntity('passive-defender', 'B', {
        battleStat: { hp: 100, atk: 20, def: 0, spd: 10 },
        skills: ['DEF_FIRE_HOANG']
    });
    const passiveContext = new BattleContext({ teams: { A: [attacker], B: [defender] }, random: () => 0 });
    const passiveEngine = new BattleEngine({ random: () => 0 });
    for (let actionIndex = 0; actionIndex < 2; actionIndex += 1) {
        passiveEngine.actionPipeline.executeResolved({
            battleContext: passiveContext,
            caster: attacker,
            action: {
                type: 'DAMAGE',
                formulaId: 'NORMAL_DAMAGE',
                arguments: {}
            },
            actionIndex,
            candidates: [defender]
        });
    }
    const passiveTriggers = passiveContext.eventQueue.filter((event) => event.type === 'PASSIVE_SKILL_TRIGGERED');
    assert(passiveTriggers.length === 1, 'Defense passive must trigger once per battle', passiveTriggers);
    const defenseMarker = defender.effects.find((effect) => effect.id === 'DEFENSE_FIRE');
    assert(defenseMarker?.remainingTurns === 2, 'Defense marker duration is not two turns', defenseMarker);

    return {
        controlPriority: ['SKIP_ACTION', 'BASIC_ATTACK_ONLY', 'NORMAL_ACTION'],
        chainTargetIds: chainResult.targetIds,
        chainDamage: chainResult.results.map((result) => result.amount),
        passiveTriggerCount: passiveTriggers.length,
        defenseMarkerDuration: defenseMarker.remainingTurns
    };
}

function auditActionLifecycleHooks() {
    const actor = createAuditBattleEntity('lifecycle-actor', 'A');
    const targets = [1, 2, 3].map((index) => createAuditBattleEntity(
        `lifecycle-target-${index}`,
        'B',
        { battleStat: { hp: 500, atk: 10, def: 0, spd: 5 } }
    ));
    const context = new BattleContext({ teams: { A: [actor], B: targets }, random: () => 0 });
    const engine = new BattleEngine({ random: () => 0 });
    const execution = engine.actionPipeline.executeResolved({
        battleContext: context,
        caster: actor,
        skill: { id: 'LIFECYCLE_AUDIT' },
        action: {
            type: 'CHAIN_DAMAGE',
            arguments: {
                formulaId: 'LIGHTNING_CHAIN',
                maxTargets: 3,
                jumpMultipliers: [1, 0.7, 0.4]
            }
        },
        actionIndex: 0,
        candidates: [targets[0]]
    });
    const lifecycleEvents = context.eventQueue.filter((event) => (
        event.type === 'BATTLE_TRIGGER'
        && ['BEFORE_ACTION', 'ON_HIT', 'ON_DEATH', 'AFTER_ACTION'].includes(event.timing)
    ));
    const beforeEvents = lifecycleEvents.filter((event) => event.timing === 'BEFORE_ACTION');
    const hitEvents = lifecycleEvents.filter((event) => event.timing === 'ON_HIT');
    const afterEvents = lifecycleEvents.filter((event) => event.timing === 'AFTER_ACTION');
    const expectedTargetIds = execution.actionResult.targetIds;

    assert(beforeEvents.length === 1, 'Action emitted more than one BEFORE_ACTION hook', beforeEvents);
    assert(afterEvents.length === 1, 'Action emitted more than one AFTER_ACTION hook', afterEvents);
    assert(hitEvents.length === 3, 'Chain hits did not emit one ON_HIT per result', hitEvents);
    assert(beforeEvents[0].actionType === 'CHAIN_DAMAGE', 'BEFORE_ACTION lost outer action type', beforeEvents[0]);
    assert(afterEvents[0].actionType === 'CHAIN_DAMAGE', 'AFTER_ACTION lost outer action type', afterEvents[0]);
    assert(JSON.stringify(beforeEvents[0].targetIds) === JSON.stringify(expectedTargetIds), 'BEFORE_ACTION did not receive all resolved targets', beforeEvents[0]);
    assert(JSON.stringify(hitEvents.map((event) => event.targetId)) === JSON.stringify(expectedTargetIds), 'Semantic hooks did not preserve target/result order', hitEvents);
    assert(afterEvents[0].result === execution.actionResult, 'AFTER_ACTION did not receive aggregate ActionResult', afterEvents[0]);
    assert(lifecycleEvents[0].timing === 'BEFORE_ACTION' && lifecycleEvents.at(-1).timing === 'AFTER_ACTION', 'Action hook ordering is invalid', lifecycleEvents);
    assert(!Object.hasOwn(engine.actionExecutor, 'triggerDispatcher'), 'ActionExecutor still depends on TriggerDispatcher');
    assert(!Object.hasOwn(engine.actionExecutor, 'passiveSkillEngine'), 'ActionExecutor still owns reactive passive orchestration');

    return {
        policy: 'ONE_LIFECYCLE_PER_ACTION',
        actionType: 'CHAIN_DAMAGE',
        targetIds: expectedTargetIds,
        ordering: lifecycleEvents.map((event) => event.timing),
        aggregateAfterAction: true,
        executorTriggerIndependent: true
    };
}

function auditEffectLifecycle(gameDataManager) {
    const source = createAuditBattleEntity('effect-source', 'A');
    const owner = createAuditBattleEntity('effect-owner', 'B', {
        battleStat: { hp: 500, atk: 20, def: 0, spd: 10 }
    });
    const context = new BattleContext({ teams: { A: [source], B: [owner] }, random: () => 0 });
    const engine = new BattleEngine({ random: () => 0 });

    const firstBurn = engine.effectEngine.applyEffect(context, owner, 'BURN', source);
    const secondBurn = engine.effectEngine.applyEffect(context, owner, 'BURN', source);
    const runtimeBurns = owner.effects.filter((effect) => effect.id === 'BURN');
    assert(runtimeBurns.length === 1 && runtimeBurns[0].stack === 2, 'Stackable effect did not merge into one runtime state', {
        firstBurn,
        secondBurn,
        runtimeBurns
    });
    assert(runtimeBurns[0].remainingTurns === 3, 'Reapplying effect did not refresh configured duration', runtimeBurns[0]);

    engine.effectEngine.expireEffects(context, owner);
    engine.effectEngine.expireEffects(context, owner);
    assert(owner.effects.some((effect) => effect.id === 'BURN'), 'Effect expired before configured duration');
    engine.effectEngine.expireEffects(context, owner);
    assert(!owner.effects.some((effect) => effect.id === 'BURN'), 'Effect remained after configured duration');

    const chainTargets = [1, 2, 3].map((index) => createAuditBattleEntity(`instant-chain-${index}`, 'B'));
    const instantContext = new BattleContext({ teams: { A: [source], B: chainTargets }, random: () => 0 });
    const instantEngine = new BattleEngine({ random: () => 0 });
    const instantResult = instantEngine.effectEngine.applyEffect(
        instantContext,
        chainTargets[0],
        'CHAIN_DAMAGE',
        source
    );
    assert(instantResult.transient === true, 'INSTANT effect did not return transient execution result', instantResult);
    assert(!chainTargets[0].effects.some((effect) => effect.id === 'CHAIN_DAMAGE'), 'INSTANT effect leaked into runtime effect state', chainTargets[0].effects);
    const chainEvent = instantContext.eventQueue.find((event) => event.type === 'CHAIN_DAMAGE');
    assert(chainEvent?.targetIds.length === 3, 'INSTANT Chain Damage did not execute its action pipeline', chainEvent);

    const validationErrors = [];
    new GameDataValidator().validateCoreEffects({
        coreEffects: {
            INVALID_DURATION: {
                type: 'STATUS', duration: 0, stackable: true, maxStack: 0,
                events: [{ event: 'UNKNOWN_EVENT', chance: 101 }], actions: []
            }
        },
        actionTypes: {}, targets: {}, formulas: {}, modifiers: {}
    }, validationErrors);
    assert(validationErrors.some((error) => error.includes('.duration must be a positive integer')), 'Effect validator accepted invalid duration', validationErrors);
    assert(validationErrors.some((error) => error.includes('.maxStack must be a positive integer')), 'Effect validator accepted invalid maxStack', validationErrors);
    assert(validationErrors.some((error) => error.includes('.event is invalid')), 'Effect validator accepted unknown event', validationErrors);
    assert(validationErrors.some((error) => error.includes('.chance must be between 0 and 100')), 'Effect validator accepted invalid event chance', validationErrors);

    return {
        stackAfterReapply: runtimeBurns[0].stack,
        durationAfterReapply: 3,
        expiredAfterTurns: 3,
        instantEffectStored: false,
        instantChainTargets: chainEvent.targetIds,
        validationGuards: ['duration', 'maxStack', 'event', 'chance']
    };
}

function auditConditionRegistry(gameDataManager) {
    const self = createAuditBattleEntity('condition-self', 'A', {
        battleStat: { hp: 100, atk: 10, def: 0, spd: 10 },
        currentHP: 25,
        effects: [{ id: 'BURN', remainingTurns: 2 }]
    });
    const target = createAuditBattleEntity('condition-target', 'B', {
        battleStat: { hp: 200, atk: 10, def: 0, spd: 10 },
        currentHP: 80
    });
    const evaluator = new ConditionEvaluator({ gameDataManager });

    assert(evaluator.evaluate('SELF_HP_LTE_30', { self, target }) === true, 'HP_PERCENT SELF predicate failed');
    assert(evaluator.evaluate('TARGET_HP_LTE_30', { self, target }) === false, 'HP_PERCENT TARGET predicate failed');
    assert(evaluator.evaluate('SELF_HAS_BURN', { self, target }) === true, 'HAS_EFFECT predicate failed');
    assert(evaluator.evaluate('SELF_ALIVE_AND_HP_LTE_30', { self, target }) === true, 'ALL condition group failed');
    assert(evaluator.evaluate('SELF_HAS_BURN_OR_HP_LTE_30', { self, target }) === true, 'ANY condition group failed');

    let missingConditionError = null;
    try {
        evaluator.evaluate('MISSING_CONDITION', { self, target });
    } catch (error) {
        missingConditionError = error.message;
    }
    assert(missingConditionError === 'CONDITION_NOT_FOUND:MISSING_CONDITION', 'Missing condition did not fail fast', { missingConditionError });

    const composite = gameDataManager.requireRecord('conditions', 'SELF_ALIVE_AND_HP_LTE_30');
    assert(Object.isFrozen(composite) && Object.isFrozen(composite.root) && Object.isFrozen(composite.root.children), 'Condition definition must be deeply immutable');

    const actor = createAuditBattleEntity('condition-actor', 'A', {
        battleStat: { hp: 100, atk: 20, def: 0, spd: 10 }
    });
    const lowTarget = createAuditBattleEntity('condition-low-target', 'B', {
        battleStat: { hp: 100, atk: 10, def: 0, spd: 5 }, currentHP: 20
    });
    const highTarget = createAuditBattleEntity('condition-high-target', 'B', {
        battleStat: { hp: 100, atk: 10, def: 0, spd: 5 }, currentHP: 80
    });
    const conditionedSkill = {
        id: 'AUDIT_CONDITION_SKILL', name: 'Audit Condition Skill', target: 'ENEMY_ALL',
        actions: [{
            type: 'DAMAGE', target: 'ENEMY_ALL', formulaId: 'NORMAL_DAMAGE',
            conditionId: 'TARGET_HP_LTE_30', arguments: {}
        }]
    };
    const conditionContext = new BattleContext({
        teams: { A: [actor], B: [lowTarget, highTarget] }, random: () => 0
    });
    const conditionEngine = new BattleEngine({
        random: () => 0,
        skillManager: { selectSkill: () => conditionedSkill, createBasicAttack: () => conditionedSkill }
    });
    conditionEngine.executeTurn(conditionContext, actor);
    assert(lowTarget.currentHP < 20, 'Per-target Condition did not execute on matching target', { lowTarget });
    assert(highTarget.currentHP === '80', 'Per-target Condition did not filter non-matching target', { highTarget });
    const filterEvent = conditionContext.eventQueue.find((event) => event.type === 'ACTION_TARGETS_FILTERED_CONDITION');
    assert(filterEvent?.rejectedTargetIds.includes(highTarget.id), 'Condition filtering was not recorded', filterEvent);

    const skippedContext = new BattleContext({
        teams: {
            A: [createAuditBattleEntity('condition-skip-actor', 'A')],
            B: [createAuditBattleEntity('condition-skip-target', 'B')]
        },
        random: () => 0
    });
    const skippedSkill = {
        ...conditionedSkill,
        actions: [{ ...conditionedSkill.actions[0], conditionId: 'TARGET_HP_LTE_30' }]
    };
    const skippedEngine = new BattleEngine({
        random: () => 0,
        skillManager: { selectSkill: () => skippedSkill, createBasicAttack: () => skippedSkill }
    });
    skippedEngine.executeTurn(skippedContext, skippedContext.teams.A[0]);
    assert(skippedContext.eventQueue.some((event) => event.type === 'ACTION_SKIPPED_CONDITION'), 'All-rejected Action did not emit ACTION_SKIPPED_CONDITION');

    const missingTargetOwner = createAuditBattleEntity('condition-event-owner', 'A', {
        effects: [{
            id: 'AUDIT_CONDITION_EFFECT', source: 'condition-event-owner',
            events: [{ event: 'ON_ATTACK', conditionId: 'TARGET_HP_LTE_30' }], actions: []
        }]
    });
    const eventContext = new BattleContext({
        teams: { A: [missingTargetOwner], B: [createAuditBattleEntity('condition-event-enemy', 'B')] }
    });
    let missingTargetError = null;
    try {
        new BattleEngine({ random: () => 0 }).triggerDispatcher.dispatch(eventContext, 'ON_ATTACK', {
            actorId: missingTargetOwner.id
        });
    } catch (error) {
        missingTargetError = error.message;
    }
    assert(missingTargetError === 'CONDITION_SUBJECT_UNAVAILABLE:TARGET', 'Event Condition without payload target did not fail fast', { missingTargetError });

    return {
        definitions: Object.keys(gameDataManager.getCollection('conditions')).length,
        predicates: ['HP_PERCENT', 'HAS_EFFECT', 'IS_ALIVE'],
        groups: ['ALL', 'ANY'],
        subjects: ['SELF', 'TARGET'],
        failFastMissingId: true,
        immutable: true,
        perTargetFiltering: true,
        allRejectedSkipEvent: true,
        eventMissingTargetFailFast: true
    };
}

function auditExecutionContextPipeline() {
    const caster = createAuditBattleEntity('execution-caster', 'A', {
        battleStat: { hp: 100, atk: 50, def: 0, spd: 10 }
    });
    const target = createAuditBattleEntity('execution-target', 'B', {
        battleStat: { hp: 100, atk: 10, def: 0, spd: 5 }
    });
    const battleContext = new BattleContext({ teams: { A: [caster], B: [target] }, random: () => 0 });
    const engine = new BattleEngine({ random: () => 0 });
    const skill = { id: 'EXECUTION_AUDIT_SKILL', target: 'ENEMY_SINGLE' };
    const action = { type: 'DAMAGE', target: 'ENEMY_SINGLE', formulaId: 'NORMAL_DAMAGE', arguments: {} };
    const execution = engine.actionPipeline.execute({
        battleContext,
        caster,
        skill,
        action,
        actionIndex: 2
    });

    assert(Object.isFrozen(execution) && Object.isFrozen(execution.targets), 'ExecutionContext must be immutable');
    assert(execution.battleContext === battleContext && execution.caster === caster, 'ExecutionContext lost runtime references');
    assert(execution.skill === skill && execution.action === action && execution.actionIndex === 2, 'ExecutionContext lost skill/action identity', execution);
    assert(execution.targets.length === 1 && execution.targets[0] === target, 'ExecutionContext lost resolved targets', execution.targets);
    assert(execution.currentRound === battleContext.round && execution.random === battleContext.random, 'ExecutionContext lost round/random provider');
    assert(execution.actionResult?.results?.[0]?.type === 'DAMAGE', 'ExecutionContext lost ActionResult', execution.actionResult);
    assert(execution.formulaResult?.[0]?.formulaId === 'NORMAL_DAMAGE', 'ExecutionContext lost FormulaResult', execution.formulaResult);

    const skipped = engine.actionPipeline.executeResolved({
        battleContext,
        caster,
        skill,
        action,
        actionIndex: 3,
        candidates: []
    });
    assert(skipped.skipReason === 'NO_TARGET' && skipped.actionResult === null, 'Skipped ExecutionContext is invalid', skipped);

    return {
        immutable: true,
        oneActionPerContext: true,
        resolvedTargets: execution.targets.map((entity) => entity.id),
        formulaId: execution.formulaResult[0].formulaId,
        skippedReason: skipped.skipReason
    };
}

function auditBattleStatContract(gameDataManager) {
    const factory = new BattleEntityFactory({ gameDataManager });
    const stats = factory.calculateBattleStats({ hp: 100, atk: 50, def: 10, spd: 20 }, [
        { stat: 'CRIT', mode: 'add_flat_base', value: 10 },
        { stat: 'CDMG', mode: 'add_percent_base', value: 0.2 },
        { stat: 'PEN', mode: 'add_flat_base', value: 15 },
        { stat: 'SKD', mode: 'add_flat_base', value: 10 },
        { stat: 'LS', mode: 'add_flat_base', value: 5 },
        { stat: 'SHD', mode: 'add_flat_base', value: 12 },
        { stat: 'CCR', mode: 'add_flat_base', value: 10 },
        { stat: 'TEN', mode: 'add_flat_base', value: 10 },
        { stat: 'FINAL_DAMAGE', mode: 'add_flat_base', value: 10 },
        { stat: 'HIT_RATE', mode: 'set', value: 80 }
    ]);
    assert(Object.keys(stats).length === 41
        && stats.fireDamage === '0'
        && stats.windResist === '0'
        && stats.lightDamage === '0'
        && stats.darkResist === '0'
        && stats.chaosDamage === '0',
    'BattleEntityFactory did not materialize all Attribute-backed battle stats', stats);
    assert(stats.critRate === '15' && stats.critDamage === '60', 'CRIT/CDMG percentage-point materialization is incorrect', stats);
    assert(stats.pen === '15' && stats.skillDamage === '10' && stats.lifesteal === '5', 'Offensive secondary stats were dropped', stats);
    assert(stats.shieldPower === '12' && stats.controlRate === '10' && stats.controlResist === '10', 'Defense/control secondary stats were dropped', stats);
    assert(stats.finalDamage === '10' && stats.hitRate === '80', 'Special stat or SET operation was not materialized', stats);

    const attacker = createAuditBattleEntity('stat-attacker', 'A', {
        battleStat: { hp: 100, atk: 100, def: 0, spd: 10, critRate: 15, critDamage: 60 }
    });
    const target = createAuditBattleEntity('stat-target', 'B', {
        battleStat: { hp: 100, atk: 1, def: 0, spd: 5 }
    });
    const criticalResult = new FormulaEngine({ gameDataManager, random: () => 0.149 })
        .calculateDamage(attacker, target, { variance: false });
    assert(criticalResult.critical === true && criticalResult.criticalMultiplier === '1.6', 'Formula boundary did not convert percentage points to probability/multiplier', criticalResult);
    assert(criticalResult.amount === '160', 'Critical damage amount is inconsistent with CDMG bonus points', criticalResult);

    return {
        materializedStats: Object.keys(stats).length,
        critRatePoints: stats.critRate,
        critDamageBonusPoints: stats.critDamage,
        criticalMultiplier: criticalResult.criticalMultiplier
    };
}

function auditElementRelationResolver(gameDataManager) {
    const resolver = new ElementRelationResolver({ gameDataManager });
    const waterCountersFire = resolver.resolve('WATER', 'FIRE');
    const fireGeneratesEarth = resolver.resolve('FIRE', 'EARTH', { relationType: 'GENERATE' });
    const neutral = resolver.resolve('FIRE', 'WATER');
    assert(waterCountersFire.length === 1 && waterCountersFire[0].relationType === 'COUNTER', 'Element resolver lost COUNTER direction', waterCountersFire);
    assert(fireGeneratesEarth.length === 1 && fireGeneratesEarth[0].relationType === 'GENERATE', 'Element resolver lost GENERATE direction', fireGeneratesEarth);
    assert(neutral.length === 0, 'Element resolver invented an unauthorised relation', neutral);
    assert(Object.isFrozen(waterCountersFire), 'Resolved Element relation list must be immutable');

    let missingElementError = null;
    try {
        resolver.resolve('MISSING_ELEMENT', 'FIRE');
    } catch (error) {
        missingElementError = error.code || error.message;
    }
    assert(missingElementError, 'Element resolver did not fail fast for unknown Element');
    return {
        exactDirectionalLookup: true,
        counterId: waterCountersFire[0].id,
        generateId: fireGeneratesEarth[0].id,
        neutralCount: neutral.length,
        mutationFallback: false
    };
}

function auditBattleMetricsAndResult() {
    const attacker = createAuditBattleEntity('metrics-attacker', 'A', {
        battleStat: { hp: 100, atk: 100, def: 0, spd: 10, critRate: 100, critDamage: 50 }
    });
    const target = createAuditBattleEntity('metrics-target', 'B', {
        battleStat: { hp: 100, atk: 10, def: 0, spd: 5 },
        currentHP: 100
    });
    target.currentShield = 20;
    const context = new BattleContext({ teams: { A: [attacker], B: [target] }, random: () => 0 });
    const executor = new ActionExecutor({ random: () => 0 });
    context.metrics.recordTurn();
    context.metrics.recordTurn();
    context.metrics.recordActionTaken(attacker);
    context.metrics.recordActionSkipped(target);

    executor.execute(context, attacker, {
        type: 'DAMAGE', multiplier: 0.5, variance: false, critical: true
    }, [target]);
    executor.execute(context, target, {
        type: 'HEAL', base: 10, multiplier: 1
    }, [target]);
    executor.execute(context, attacker, {
        type: 'ADD_SHIELD', base: 12, multiplier: 1
    }, [target]);
    executor.execute(context, attacker, {
        type: 'APPLY_EFFECT', effectId: 'AUDIT_EFFECT', chance: 100
    }, [target]);
    executor.execute(context, attacker, {
        type: 'DAMAGE', multiplier: 1, variance: false, critical: true
    }, [target]);
    context.end();

    const result = BattleResult.fromContext(context);
    const attackerMetrics = result.statistics.entities.find((entry) => entry.entityId === attacker.id);
    const targetMetrics = result.statistics.entities.find((entry) => entry.entityId === target.id);
    assert(result.outcome === 'TEAM_A_WIN' && result.winnerTeam === 'A' && result.loserTeam === 'B' && result.isDraw === false, 'BattleResult outcome contract is invalid', result);
    assert(result.survivors.length === 1 && result.survivors[0].id === attacker.id, 'BattleResult survivor snapshot is invalid', result.survivors);
    assert(attackerMetrics.damageDealt === '110' && targetMetrics.damageTaken === '110', 'Metrics must record actual HP damage only', result.statistics);
    assert(targetMetrics.shieldAbsorbed === '32', 'Shield absorption metric is incorrect', targetMetrics);
    assert(targetMetrics.healingDone === '10' && targetMetrics.healingReceived === '10', 'Effective healing metrics are incorrect', targetMetrics);
    assert(attackerMetrics.shieldGranted === '12', 'Shield granted metric is incorrect', attackerMetrics);
    assert(attackerMetrics.kills === 1 && targetMetrics.deaths === 1, 'Kill/death metrics are incorrect', result.statistics);
    assert(attackerMetrics.criticalHits === 2 && attackerMetrics.effectsApplied === 1, 'Critical/effect metrics are incorrect', attackerMetrics);
    assert(result.statistics.battle.totalDamage === '110' && result.statistics.battle.totalHealing === '10', 'Battle total amount metrics are incorrect', result.statistics.battle);
    assert(result.statistics.battle.totalShieldAbsorbed === '32' && result.turns === 2, 'Battle total shield/turn metrics are incorrect', result.statistics.battle);
    assert(Object.isFrozen(result.statistics) && Object.isFrozen(result.statistics.entities), 'BattleResult statistics must be immutable');

    const drawContext = new BattleContext({
        teams: {
            A: [createAuditBattleEntity('draw-a', 'A', { currentHP: 0 })],
            B: [createAuditBattleEntity('draw-b', 'B', { currentHP: 0 })]
        }
    });
    drawContext.end();
    const drawResult = BattleResult.fromContext(drawContext);
    assert(drawResult.outcome === 'DRAW' && drawResult.isDraw === true && drawResult.winnerTeam === null && drawResult.loserTeam === null, 'DRAW outcome semantics are invalid', drawResult);

    const roundLimitContext = new BattleContext({
        teams: {
            A: [createAuditBattleEntity('round-limit-a', 'A')],
            B: [createAuditBattleEntity('round-limit-b', 'B')]
        }
    });
    roundLimitContext.enqueueEvent({ type: 'BATTLE_ROUND_LIMIT_REACHED', maxRounds: 15 });
    roundLimitContext.end();
    const roundLimitResult = BattleResult.fromContext(roundLimitContext);
    assert(roundLimitResult.outcome === 'DRAW'
        && roundLimitResult.isDraw === true
        && roundLimitResult.drawReason === 'ROUND_LIMIT'
        && roundLimitResult.rounds === 15,
    'Round limit must produce a 15-round DRAW', roundLimitResult);

    const abortedContext = new BattleContext({
        teams: {
            A: [createAuditBattleEntity('aborted-a', 'A')],
            B: [createAuditBattleEntity('aborted-b', 'B')]
        }
    });
    abortedContext.abort('AUDIT_ABORT');
    const abortedResult = BattleResult.fromContext(abortedContext);
    assert(abortedResult.outcome === 'ABORTED' && abortedResult.winnerTeam === null, 'ABORTED outcome semantics are invalid', abortedResult);

    return {
        outcome: result.outcome,
        totalDamage: result.statistics.battle.totalDamage,
        totalHealing: result.statistics.battle.totalHealing,
        totalShieldAbsorbed: result.statistics.battle.totalShieldAbsorbed,
        survivorIds: result.survivors.map((entry) => entry.id),
        terminalOutcomes: [result.outcome, drawResult.outcome, abortedResult.outcome],
        immutable: true
    };
}

function runDeterministicBattle(seed) {
    const createEntity = (payload) => new BattleEntity(payload);
    const teams = {
        A: [createEntity({
            id: 'replay-player', name: 'Replay Player', team: 'A', sourceType: 'PLAYER',
            battleStat: { hp: 300, atk: 80, def: 25, spd: 10 }, skills: ['SK_FIRE_HOANG']
        })],
        B: [createEntity({
            id: 'replay-monster', name: 'Replay Monster', team: 'B', sourceType: 'MONSTER',
            battleStat: { hp: 260, atk: 55, def: 20, spd: 8 }, skills: ['SK_WOOD_HOANG']
        })]
    };
    const result = new BattleEngine({ random: createSeededRandom(seed), maxRounds: 10 }).run({
        battleId: `replay:${seed}`,
        teams
    });
    return {
        battleId: result.battleId,
        winnerTeam: result.winnerTeam,
        rounds: result.rounds,
        turns: result.turns,
        combatLog: result.combatLog,
        events: result.events,
        entities: result.entities
    };
}

function auditDeterministicBattleReplay() {
    const first = runDeterministicBattle(20260716);
    const second = runDeterministicBattle(20260716);
    assert(JSON.stringify(first) === JSON.stringify(second), 'Battle replay differs for identical seed and input', {
        first,
        second
    });
    return {
        seed: 20260716,
        winnerTeam: first.winnerTeam,
        rounds: first.rounds,
        events: first.events.length
    };
}

function auditExchangeLimitContract() {
    const normalized = new GameDataNormalizer().normalize({
        exchangeTemplates: {
            exchanges: [{
                id: 'AUDIT_EXCHANGE',
                limit: [
                    { periodType: 'daily', value: '3' },
                    { periodType: 'LIFETIME', value: '10' }
                ]
            }]
        }
    }).exchangeTemplates.AUDIT_EXCHANGE;
    assert(normalized.limit[0].periodType === 'DAILY', 'Exchange period type was not normalized', normalized.limit);
    assert(normalized.limit[1].value === '10', 'Exchange limit lost integer-string precision', normalized.limit);

    const errors = [];
    new GameDataValidator().validateEconomyTemplates({
        exchangeTemplates: { AUDIT_EXCHANGE: normalized }
    }, errors);
    assert(errors.length === 0, 'Valid exchange limit contract was rejected', { errors });

    const duplicateErrors = [];
    new GameDataValidator().validateEconomyTemplates({
        exchangeTemplates: {
            INVALID_EXCHANGE: {
                limit: [
                    { periodType: 'DAILY', value: '1' },
                    { periodType: 'DAILY', value: '2' }
                ]
            }
        }
    }, duplicateErrors);
    assert(duplicateErrors.some((error) => error.includes('must not repeat periodType')), 'Duplicate exchange period was not rejected', { duplicateErrors });

    return normalized.limit;
}

async function auditStarterPayload(gameDataManager) {
    let createdPayload = null;
    const randomValues = [0.2, 0.7];
    const playerStartService = new PlayerStartService({
        random: () => randomValues.shift(),
        gameDataManager,
        playerRuntimeRepository: {
            async createPlayer(_playerId, payload) {
                createdPayload = payload;
            }
        }
    });

    const destiny = playerStartService.rollDestiny();
    const result = await playerStartService.startPlayer('audit-player', 'Audit Player', {
        destiny,
        rerollsUsed: 0
    });

    assert(createdPayload, 'Starter payload was not created');
    assert(createdPayload.spiritRootId === 'KIM_LINH_CAN', 'Starter Spirit Root ID is not resolved from GameData', {
        spiritRootId: createdPayload.spiritRootId
    });
    assert(createdPayload.spiritRootQualityTierId === 'MIDDLE_GRADE'
        && result.spiritRootQualityTierId === 'MIDDLE_GRADE',
    'Starter Spirit Root quality is not independently rolled from the rebirth-zero bracket', {
        payloadQuality: createdPayload.spiritRootQualityTierId,
        resultQuality: result.spiritRootQualityTierId
    });
    assert(createdPayload.realmId === 1
        && createdPayload.realmStage === 1
        && createdPayload.baseStats.atk === '40'
        && createdPayload.baseStats.def === '20'
        && createdPayload.baseStats.hp === '200'
        && createdPayload.baseStats.spd === '5',
    'Starter base stats must come from the first Realm stage instead of legacy database defaults', {
        realmId: createdPayload.realmId,
        realmStage: createdPayload.realmStage,
        baseStats: createdPayload.baseStats
    });
    assert(createdPayload.cultivationArtId === 'CP_NEUTRAL_HOANG', 'Starter cultivation art is not schema-aligned', {
        cultivationArtId: createdPayload.cultivationArtId
    });
    assert(createdPayload.starterEquipment.itemId === 'EQ_FIRE_WEAPON', 'Starter equipment id is not schema-aligned', {
        starterEquipment: createdPayload.starterEquipment
    });
    assert(createdPayload.starterEquipment.rarity === 'COMMON', 'Starter equipment rarity is not schema-aligned', {
        rarity: createdPayload.starterEquipment.rarity
    });
    assert(createdPayload.starterCultivationArtItem === null,
        'Character creation must not grant an unrelated elemental art book', {
            starterCultivationArtItem: createdPayload.starterCultivationArtItem
        });
    assert(createdPayload.starterEquipment.fixedEffects.length > 0, 'Starter equipment has no modifier fixed effects');
    assert(createdPayload.starterRecipeIds.length === 2
        && createdPayload.starterRecipeIds.includes('CRAFT_BREAKTHROUGH_PILL')
        && createdPayload.starterRecipeIds.includes('CRAFT_SPIRIT_GATHERING_PILL'),
    'Starter recipe is not schema-aligned', {
        starterRecipeIds: createdPayload.starterRecipeIds
    });

    return {
        cultivationArtId: createdPayload.cultivationArtId,
        equipmentId: createdPayload.starterEquipment.itemId,
        rarity: createdPayload.starterEquipment.rarity,
        artBookId: null,
        displayedEquipment: result.starterEquipment.name
    };
}

async function auditLearnableBooks(runtimePlayer) {
    const playerRuntimeRepository = {
        async findById() {
            return runtimePlayer;
        },
        async listCultivationArtStates() {
            return [{ artId: 'CP_FIRE_HOANG', active: true }];
        },
        async listSkillStates() {
            return [];
        }
    };

    const cultivationArtService = new CultivationArtService({ playerRuntimeRepository });
    const skillService = new SkillService({ playerRuntimeRepository });
    const learnableArts = await cultivationArtService.listLearnableCultivationArts(runtimePlayer.playerId);
    const learnableSkills = await skillService.listLearnableSkills(runtimePlayer.playerId);

    const artBook = learnableArts.books.find((book) => book.cultivationArtId === 'CP_WOOD_HOANG');
    const skillBook = learnableSkills.books.find((book) => book.skillId === 'SK_FIRE_HOANG');

    assert(artBook, 'Cultivation art book is not learnable from runtime inventory');
    assert(skillBook, 'Skill book is not learnable from runtime inventory');

    return {
        learnableArtBooks: learnableArts.books.map((book) => book.id),
        learnableSkillBooks: learnableSkills.books.map((book) => book.id)
    };
}

function auditFormulaUsesCurrentBattleStat(gameDataManager) {
    const formulaEngine = new FormulaEngine({
        gameDataManager,
        random: () => 0.5
    });
    const actor = new BattleEntity({
        id: 'formula-actor',
        team: 'A',
        battleStat: {
            hp: 100,
            atk: 100,
            def: 0,
            spd: 1,
            pen: 0,
            skillDamage: 0
        }
    });
    const target = new BattleEntity({
        id: 'formula-target',
        team: 'B',
        battleStat: {
            hp: 100,
            atk: 1,
            def: 20,
            spd: 1
        }
    });
    const beforeModifier = formulaEngine.evaluateFormula('SKILL_DAMAGE', actor, target, {
        resultType: 'DAMAGE',
        params: { DAMAGE_RATE: 1 }
    });
    const atkModifier = gameDataManager.getRecord('modifiers', 'ATK_UP_20');
    actor.addModifier(atkModifier);
    const afterModifier = formulaEngine.evaluateFormula('SKILL_DAMAGE', actor, target, {
        resultType: 'DAMAGE',
        params: { DAMAGE_RATE: 1 }
    });

    assert(beforeModifier.statScope === 'CURRENT_BATTLE_STAT', 'Formula result does not declare current battle stat scope', beforeModifier);
    assert(beforeModifier.variables.ATK === '100', 'Formula did not resolve ATK from current battle stat before modifier', beforeModifier);
    assert(afterModifier.variables.ATK === '120', 'Formula did not resolve ATK from current battle stat after modifier', afterModifier);
    assert(BigInt(afterModifier.amount) > BigInt(beforeModifier.amount), 'Formula damage did not change after runtime modifier', {
        beforeModifier,
        afterModifier
    });

    return {
        formulaId: 'SKILL_DAMAGE',
        beforeDamage: beforeModifier.amount,
        afterDamage: afterModifier.amount,
        beforeAtk: beforeModifier.variables.ATK,
        afterAtk: afterModifier.variables.ATK,
        statScope: afterModifier.statScope
    };
}

function auditGatheringDataContract(gameDataManager) {
    const gatherings = gameDataManager.getCollection('gatheringTemplates');
    const mapGatherings = Object.values(gatherings).filter((entry) => entry.mapId);
    assert(mapGatherings.length === 30, 'Map gathering template registry must contain 15 maps x 2 families', {
        count: mapGatherings.length
    });
    const thanhVanHerb = gatherings.GATHER_THANH_VAN_SON_MACH_HERB;
    const thanhVanOre = gatherings.GATHER_THANH_VAN_SON_MACH_ORE;
    assert(thanhVanHerb.duration === 30 && thanhVanHerb.resourceTier === 1
        && thanhVanHerb.resourceFamily === 'HERB',
    'Thanh Van herb gathering fields are not normalized', thanhVanHerb);
    assert(thanhVanOre.duration === 60 && thanhVanOre.requiredRealm === 'LUYEN_KHI'
        && thanhVanOre.resourceFamily === 'ORE',
    'Thanh Van ore gathering fields are not normalized', thanhVanOre);
    assert(Object.keys(gameDataManager.getCollection('gatheringResources')).length === 60,
        'Gathering resource catalog must contain 60 resources');
    assert(Object.keys(gameDataManager.getCollection('mapGatheringPools')).length === 30,
        'Map gathering pool registry must contain 30 pools');

    const errors = [];
    new GameDataValidator().validateGatheringTemplates({
        realms: gameDataManager.getCollection('realms'),
        maps: gameDataManager.getCollection('maps'),
        rewardTables: gameDataManager.getCollection('rewardTables'),
        itemTemplates: gameDataManager.getCollection('itemTemplates'),
        gatheringRules: gameDataManager.getCollection('gatheringRules'),
        gatheringResources: gameDataManager.getCollection('gatheringResources'),
        mapGatheringPools: gameDataManager.getCollection('mapGatheringPools'),
        gatheringTemplates: {
            ...gatherings,
            INVALID: {
                id: 'INVALID', name: '', requiredRealm: 'MISSING_REALM',
                duration: 0, staminaCost: -1, dailyLimit: -1, rewardTableId: 'MISSING_REWARD'
            }
        }
    }, errors);
    const expectedFragments = [
        '.name is required', '.requiredRealm references missing realm code',
        '.duration must be a positive integer', '.staminaCost must be a non-negative integer',
        '.dailyLimit must be a non-negative integer', '.rewardTableId references missing rewardTables'
    ];
    for (const fragment of expectedFragments) {
        assert(errors.some((error) => error.includes(fragment)), `Gathering validator missed ${fragment}`, errors);
    }
    return {
        templates: Object.keys(gatherings).length,
        structuralValidation: true,
        runtimeSemantics: 'LAZY_START_CLAIM',
        activeSlotPolicy: 'ONE_PER_PLAYER',
        staminaMvpEnabled: false
    };
}

function auditSectDataContract(gameDataManager) {
    const sects = gameDataManager.getCollection('sectTemplates');
    const exchangeRules = gameDataManager.getCollection('sectExchangeRules');
    const rewardPools = gameDataManager.getCollection('sectRewardPools');
    const sectEffectIds = [...new Set(Object.values(sects).flatMap((sect) => sect.effects))];
    assert(Object.keys(sects).length === 10, 'Sect template registry is incomplete', sects);
    assert(Object.keys(exchangeRules).length === 18, 'Sect exchange rule registry is incomplete', exchangeRules);
    assert(sects.SECT_FIRE?.element === 'FIRE', 'Fire sect element is not normalized', sects.SECT_FIRE);
    assert(Array.isArray(sects.SECT_FIRE?.effects), 'Sect effects are not normalized as IDs', sects.SECT_FIRE);
    assert(Object.keys(rewardPools).length === 180, 'Sect reward pool matrix is incomplete', rewardPools);
    assert(Object.values(rewardPools).every((pool) => (
        pool.entries.length === 1 && pool.duplicatePolicy === 'DENY_OWNED'
    )), 'Every Sect exchange must resolve to one non-duplicate exclusive inheritance', rewardPools);
    assert(rewardPools['SECT_YINYANG:ATTACK_THAN']?.entries[0]?.itemId === 'BOOK_SECT_ATK_YINYANG_THAN',
        'Lưỡng Nghi Tông Thần phẩm attack inheritance is missing');
    assert(rewardPools['SECT_LIGHTNING:ATTACK_THANH']?.entries[0]?.itemId === 'BOOK_SECT_ATK_LIGHTNING_THANH',
        'Thiên Lôi Điện Thánh phẩm attack inheritance is missing');
    assert(rewardPools['SECT_LONGEVITY:CULTIVATION_ART_HOANG']?.entries[0]?.itemId === 'SECT_ART_LONGEVITY_HOANG',
        'Trường Sinh Cốc cultivation inheritance is missing');
    assert(sects.SECT_YINYANG?.element === 'CHAOS'
        && sects.SECT_ASSASSIN?.element === 'DARK'
        && sects.SECT_LONGEVITY?.element === 'WOOD',
    'Canonical elements for the three former neutral Sects are incorrect');
    assert(sectEffectIds.length === 15 && sectEffectIds.every((effectId) => gameDataManager.hasRecord('coreEffects', effectId)), 'Sect Core Effect references are incomplete', sectEffectIds);

    const factory = new BattleEntityFactory({ gameDataManager });
    const baseEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer(), { id: 'base' });
    const metalEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_METAL' }), { id: 'metal' });
    const assassinEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_ASSASSIN' }), { id: 'assassin' });
    assert(metalEntity.battleStat.critRate === '15', 'Metal Sect CRIT passive was not materialized', { base: baseEntity.battleStat, metal: metalEntity.battleStat });
    assert(assassinEntity.battleStat.atk === '11', 'Assassin Sect ATK passive was not materialized', { base: baseEntity.battleStat, assassin: assassinEntity.battleStat });

    const sectEffectResolver = new SectEffectResolver({ gameDataManager });
    const longevityPlayer = createFakeRuntimePlayer({ sectId: 'SECT_LONGEVITY' });
    const assassinPlayer = createFakeRuntimePlayer({ sectId: 'SECT_ASSASSIN' });
    assert(sectEffectResolver.getCultivationEffects(longevityPlayer)[0]?.value === 0.1, 'Longevity cultivation multiplier is not 10%');
    assert(sectEffectResolver.getBreakthroughChanceDelta(longevityPlayer) === 10, 'Longevity breakthrough delta is not +10pp');
    assert(sectEffectResolver.getBreakthroughChanceDelta(assassinPlayer) === -10, 'Assassin breakthrough delta is not -10pp');

    const engine = new BattleEngine({ gameDataManager, random: () => 0, maxRounds: 1 });
    const fireEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_FIRE' }), { id: 'fire', team: 'A' });
    const burnTarget = factory.createFromRuntimePlayer(createFakeRuntimePlayer(), { id: 'burn-target', team: 'B' });
    let context = new BattleContext({ battleId: 'sect-fire', teams: { A: [fireEntity], B: [burnTarget] } });
    const burnResult = engine.actionExecutor.executeApplyEffect(context, fireEntity, {
        type: 'APPLY_EFFECT', arguments: { effectId: 'BURN' }
    }, burnTarget);
    assert(burnResult.effect?.remainingTurns === 4, 'Fire Sect did not extend Burn from 3 to 4 turns', burnResult);

    const iceEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_ICE' }), { id: 'ice', team: 'A' });
    const controlTarget = factory.createFromRuntimePlayer(createFakeRuntimePlayer(), { id: 'control-target', team: 'B' });
    context = new BattleContext({ battleId: 'sect-ice', teams: { A: [iceEntity], B: [controlTarget] } });
    engine.actionExecutor.executeApplyEffect(context, iceEntity, {
        type: 'APPLY_EFFECT', arguments: { effectId: 'FREEZE' }
    }, controlTarget);
    assert(controlTarget.modifiers.some((modifier) => modifier.id === 'SPD_DOWN_10' && modifier.remainingTurns === 2), 'Ice Sect did not add timed slow after control', controlTarget.modifiers);

    const attacker = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ baseAtk: 100 }), { id: 'attacker', team: 'A' });
    const earthEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_EARTH', baseDef: 0 }), { id: 'earth', team: 'B' });
    earthEntity.addShield(10);
    context = new BattleContext({ battleId: 'sect-earth', teams: { A: [attacker], B: [earthEntity] } });
    engine.actionExecutor.executeDamage(context, attacker, { type: 'DAMAGE', multiplier: 1, variance: false }, earthEntity);
    assert(context.eventQueue.some((event) => event.type === 'SECT_SHIELD_BREAK_REFLECT'), 'Earth Sect shield break did not reflect damage', context.eventQueue);

    const woodEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_WOOD' }), { id: 'wood', team: 'A' });
    const ally = factory.createFromRuntimePlayer(createFakeRuntimePlayer(), { id: 'ally', team: 'A' });
    const enemy = factory.createFromRuntimePlayer(createFakeRuntimePlayer(), { id: 'enemy', team: 'B' });
    woodEntity.currentHP = 50;
    ally.currentHP = 50;
    context = new BattleContext({ battleId: 'sect-wood', teams: { A: [woodEntity, ally], B: [enemy] } });
    engine.effectEngine.tickEffects(context, woodEntity, 'TURN_END');
    assert(woodEntity.currentHP === '53' && ally.currentHP === '53', 'Wood Sect did not heal self and living allies by 3% Max HP', { woodHP: woodEntity.currentHP, allyHP: ally.currentHP });

    const waterEntity = factory.createFromRuntimePlayer(createFakeRuntimePlayer({ sectId: 'SECT_WATER' }), { id: 'water', team: 'A' });
    waterEntity.addEffect({ id: 'TEST_DEBUFF', category: 'DEBUFF', tags: ['DEBUFF'] });
    context = new BattleContext({ battleId: 'sect-water', teams: { A: [waterEntity], B: [enemy] } });
    engine.effectEngine.tickEffects(context, waterEntity, 'TURN_START');
    assert(!waterEntity.effects.some((effect) => effect.id === 'TEST_DEBUFF'), 'Water Sect did not cleanse one debuff at first turn start', waterEntity.effects);

    const errors = [];
    new GameDataValidator().validateSectTemplates({
        elements: gameDataManager.getCollection('elements'),
        realms: gameDataManager.getCollection('realms'),
        rarities: gameDataManager.getCollection('rarities'),
        currencies: gameDataManager.getCollection('currencies'),
        coreEffects: gameDataManager.getCollection('coreEffects'),
        itemTemplates: gameDataManager.getCollection('itemTemplates'),
        sectPolicy: { revision: 'invalid', leaveCooldownSeconds: -1, retainSectPoints: false },
        sectRewardPools: {},
        sectTemplates: {
            INVALID: {
                id: 'INVALID', name: '', element: 'MISSING_ELEMENT', effects: ['DUPLICATE', 'DUPLICATE']
            }
        },
        sectExchangeRules: {
            INVALID: {
                id: 'INVALID', category: 'UNKNOWN', grade: 'MISSING_GRADE',
                requiredRealm: 'MISSING_REALM', cost: { currencyId: 'MISSING_CURRENCY', amount: 0 }
            }
        }
    }, errors);
    const expectedFragments = [
        '.name is required', '.element references missing elements.', '.effects must not contain duplicates',
        '.category is unsupported', '.grade references missing rarities.',
        '.requiredRealm references missing realm code', '.cost.currencyId references missing currency',
        '.cost.amount must be a positive safe integer'
    ];
    for (const fragment of expectedFragments) {
        assert(errors.some((error) => error.includes(fragment)), `Sect validator missed ${fragment}`, errors);
    }

    return {
        templates: Object.keys(sects).length,
        exchangeRules: Object.keys(exchangeRules).length,
        rewardPools: Object.keys(rewardPools).length,
        rewardPoolEntries: Object.values(rewardPools).reduce((sum, pool) => sum + pool.entries.length, 0),
        effectDefinitions: sectEffectIds.length,
        structuralValidation: true,
        effectReferenceValidation: true,
        battleStatMaterialization: true,
        behavioralEffects: ['BURN_DURATION', 'PARTY_HEAL', 'SHIELD_BREAK_REFLECT', 'CLEANSE', 'SLOW_AFTER_CONTROL']
    };
}

async function main() {
    const gameDataManager = bootstrapGameData();
    setGameDataManager(gameDataManager);

    const rarities = gameDataManager.getCollection('rarities');
    const treasureHunt = gameDataManager.getCollection('treasureHunt');
    const rewardTables = gameDataManager.getCollection('rewardTables');
    const modifiers = gameDataManager.getCollection('modifiers');
    const equipmentTypes = gameDataManager.getCollection('equipmentTypes');
    const equipmentGrades = gameDataManager.getCollection('equipmentGrades');
    const attributes = gameDataManager.getCollection('attributes');
    const elements = gameDataManager.getCollection('elements');
    const elementRelations = gameDataManager.getCollection('elementRelations');
    const targets = gameDataManager.getCollection('targets');
    const actionTypes = gameDataManager.getCollection('actionTypes');
    const formulas = gameDataManager.getCollection('formulas');
    const coreEffects = gameDataManager.getCollection('coreEffects');
    const skillDefinitions = gameDataManager.getCollection('skillDefinitions');
    const spiritRoots = gameDataManager.getCollection('spiritRoots');
    const idleSources = gameDataManager.getCollection('idleSources');

    const requiredRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'HOANG', 'HUYEN', 'DIA', 'THIEN', 'THANH', 'THAN'];
    const missingRarities = requiredRarities.filter((rarityId) => !rarities[rarityId]);
    assert(missingRarities.length === 0, 'Missing item or grade rarities', { missingRarities });
    assert(attributes.HP && attributes.ATK && attributes.DEF && attributes.SPD, 'Core attribute registry is missing primary attributes');
    assert(elements.FIRE?.effectId === 'ELEMENT_FIRE', 'Element registry is not aligned with effect references', elements.FIRE);
    assert(Object.keys(elementRelations).length === 12, 'Element relations were not normalized from generate/counter groups', elementRelations);
    assert(Object.values(elementRelations).filter((relation) => relation.relationType === 'GENERATE').length === 5, 'Generate relation count is invalid', elementRelations);
    assert(Object.values(elementRelations).filter((relation) => relation.relationType === 'COUNTER').length === 7, 'Counter relation count is invalid', elementRelations);
    assert(elementRelations.COUNTER_WATER_FIRE?.from === 'WATER' && elementRelations.COUNTER_WATER_FIRE?.to === 'FIRE', 'Element relation direction was not preserved', elementRelations.COUNTER_WATER_FIRE);
    assert(Object.isFrozen(elementRelations) && Object.values(elementRelations).every(Object.isFrozen), 'Element relation registry must be immutable');
    const invalidElementRelationErrors = [];
    new GameDataValidator().validateElementRelations({
        elements,
        elementRelations: {
            INVALID_RELATION: {
                relationType: 'UNKNOWN',
                from: 'FIRE',
                to: 'MISSING_ELEMENT'
            },
            SELF_RELATION: {
                relationType: 'COUNTER',
                from: 'FIRE',
                to: 'FIRE'
            }
        }
    }, invalidElementRelationErrors);
    assert(invalidElementRelationErrors.some((error) => error.includes('.relationType must be GENERATE or COUNTER')), 'Element relation validator accepted unknown type', invalidElementRelationErrors);
    assert(invalidElementRelationErrors.some((error) => error.includes('missing elements.MISSING_ELEMENT')), 'Element relation validator accepted missing Element reference', invalidElementRelationErrors);
    assert(invalidElementRelationErrors.some((error) => error.includes('must not reference the same element')), 'Element relation validator accepted a self relation', invalidElementRelationErrors);
    assert(targets.ENEMY_SINGLE && targets.SELF, 'Target registry is missing expected records');
    assert(actionTypes.DAMAGE && actionTypes.ADD_EFFECT && actionTypes.ADD_MODIFIER, 'Battle action registry is not loaded from core data');
    assert(formulas.SKILL_DAMAGE && formulas.BURN_DAMAGE, 'Formula registry is missing expected records');
    assert(formulas.WOOD_HEAL && formulas.WOOD_HEAL.expression === 'ATK * 0.5', 'Bridge formula registry is missing WOOD_HEAL');
    assert(modifiers.SLOW_SPD?.mode === 'add_percent_base' && modifiers.SLOW_SPD.normalizedValue === -0.2, 'Modifier v2 MULTIPLY/PERCENT is not normalized for battle runtime', modifiers.SLOW_SPD);
    assert(coreEffects.ELEMENT_FIRE?.actions?.[0]?.target === 'TARGET', 'Core effect normalization did not preserve trigger target alias', coreEffects.ELEMENT_FIRE);
    assert(Array.isArray(skillDefinitions.SK_FIRE_HOANG?.effects) && skillDefinitions.SK_FIRE_HOANG.effects.includes('SK_FIRE_HOANG_BRIDGE'), 'Skill definition registry is not aligned with bridge effect references', skillDefinitions.SK_FIRE_HOANG);
    assert(coreEffects.SK_FIRE_HOANG_BRIDGE?.actions?.some((action) => action.type === 'DAMAGE'), 'Skill bridge effect did not preserve legacy actions', coreEffects.SK_FIRE_HOANG_BRIDGE);
    assert(Object.keys(spiritRoots).length === 11, 'Spirit Root registry is not data-driven or is incomplete');
    assert(Object.values(spiritRoots).reduce((total, root) => total + root.rollWeight, 0) === 100, 'Spirit Root weights must preserve the current 100-point roll distribution');
    assert(idleSources.CULTIVATION?.evaluationMode === 'LAZY', 'Cultivation idle source must use lazy evaluation');
    assert(treasureHunt.rewardTableId === 'TREASURE_HUNT', 'Treasure hunt is not driven by reward table', treasureHunt);
    const legacyTreasureHuntFields = ['rewards', 'rarities', 'equipment', 'cultivation_arts', 'skill_books']
        .filter((fieldName) => Object.hasOwn(treasureHunt, fieldName));
    assert(legacyTreasureHuntFields.length === 0, 'Treasure hunt still has synthetic reward fields', {
        legacyTreasureHuntFields
    });
    assert(rewardTables.TREASURE_HUNT, 'Missing TREASURE_HUNT reward table');
    assert(Object.keys(modifiers).length > 0, 'Modifier registry is empty');
    assert(Object.keys(equipmentTypes).length > 0, 'Equipment type registry is empty');
    assert(Object.keys(equipmentGrades).length > 0, 'Equipment grade registry is empty');
    assert(equipmentTypes.ARMOR?.slot === 'ARMOR', 'ARMOR must keep an independent equipment type slot');
    assert(equipmentTypes.NECKLACE?.slot === 'NECKLACE', 'NECKLACE must keep an independent equipment type slot');
    assert(equipmentTypes.ARMOR.slot !== equipmentTypes.NECKLACE.slot, 'ARMOR and NECKLACE must not share a loadout slot');
    assert(gameDataManager.getCollection('equipmentAffixes').necklace?.length > 0,
        'NECKLACE equipment type lost its normalized affix pool');

    const cultivationPlayer = new Player({
        id: 'audit-player',
        name: 'Audit Player',
        spiritual_root: 'Hoa Linh Can',
        realm_id: 1,
        cultivation_art_id: 'CP_NEUTRAL_HOANG',
        cultivation: 0,
        spirit_stones: 100,
        base_atk: 10,
        base_def: 10,
        base_hp: 100,
        base_spd: 10,
        last_cultivate: new Date(),
        equipments: [],
        passive_skills: [],
        active_buffs: []
    });

    assert(cultivationPlayer.cultivationArt.cultivationArtId === 'CP_NEUTRAL_HOANG', 'Player cultivation art fallback is not schema-aligned');
    assert(cultivationPlayer.cultivationArt.cultivationBonus === 0.2, 'Neutral cultivation art bonus is not normalized', {
        cultivationBonus: cultivationPlayer.cultivationArt.cultivationBonus
    });
    assert(cultivationPlayer.getFinalStat('cultivation_speed') === 1, 'Cultivation affinity must be materialized by the runtime snapshot, not the static art template', {
        cultivationSpeed: cultivationPlayer.getFinalStat('cultivation_speed')
    });

    const generatedEquipment = ItemFactory.generateEquipment('EQ_FIRE_WEAPON', 'UNCOMMON');
    const fixedEffects = generatedEquipment.getEffects().filter((effect) => effect.modifierId === 'ATK_PERCENT');
    assert(fixedEffects.length > 0, 'Generated equipment has no ATK_PERCENT modifier');
    assert(fixedEffects[0].stat === 'atk' && fixedEffects[0].mode === 'add_percent_base', 'Equipment modifier is not mapped to stat/mode', fixedEffects[0]);

    assert(ItemFactory.createItem('CP_FIRE_HOANG'), 'Cultivation art item cannot be created from normalized data');
    assert(SkillFactory.create('SK_FIRE_HOANG'), 'Skill cannot be created from normalized data');

    const runtimePlayer = createFakeRuntimePlayer();
    const starter = await auditStarterPayload(gameDataManager);
    const learnables = await auditLearnableBooks(runtimePlayer);
    const formulaRuntime = auditFormulaUsesCurrentBattleStat(gameDataManager);
    const exchangeLimitContract = auditExchangeLimitContract();
    const gatheringDataContract = auditGatheringDataContract(gameDataManager);
    const sectDataContract = auditSectDataContract(gameDataManager);
    const battleSkillFactory = auditBattleSkillFactory(gameDataManager);
    const monsterRewardResolution = auditMonsterRewardResolution(gameDataManager);
    const mapAndGradePoolRuntime = auditMapAndGradePoolRuntime(gameDataManager);
    const battleExecutorCoverage = auditBattleExecutorCoverage(gameDataManager);
    const approvedCombatPolicies = auditApprovedCombatPolicies();
    const effectLifecycle = auditEffectLifecycle(gameDataManager);
    const conditionRegistry = auditConditionRegistry(gameDataManager);
    const executionContextPipeline = auditExecutionContextPipeline();
    const actionLifecycleHooks = auditActionLifecycleHooks();
    const battleStatContract = auditBattleStatContract(gameDataManager);
    const elementRelationResolver = auditElementRelationResolver(gameDataManager);
    const battleMetricsAndResult = auditBattleMetricsAndResult();
    const deterministicBattleReplay = auditDeterministicBattleReplay();

    console.log(JSON.stringify({
        status: 'PASS',
        summary: {
            rarities: requiredRarities.length,
            attributes: Object.keys(attributes).length,
            elements: Object.keys(elements).length,
            elementRelations: Object.keys(elementRelations).length,
            targets: Object.keys(targets).length,
            actionTypes: Object.keys(actionTypes).length,
            formulas: Object.keys(formulas).length,
            coreEffects: Object.keys(coreEffects).length,
            skillDefinitions: Object.keys(skillDefinitions).length,
            spiritRoots: Object.keys(spiritRoots).length,
            idleSources: Object.keys(idleSources).length,
            rewardTableId: treasureHunt.rewardTableId,
            modifiers: Object.keys(modifiers).length,
            equipmentTypes: Object.keys(equipmentTypes).length,
            equipmentGrades: Object.keys(equipmentGrades).length,
            cultivationSpeed: cultivationPlayer.getFinalStat('cultivation_speed'),
            equipmentModifier: {
                modifierId: fixedEffects[0].modifierId,
                stat: fixedEffects[0].stat,
                mode: fixedEffects[0].mode,
                value: fixedEffects[0].value
            },
            starter,
            learnables,
            formulaRuntime,
            exchangeLimitContract,
            gatheringDataContract,
            sectDataContract,
            battleSkillFactory,
            monsterRewardResolution,
            mapAndGradePoolRuntime,
            battleExecutorCoverage,
            approvedCombatPolicies,
            effectLifecycle,
            conditionRegistry,
            executionContextPipeline,
            actionLifecycleHooks,
            battleStatContract,
            elementRelationResolver,
            battleMetricsAndResult,
            deterministicBattleReplay
        }
    }, null, 2));
}

main().catch((error) => {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error.message,
        details: error.details || null
    }, null, 2));
    process.exitCode = 1;
});
