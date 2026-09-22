import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const REALM_ALIASES = Object.freeze({
    KIM_DAN: 'KET_DAN'
});
const QUALITY_MULTIPLIER_SCALE = 1_000_000;

function scaleStat(statConfig, stage = 1) {
    const initial = Number(statConfig?.initial || 0);
    const growthPerStage = Number(statConfig?.growthPerStage || 1);
    return Math.floor(initial * growthPerStage ** Math.max(0, stage - 1));
}

function applyQualityBonus(value, quality) {
    const bonusUnits = Math.round(Number(quality?.bonusPercent || 0) * 10_000);
    return Math.floor(Number(value) * (QUALITY_MULTIPLIER_SCALE + bonusUnits) / QUALITY_MULTIPLIER_SCALE);
}

export default class MonsterGeneratorService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
    }

    createMonster(monsterId, options = {}) {
        const template = this.gameDataManager.requireRecord('monsterTemplates', monsterId);
        const variant = this.resolveVariant(options.variantId || template.variantId || 'NORMAL');
        const realm = this.resolveRealm(options.realmCode || template.realmCode);
        const aiProfile = this.gameDataManager.getRecord('monsterAiProfiles', template.aiProfileId)
            || this.gameDataManager.getRecord('monsterAiProfiles', 'NORMAL');
        const stage = this.resolveStage(template, variant, options);
        const quality = this.resolveQuality(variant, options);

        return {
            id: template.id,
            name: this.createMonsterName(template, variant),
            templateId: template.id,
            raceId: template.raceId || null,
            element: template.element,
            realmId: realm.id,
            realmCode: realm.code,
            realmName: realm.name,
            stage,
            variantId: variant.id,
            variantName: variant.name,
            qualityId: quality?.id || null,
            qualityName: quality?.name || null,
            qualityOrder: quality?.order || null,
            qualityBonusPercent: quality?.bonusPercent || 0,
            qualityMultiplier: quality?.multiplier || 1,
            qualityRewardChanceBonusPercent: quality?.rewardChanceBonusPercent || 0,
            aiProfile,
            rewardTableId: this.resolveRewardTableId(template.rewardTableId, realm),
            stats: this.createStats(realm, variant, stage, quality),
            skillIds: this.pickSkills(template)
        };
    }

    createEncounter(options = {}) {
        const candidates = this.findCandidates(options);
        const count = options.count || 1;
        const monsters = [];

        for (let index = 0; index < count; index += 1) {
            const template = candidates[this.randomInteger(0, candidates.length - 1)];
            monsters.push(this.createMonster(template.id, {
                variantId: options.variantId || this.pickVariantId(options.mode || 'exploration'),
                stage: options.stage,
                realmCode: options.realmCode,
                qualityId: options.qualityId
            }));
        }

        return monsters;
    }

    findCandidates(options = {}) {
        const templates = Object.values(this.gameDataManager.getCollection('monsterTemplates') || {});
        const candidates = templates.filter((template) => {
            if (options.element && template.element !== options.element) {
                return false;
            }

            if (options.realmCode && this.normalizeRealmCode(template.realmCode) !== this.normalizeRealmCode(options.realmCode)) {
                return false;
            }

            return true;
        });

        if (candidates.length === 0) {
            throw new Error('NO_MONSTER_TEMPLATE_AVAILABLE');
        }

        return candidates;
    }

    createMonsterName(template, variant) {
        return variant.id === 'NORMAL' ? template.name : `${variant.name} ${template.name}`;
    }

    createStats(realm, variant, stage, quality = null) {
        return {
            hp: applyQualityBonus(
                Math.floor(scaleStat(realm.attributes?.HP, stage) * variant.hpMultiplier),
                quality
            ),
            atk: applyQualityBonus(
                Math.floor(scaleStat(realm.attributes?.ATK, stage) * variant.atkMultiplier),
                quality
            ),
            def: applyQualityBonus(
                Math.floor(scaleStat(realm.attributes?.DEF, stage) * variant.defMultiplier),
                quality
            ),
            spd: applyQualityBonus(scaleStat(realm.attributes?.SPD, stage), quality)
        };
    }

    resolveQuality(variant, options = {}) {
        if (variant?.id === 'BOSS' || variant?.id === 'WORLD_BOSS') return null;
        const rules = this.gameDataManager.getCollection('monsterQualityRules') || {};
        const qualityId = options.qualityId || rules.defaultQualityId;
        const tier = this.gameDataManager.requireRecord('monsterQualityTiers', qualityId);
        const bonusPercent = Number(rules.stepPercent) * Math.max(0, Number(tier.order) - 1);
        return {
            ...tier,
            bonusPercent,
            multiplier: 1 + bonusPercent / 100,
            rewardChanceBonusPercent: Number(tier.rewardChanceBonusPercent || 0)
        };
    }

    pickSkills(template) {
        if (Array.isArray(template.skillIds) && template.skillIds.length > 0) {
            return this.enforceSkillLimit(template, template.skillIds);
        }

        const rules = this.gameDataManager.getCollection('monsterRules') || {};
        const slotRules = rules.skillSlots || {};

        return this.enforceSkillLimit(template, [
            ...this.pickSkillPool(template.attackSkillPool, 'ACTIVE', slotRules.attackSkills || 0),
            ...this.pickSkillPool(template.defenseSkillPool, 'PASSIVE', slotRules.defenseSkills || 0)
        ]);
    }

    enforceSkillLimit(template, skillIds) {
        const rules = this.gameDataManager.getCollection('monsterRules') || {};
        const maxSkills = Number(rules.skillSlots?.maxSkills || 0);
        const normalizedSkillIds = [...(skillIds || [])];

        if (Number.isSafeInteger(maxSkills)
            && maxSkills > 0
            && normalizedSkillIds.length > maxSkills) {
            throw new Error(
                `MONSTER_SKILL_LIMIT_EXCEEDED:${template?.id || 'UNKNOWN'}`
                + `:${normalizedSkillIds.length}:${maxSkills}`
            );
        }

        return normalizedSkillIds;
    }

    pickSkillPool(element, type, count) {
        const candidates = Object.values(this.gameDataManager.getCollection('skills') || {})
            .filter((skill) => skill.type === type && skill.combat?.element === element);
        const picked = [];

        for (let index = 0; index < count && candidates.length > 0; index += 1) {
            const candidateIndex = this.randomInteger(0, candidates.length - 1);
            const [skill] = candidates.splice(candidateIndex, 1);
            picked.push(skill.id);
        }

        return picked;
    }

    pickVariantId(mode) {
        const rules = this.gameDataManager.getCollection('monsterRules') || {};
        const variants = rules[mode]?.variant || ['NORMAL'];
        return variants[this.randomInteger(0, variants.length - 1)] || 'NORMAL';
    }

    resolveVariant(variantId) {
        return this.gameDataManager.getRecord('monsterVariants', variantId)
            || this.gameDataManager.getRecord('monsterVariants', 'NORMAL');
    }

    resolveRealm(realmCode) {
        const normalizedRealmCode = this.normalizeRealmCode(realmCode);
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const exactRealm = realms.find((realm) => realm.code === normalizedRealmCode);

        if (exactRealm) {
            return exactRealm;
        }

        return realms[realms.length - 1] || {
            id: 1,
            code: 'LUYEN_KHI',
            name: 'Luyen Khi',
            max_stage: 1,
            attributes: {}
        };
    }

    resolveRewardTableId(rewardReference, realm) {
        if (!rewardReference) {
            return null;
        }

        if (this.gameDataManager.hasRecord('rewardTables', rewardReference)) {
            return rewardReference;
        }

        const rules = this.gameDataManager.getCollection('monsterRules') || {};
        const alias = rules.rewardResolution?.aliases?.[rewardReference];
        if (!alias || alias.strategy !== 'BY_REALM_ORDER') {
            throw new Error(`MONSTER_REWARD_REFERENCE_NOT_RESOLVED:${rewardReference}`);
        }

        const realmOrder = String(realm?.order ?? '');
        const rewardTableId = alias.realmOrderTableIds?.[realmOrder];
        if (!rewardTableId) {
            throw new Error(`MONSTER_REWARD_REALM_ORDER_MAPPING_NOT_FOUND:${rewardReference}:${realmOrder}`);
        }

        this.gameDataManager.requireRecord('rewardTables', rewardTableId);
        return rewardTableId;
    }

    resolveStage(template, variant, options = {}) {
        const rules = this.gameDataManager.getCollection('monsterRules') || {};
        const monsterScaling = rules.scalingFormulas?.monster || {};
        const bossScaling = rules.scalingFormulas?.boss || {};
        const isAdaptiveBoss = variant?.id === 'BOSS' && bossScaling.stagePolicy === 'ADAPTIVE';

        if (isAdaptiveBoss) {
            return Math.max(1, Number(options.stage || template.scalingRule?.fixedStage || 1));
        }

        return Math.max(1, Number(
            template.scalingRule?.fixedStage
            || monsterScaling.defaultFixedStage
            || 1
        ));
    }

    normalizeRealmCode(realmCode) {
        return REALM_ALIASES[realmCode] || realmCode;
    }

    randomInteger(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
}
