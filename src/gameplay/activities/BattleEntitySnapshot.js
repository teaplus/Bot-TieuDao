export function createBattleEntitySnapshot(entity) {
    return Object.freeze({
        id: entity.id,
        name: entity.name,
        team: entity.team,
        sourceType: entity.sourceType,
        sourceId: entity.sourceId,
        battleStat: Object.freeze({ ...entity.battleStat }),
        currentHP: entity.currentHP,
        currentShield: entity.currentShield,
        effects: Object.freeze(entity.effects.map((effect) => Object.freeze({ ...effect }))),
        skills: Object.freeze([...entity.skills]),
        metadata: Object.freeze({ ...entity.metadata })
    });
}
