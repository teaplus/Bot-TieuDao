import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import SectService from '../gameplay/sect/SectService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';

const manager = bootstrapGameData();
const sects = Object.values(manager.getCollection('sectTemplates'));
const rules = Object.values(manager.getCollection('sectExchangeRules'));
const pools = Object.values(manager.getCollection('sectRewardPools'));
const arts = Object.values(manager.getCollection('cultivationArts'))
    .filter((entry) => entry.tags?.includes('SECT_EXCLUSIVE'));
const skills = Object.values(manager.getCollection('skills'))
    .filter((entry) => entry.tags?.includes('SECT_EXCLUSIVE'));

assert.equal(sects.length, 10);
assert.equal(rules.length, 18);
assert.equal(arts.length, 60);
assert.equal(skills.filter((entry) => entry.type === 'ACTIVE').length, 60);
assert.equal(skills.filter((entry) => entry.type === 'PASSIVE').length, 60);
assert.equal(pools.length, 180);
assert(pools.every((pool) => pool.duplicatePolicy === 'DENY_OWNED' && pool.entries.length === 1));

for (const sect of sects) {
    const sectArts = arts.filter((entry) => entry.sectId === sect.id);
    const sectSkills = skills.filter((entry) => entry.sectId === sect.id);
    assert.equal(sectArts.length, 6, `${sect.id} must have six exclusive cultivation arts`);
    assert.equal(sectSkills.length, 12, `${sect.id} must have twelve exclusive skills`);
    assert([...sectArts, ...sectSkills].every((entry) => entry.element === sect.element),
        `${sect.id} inheritance element must match its canonical Sect element`);
    for (const rule of rules) {
        const pool = manager.getRecord('sectRewardPools', `${sect.id}:${rule.id}`);
        const item = manager.getRecord('itemTemplates', pool.entries[0].itemId);
        assert(item, `${pool.id} must reference a normalized item template`);
        assert.equal(item.rarity, rule.grade, `${pool.id} item grade must match exchange rule`);
        assert.equal(item.element, sect.element, `${pool.id} item element must match Sect`);
    }
}

const runtimePlayer = new RuntimePlayerFactory().create({
    playerId: 'sect-owned-audit',
    name: 'Kiểm Tra Truyền Thừa',
    realmId: 15,
    realmStage: 10,
    cultivationArtId: 'CP_NEUTRAL_HOANG',
    spiritualRoot: 'FIRE',
    sectId: 'SECT_FIRE',
    sectPoints: '999999999',
    spiritStones: '0',
    cultivation: 0,
    baseAtk: 10,
    baseDef: 10,
    baseHp: 100,
    baseSpd: 10,
    inventory: [{ instanceId: 'owned-defense-book', itemId: 'BOOK_SECT_DEF_FIRE_HOANG', quantity: 1 }],
    learnedSkillIds: ['SECT_ATK_FIRE_HOANG'],
    equippedSkillIds: [],
    cultivationArtIds: ['CP_NEUTRAL_HOANG', 'SECT_ART_FIRE_HOANG']
});
const service = new SectService({
    gameDataManager: manager,
    playerRuntimeRepository: {
        async findById() { return runtimePlayer; }
    }
});
const view = await service.listExchangeRules(runtimePlayer.playerId);
for (const ruleId of ['CULTIVATION_ART_HOANG', 'ATTACK_HOANG', 'DEFENSE_HOANG']) {
    const rule = view.rules.find((entry) => entry.id === ruleId);
    assert.equal(rule.available, false);
    assert.equal(rule.unavailableReason, 'SECT_REWARD_ALREADY_OWNED');
}

console.log(JSON.stringify({
    status: 'PASS',
    sects: sects.length,
    inheritances: arts.length + skills.length,
    cultivationArts: arts.length,
    attackSkills: skills.filter((entry) => entry.type === 'ACTIVE').length,
    defenseSkills: skills.filter((entry) => entry.type === 'PASSIVE').length,
    pools: pools.length,
    duplicateGuard: true
}, null, 2));
