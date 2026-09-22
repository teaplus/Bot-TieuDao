import AppError from '../../shared/errors/AppError.js';

function deepFreeze(value) {
    if (!value || typeof value !== 'object') {
        return value;
    }

    Object.freeze(value);

    for (const nestedValue of Object.values(value)) {
        deepFreeze(nestedValue);
    }

    return value;
}

export default class GameDataManager {

    constructor(gameData, metadata = {}) {

        this.gameData = deepFreeze(structuredClone(gameData));
        this.metadata = deepFreeze(structuredClone(metadata));

        /**
         * Registry các collection chứa Skill.
         * Sau này thêm PetSkill, EquipmentSkill...
         * chỉ cần thêm vào đây.
         */
        this.skillCollections = [
            "attackSkills",
            "defenseSkills",
            "cultivationArts"
        ];

    }

    getCollection(collectionName) {

        return this.gameData[collectionName] || null;

    }

    getRecord(collectionName, recordId) {

        const collection =
            this.getCollection(collectionName);

        if (!collection) {
            return null;
        }

        return collection[String(recordId)] || null;

    }

    hasRecord(collectionName, recordId) {

        return Boolean(
            this.getRecord(collectionName, recordId)
        );

    }

    requireRecord(collectionName, recordId) {

        const record =
            this.getRecord(collectionName, recordId);

        if (!record) {

            throw new AppError(

                `Missing game data record: ${collectionName}.${recordId}`,

                {

                    code: "GAME_DATA_RECORD_NOT_FOUND",

                    details: {

                        collectionName,

                        recordId

                    }

                }

            );

        }

        return record;

    }

    /**
     * Generic Skill Lookup
     */
    findSkill(skillId) {

        for (const collectionName of this.skillCollections) {

            const skill =
                this.getRecord(collectionName, skillId);

            if (skill) {
                return skill;
            }

        }

        return null;

    }

    /**
     * Generic Skill Require
     */
    requireSkill(skillId) {

        const skill =
            this.findSkill(skillId);

        if (!skill) {

            throw new AppError(

                `Missing skill definition: ${skillId}`,

                {

                    code: "SKILL_NOT_FOUND",

                    details: {

                        skillId

                    }

                }

            );

        }

        return skill;

    }

    getSummary() {

        const summary = {};

        for (const [collectionName, value] of Object.entries(this.gameData)) {

            if (Array.isArray(value)) {

                summary[collectionName] = value.length;

                continue;

            }

            if (value && typeof value === 'object') {

                summary[collectionName] =
                    Object.keys(value).length;

                continue;

            }

            summary[collectionName] = 0;

        }

        return summary;

    }

    getMetadata() {

        return this.metadata;

    }

    getLoadedSources() {

        return Object.entries(this.metadata).map(

            ([collectionName, source]) => ({

                collectionName,

                relativePath: source.relativePath,

                fullPath: source.fullPath

            })

        );

    }

}