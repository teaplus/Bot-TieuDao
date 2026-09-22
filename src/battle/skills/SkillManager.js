import BattleSkillFactory from '../factory/BattleSkillFactory.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import deepCloneFreeze from '../../shared/object/deepCloneFreeze.js';
import { ratioToBasisPoints } from '../numeric/BattleFixed.js';

const SELF_SUSTAIN_ACTION_TYPES = new Set([
    'HEAL',
    'ADD_SHIELD',
    'SHIELD'
]);

export default class SkillManager {

    constructor(options = {}) {

        this.random = options.random || Math.random;

        this.gameDataManager =
            options.gameDataManager
            || getGameDataManager();

        this.skillFactory =
            options.skillFactory
            || new BattleSkillFactory({
                gameDataManager: this.gameDataManager
            });

        this.selfSustainPriorityHpPercent = Number(
            options.selfSustainPriorityHpPercent
            ?? this.gameDataManager.getCollection?.('skillRules')
                ?.activeSkillSelection
                ?.selfSustainPriorityBelowHpPercent
        );

    }

    selectSkill(entity, trigger = 'TURN_ACTION') {

        const availableSkills =
            this.getAvailableSkills(entity, trigger);

        if (availableSkills.length === 0) {
            return this.createBasicAttack();
        }

        const prioritySkills = this.isBelowSelfSustainThreshold(entity)
            ? availableSkills.filter((skill) => this.isSelfSustainSkill(skill))
            : [];
        const candidateSkills = prioritySkills.length > 0
            ? prioritySkills
            : availableSkills;

        return candidateSkills[
            this.randomInteger(
                0,
                candidateSkills.length - 1
            )
        ];

    }

    getAvailableSkills(entity, trigger = 'TURN_ACTION') {

        return (entity.skills || [])

            .map(skillId => this.skillFactory.create(skillId))

            .filter(Boolean)

            .filter(skill =>
                this.canUseSkill(skill, trigger)
            )

            .filter(skill =>
                !entity.skillCooldowns
                || entity.skillCooldowns.isReady(skill.id)
            );

    }

    canUseSkill(skill, trigger) {

        if (!skill) {
            return false;
        }

        if (skill.type !== 'ACTIVE') {
            return false;
        }

        return (
            (skill.trigger ?? 'TURN_ACTION')
            === trigger
        );

    }

    createBasicAttack() {

        return deepCloneFreeze({

            id: 'BASIC_ATTACK',

            displayName: 'Basic Attack',
            name: 'Đánh Thường',

            type: 'ACTIVE',

            trigger: 'TURN_ACTION',

            cooldownTurns: 0,

            target: 'ENEMY_SINGLE',

            actions: [

                {

                    id: 'BASIC_ATTACK_ACTION_01',

                    order: 1,

                    type: 'DAMAGE',

                    formulaId: 'NORMAL_DAMAGE',

                    arguments: {

                        DAMAGE_RATE: 1

                    }

                }

            ]

        });

    }

    isBelowSelfSustainThreshold(entity) {
        if (!Number.isFinite(this.selfSustainPriorityHpPercent)
            || this.selfSustainPriorityHpPercent <= 0
            || !entity?.battleStat?.hp
            || entity.currentHP == null) {
            return false;
        }

        return ratioToBasisPoints(entity.currentHP, entity.battleStat.hp)
            < Math.round(this.selfSustainPriorityHpPercent * 100);
    }

    isSelfSustainSkill(skill) {
        return (skill?.actions || []).some((action) => {
            if (!SELF_SUSTAIN_ACTION_TYPES.has(action.type)) return false;
            return (action.target || skill.target) === 'SELF';
        });
    }

    startCooldown(entity, skill) {
        if (!entity?.skillCooldowns || !skill || skill.id === 'BASIC_ATTACK') return null;
        const cooldownTurns = Number(skill.cooldownTurns || 0);
        if (cooldownTurns <= 0) return null;
        return entity.skillCooldowns.start(skill.id, cooldownTurns);
    }

    tickCooldowns(entity, options = {}) {
        if (!entity?.skillCooldowns) return Object.freeze([]);
        return entity.skillCooldowns.tick(options);
    }

    randomInteger(min, max) {

        return Math.floor(

            this.random() *

            (max - min + 1)

        ) + min;

    }

}
