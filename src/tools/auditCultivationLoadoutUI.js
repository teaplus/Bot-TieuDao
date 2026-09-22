import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import {
    createCultivationLoadoutPayload,
    getSkillLoadoutPage,
    loadCultivationLoadoutState
} from '../application/discord/CultivationLoadoutPresentation.js';
import CultivationArtCommand from '../commands/player/congphap.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const manager = bootstrapGameData();
setGameDataManager(manager);
const activeArt = {
    id: 'CP_FIRE_HOANG',
    name: 'Hỏa Diễm Quyết',
    rarity: 'HOANG',
    active: true,
    effects: [{ stat: 'cultivation_speed', mode: 'add_percent_base', value: 0.1 }]
};
const inactiveArt = {
    id: 'CP_WOOD_HOANG',
    name: 'Thanh Mộc Quyết',
    rarity: 'HOANG',
    active: false,
    effects: [{ stat: 'cultivation_speed', mode: 'add_percent_base', value: 0.1 }]
};
const learnedSkills = [
    {
        id: 'SK_FIRE_HOANG',
        name: 'Hỏa Cầu Thuật',
        type: 'ACTIVE',
        isEquipped: true,
        equippedSlot: 1,
        getEffects: () => []
    },
    {
        id: 'DEF_FIRE_HOANG',
        name: 'Hỏa Linh Hộ Thể',
        type: 'PASSIVE',
        isEquipped: true,
        equippedSlot: 2,
        getEffects: () => [{ stat: 'def', mode: 'add_percent_base', value: 0.1 }]
    },
    ...Array.from({ length: 27 }, (_, index) => ({
        id: `AUDIT_SKILL_${index}`,
        name: `Kỹ Năng Audit ${index}`,
        type: 'PASSIVE',
        isEquipped: false,
        equippedSlot: null,
        getEffects: () => []
    }))
];
const client = {
    cultivationArtService: {
        async listLearnableCultivationArts() {
            return {
                learnedArts: [activeArt, inactiveArt],
                books: [{ uuid: 'A:1', name: 'Huyền Thủy Quyết', description: 'Bí kíp.' }]
            };
        }
    },
    skillService: {
        async listLearnableSkills() {
            return {
                learnedSkills,
                books: [{ uuid: 'S:1', name: 'Băng Phong Thuật', skill: { type: 'ACTIVE' } }],
                loadout: {
                    capacity: 2,
                    maxActiveSkills: 3,
                    revision: 1,
                    equippedSkillIds: ['SK_FIRE_HOANG', 'DEF_FIRE_HOANG']
                }
            };
        }
    }
};

const state = await loadCultivationLoadoutState(client, 'player-audit');
const firstPage = getSkillLoadoutPage(state, 0);
const secondPage = getSkillLoadoutPage(state, 1);
assert(firstPage.entries.length === 25, 'First Skill page does not respect Discord option cap');
assert(secondPage.entries.some((skill) => skill.id === 'SK_FIRE_HOANG')
    && secondPage.entries.some((skill) => skill.id === 'DEF_FIRE_HOANG'),
'Every Skill page must retain all currently equipped skills');

const payload = createCultivationLoadoutPayload({
    state,
    sessionId: 'session-audit',
    skillPage: 0
});
const embed = payload.embeds[0].toJSON();
const componentIds = payload.components.flatMap(
    (row) => row.components.map((component) => component.data.custom_id)
);
assert(embed.title.includes('Công Pháp') && embed.title.includes('Kỹ Năng'),
    'Unified dashboard title is missing');
assert(embed.fields.some((field) => field.value.includes('Hỏa Diễm Quyết')
    && field.value.includes('10%')),
'Active cultivation art and formatted effect must be visible');
assert(embed.fields.some((field) => field.value.includes('Hỏa Cầu Thuật')),
    'Learned Skill summary must be visible');
assert(embed.fields.some((field) => field.name.includes('(2/2)')
    && field.value.includes('Chủ động: **1/3**')
    && field.value.includes('Bị động: **1**')),
'Equipped Active/Passive loadout summary is missing');
assert(componentIds.includes('congphap:session-audit:equip-art')
    && componentIds.includes('congphap:session-audit:equip-skills'),
'Cultivation Art and Skill selects are not separate');
assert(componentIds.includes('congphap:session-audit:skill-prev')
    && componentIds.includes('congphap:session-audit:skill-next'),
'Skill pagination controls are missing');
assert(payload.components.length <= 5, 'Dashboard exceeds Discord action-row limit');

const skillSelect = payload.components
    .flatMap((row) => row.components)
    .find((component) => component.data.custom_id.endsWith(':equip-skills'));
assert(skillSelect.data.min_values === 0 && skillSelect.data.max_values === 2,
    'Skill select does not support unequip-all/current Realm capacity');
assert(skillSelect.options.filter((option) => option.data.default).length === 2,
    'Current Skill loadout is not selected by default');

const command = new CultivationArtCommand();
assert((command.getSlashData().toJSON().options || []).length === 0,
    '/congphap must not expose legacy subcommands');
assert(!fs.existsSync(new URL('../commands/player/kynang.js', import.meta.url)),
    'Legacy /kynang command must remain removed');

console.log(JSON.stringify({
    status: 'PASS',
    command: 'congphap',
    controls: componentIds,
    checks: [
        'separate-art-and-skill-selects',
        'equipped-active-passive-summary',
        'multi-select-capacity',
        'unequip-all',
        'skill-pagination-keeps-equipped',
        'discord-five-row-limit'
    ]
}, null, 2));
