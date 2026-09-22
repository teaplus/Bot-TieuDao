import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

export default class ElementRelationResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    resolve(fromElementId, toElementId, options = {}) {
        if (!fromElementId || !toElementId) {
            return Object.freeze([]);
        }
        this.gameDataManager.requireRecord('elements', fromElementId);
        this.gameDataManager.requireRecord('elements', toElementId);
        const relationType = options.relationType || null;
        const relations = Object.values(this.gameDataManager.getCollection('elementRelations') || {})
            .filter((relation) => relation.from === fromElementId && relation.to === toElementId)
            .filter((relation) => !relationType || relation.relationType === relationType);
        return Object.freeze([...relations]);
    }

    has(fromElementId, toElementId, relationType = null) {
        return this.resolve(fromElementId, toElementId, { relationType }).length > 0;
    }
}
