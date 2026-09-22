import SkillFactory from '../../factories/SkillFactory.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import SkillLoadoutPolicy from './SkillLoadoutPolicy.js';

const DIRECT_UNIT_OF_WORK = Object.freeze({ execute: (work) => work(null) });

export default class SkillService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
        this.loadoutPolicy = options.loadoutPolicy || new SkillLoadoutPolicy({
            gameDataManager: this.gameDataManager
        });
    }

    async listSkills(playerId) {
        const states = await this.playerRuntimeRepository.listSkillStates(playerId);

        return states
            .map((state) => {
                const skill = SkillFactory.create(state.skillId);
                if (!skill) return null;
                skill.equippedSlot = state.equippedSlot;
                skill.isEquipped = state.equippedSlot != null;
                return skill;
            })
            .filter(Boolean);
    }

    async listLearnableSkills(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const learnedSkills = await this.listSkills(playerId);
        const learnedIds = new Set(learnedSkills.map((skill) => skill.id));
        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);

        const books = snapshot.inventoryItems.filter((item) => item.type === 'SKILL_BOOK'
            && !learnedIds.has(item.skillId));

        return {
            runtimePlayer,
            books,
            learnedSkills,
            loadout: {
                capacity: this.loadoutPolicy.getCapacity(runtimePlayer.realmId),
                maxActiveSkills: this.loadoutPolicy.rules.maxActiveSkills,
                revision: this.loadoutPolicy.rules.revision,
                equippedSkillIds: learnedSkills
                    .filter((skill) => skill.isEquipped)
                    .sort((left, right) => left.equippedSlot - right.equippedSlot)
                    .map((skill) => skill.id)
            }
        };
    }

    async equipSkillLoadout(playerId, skillIds = []) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: true
            });
            if (!runtimePlayer) return null;
            const states = await this.playerRuntimeRepository.listSkillStates(playerId, {
                client,
                forUpdate: true
            });
            const result = this.loadoutPolicy.validate(
                skillIds,
                states.map((state) => state.skillId),
                runtimePlayer.realmId
            );
            await this.playerRuntimeRepository.replaceSkillLoadout(
                playerId,
                result.skillIds,
                result.revision,
                { client }
            );
            return result;
        });
    }

    async learnSkill(playerId, inventoryId) {
        const learnable = await this.listLearnableSkills(playerId);
        if (!learnable) {
            return null;
        }

        const selectedBook = learnable.books.find((item) => String(item.uuid) === String(inventoryId));
        if (!selectedBook) {
            throw new Error('ITEM_NOT_FOUND');
        }

        if (selectedBook.type !== 'SKILL_BOOK') {
            throw new Error('NOT_SKILL_BOOK');
        }

        await this.playerRuntimeRepository.learnSkill(playerId, {
            inventoryId,
            itemId: selectedBook.id,
            skillId: selectedBook.skillId
        });

        return SkillFactory.create(selectedBook.skillId);
    }
}
