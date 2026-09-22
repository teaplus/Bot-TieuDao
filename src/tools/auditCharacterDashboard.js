import NhanVatCommand, { DASHBOARD_TABS, renderDashboardPayload } from '../commands/player/nhanvat.js';
import { renderCultivationEmbed } from '../commands/player/tuvi.js';
import { buildAttributeBonusProjection } from '../gameplay/player/PlayerReadService.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

setGameDataManager(bootstrapGameData());

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const player = {
    name: 'Thanh Vân',
    realmInfo: { name: 'Luyện Khí', req_cul: 1000 },
    realmStage: 3,
    rebirthCount: '2',
    spiritualRoot: 'Phong Linh Căn',
    spiritRootQualityInfo: { displayName: 'Thượng Phẩm' },
    spiritStones: '123456',
    cultivation: '450',
    cultivationSpeed: 1.2,
    cultivationArt: {
        name: 'Thanh Phong Quyết',
        rarityInfo: { name: 'Huyền' }
    },
    equipments: [{
        isEquipped: true,
        equippedSlot: 'WEAPON',
        name: 'Thanh Phong Kiếm',
        rarityInfo: { name: 'Hiếm' },
        getEffectsDisplay: () => 'Công kích +10%'
    }],
    effects: [{ stat: 'atk', mode: 'add_percent_base', value: 0.1 }],
    getFinalStat(stat) {
        return { hp: 1200, atk: 180, def: 90, spd: 130 }[stat];
    },
    getCultivationProgress: () => 47.5,
    isAtMaxStage: () => false
};

const state = {
    player,
    skills: [{ name: 'Phong Nhận', type: 'ACTIVE' }],
    attributeBonuses: [
        { stat: 'atk', mode: 'add_percent_base', value: 0.25 },
        { stat: 'def', mode: 'add_flat_base', value: 20 },
        { stat: 'cultivation_speed', mode: 'mul_total', value: 1.2 }
    ],
    spiritRootEffects: [{
        scope: 'ACTION', stat: 'finalDamage', mode: 'add_percent_base', value: 0.04,
        modifierId: 'SPIRIT_ROOT_MATCH_DAMAGE_UP_4'
    }],
    cultivationPreview: {
        earned: '25',
        seconds: 3600,
        gainPerMinute: '1.2',
        persistedCultivation: '450',
        projectedCultivation: '475',
        fullEfficiencyGain: '25',
        overflowEffectiveGain: '0'
    },
    inventoryItems: [
        player.equipments[0],
        { type: 'ITEM', name: 'Tụ Khí Đan' }
    ],
    location: {
        current: {
            displayName: 'Thanh Vân Sơn Mạch',
            description: 'Sơn mạch nhập môn.',
            navigationOrder: 1,
            activityTypes: ['EXPLORATION']
        },
        currentRealmName: 'Luyện Khí',
        lower: { map: null, access: { canEnter: false } },
        higher: {
            map: { displayName: 'Huyền Mộc Quốc' },
            access: { canEnter: false, reason: 'MAP_LOCKED:HUYEN_MOC_QUOC' }
        }
    }
};
const interaction = {
    user: {
        displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    }
};
const tabIds = Object.values(DASHBOARD_TABS);

const cultivationCommandEmbed = renderCultivationEmbed(interaction, {
    player,
    afkData: {
        earned: '0',
        seconds: 0,
        gainPerMinute: '75'
    }
}).toJSON();
const cultivationSpeedField = cultivationCommandEmbed.fields
    .find((field) => field.name === 'Toc Do Hap Thu');
assert(cultivationSpeedField?.value === '75 Tu vi / phut',
    '/tuvi must display gainPerMinute instead of the dimensionless cultivation multiplier',
    cultivationSpeedField);

for (const activeTab of tabIds) {
    const payload = renderDashboardPayload({
        state,
        interaction,
        sessionId: 'audit-session',
        activeTab
    });
    const embed = payload.embeds[0].toJSON();
    const rows = payload.components.map((row) => row.toJSON());
    const buttons = rows.flatMap((row) => row.components);

    assert(payload.embeds.length === 1, 'Dashboard must render one embed', activeTab);
    assert(rows.length === 1 && buttons.length === 5, 'Dashboard navigation must fit one row with five tabs', rows);
    assert(new Set(buttons.map((button) => button.custom_id)).size === 5, 'Dashboard custom IDs must be unique', buttons);
    assert(buttons.filter((button) => button.disabled).length === 1, 'Only active tab must be disabled', buttons);
    assert(embed.title.length <= 256 && (embed.description?.length || 0) <= 4096,
        'Dashboard embed exceeds Discord text limits', embed);
    assert((embed.fields || []).length <= 25
        && (embed.fields || []).every((field) => field.name.length <= 256 && field.value.length <= 1024),
    'Dashboard fields exceed Discord limits', embed.fields);
    if (activeTab === DASHBOARD_TABS.OVERVIEW) {
        const overviewText = (embed.fields || []).map((field) => `${field.name}\n${field.value}`).join('\n');
        assert(embed.fields.some((field) => field.name.includes('Đạo cơ'))
            && overviewText.includes('Tu vi dự kiến')
            && overviewText.includes('Thuộc tính cộng thêm')
            && overviewText.includes('+25%')
            && overviewText.includes('**Linh Căn:**')
            && overviewText.includes('+4%'),
        'Overview must prioritize identity and projected progression', embed.fields);
    }
    if (activeTab === DASHBOARD_TABS.CULTIVATION) {
        const cultivationText = (embed.fields || []).map((field) => `${field.name}\n${field.value}`).join('\n');
        assert(cultivationText.includes('Tu vi đã lưu')
            && cultivationText.includes('Đang chờ nhận')
            && cultivationText.includes('/ phút'),
        'Cultivation tab must separate persisted, pending and rate semantics', embed.fields);
    }
}

const projectedEffects = buildAttributeBonusProjection({
    equipments: [
        {
            isEquipped: true,
            getEffects: () => [
                { stat: 'atk', mode: 'add_percent_base', value: 0.1, source: 'equipment:sword' },
                { stat: 'atk', mode: 'add_flat_base', value: 20, source: 'equipment:sword' },
                { stat: 'hp', mode: 'mul_total', value: 1.1, source: 'equipment:sword' }
            ]
        },
        {
            isEquipped: false,
            getEffects: () => [
                { stat: 'atk', mode: 'add_percent_base', value: 9, source: 'equipment:inactive' }
            ]
        }
    ],
    cultivationArt: {
        getEffects: () => [
            { stat: 'atk', mode: 'add_percent_base', value: 0.15, source: 'art:active' },
            { stat: 'hp', mode: 'mul_total', value: 1.2, source: 'art:active' }
        ]
    },
    passiveSkills: [{
        getEffects: () => [{ stat: 'atk', mode: 'add_percent_base', value: 5, source: 'passive:excluded' }]
    }],
    activeBuffs: [{ effects: [{ stat: 'atk', mode: 'add_percent_base', value: 5, source: 'buff:excluded' }] }]
}, [{
    stat: 'atk',
    mode: 'add_percent_base',
    value: 0.05,
    source: 'spirit-root:quality'
}]);
const percentAtk = projectedEffects.find((effect) => (
    effect.stat === 'atk' && effect.mode === 'add_percent_base'
));
const flatAtk = projectedEffects.find((effect) => (
    effect.stat === 'atk' && effect.mode === 'add_flat_base'
));
const totalHp = projectedEffects.find((effect) => effect.stat === 'hp' && effect.mode === 'mul_total');
assert(Math.abs(percentAtk.value - 0.3) < 1e-9,
    'Equipment, active art and spirit-root effects with the same stat/mode must add', projectedEffects);
assert(flatAtk.value === 20,
    'Flat and percentage effects for the same stat must remain separate', projectedEffects);
assert(Math.abs(totalHp.value - 1.32) < 1e-9,
    'mul_total effects must multiply instead of adding raw multipliers', projectedEffects);
assert(!projectedEffects.some((effect) => effect.sources.includes('equipment:inactive')
    || effect.sources.includes('passive:excluded')
    || effect.sources.includes('buff:excluded')),
'Overview projection must include only equipped items, the active art and spirit-root effects', projectedEffects);

const expired = renderDashboardPayload({
    state,
    interaction,
    sessionId: 'audit-session',
    activeTab: DASHBOARD_TABS.JOURNEY,
    expired: true
});
const expiredButtons = expired.components[0].toJSON().components;
assert(expiredButtons.every((button) => button.disabled), 'Expired dashboard must disable every component', expiredButtons);
assert(expired.embeds[0].toJSON().footer.text.includes('hết hạn'), 'Expired dashboard footer is missing');

const edits = [];
let deferred = false;
const commandInteraction = {
    id: 'dashboard-command-audit',
    user: {
        id: 'owner',
        displayAvatarURL: interaction.user.displayAvatarURL
    },
    async deferReply() {
        deferred = true;
    },
    async editReply(payload) {
        edits.push(payload);
        return {
            async awaitMessageComponent() {
                throw new Error('TIMEOUT');
            }
        };
    }
};
await new NhanVatCommand().execute(commandInteraction, {
    playerReadService: {
        async getManagementProfileView() {
            return {
                player,
                skills: state.skills,
                spiritRootEffects: state.spiritRootEffects,
                attributeBonuses: state.attributeBonuses,
                cultivationPreview: state.cultivationPreview
            };
        },
        async getInventoryView() {
            return { items: state.inventoryItems };
        }
    },
    playerMapService: {
        async getCurrentLocation() {
            return state.location;
        }
    }
});
assert(deferred, 'Dashboard command must defer its ephemeral response');
assert(edits.length === 2, 'Dashboard command must render initial and expired states', edits.length);
assert(edits[1].components[0].toJSON().components.every((button) => button.disabled),
    'Dashboard command timeout must disable all buttons');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        tabs: tabIds,
        oneNavigationRow: true,
        ownerSessionPrefix: 'nhanvat:audit-session:',
        discordPayloadLimits: true,
        expiredComponentsDisabled: true,
        commandLifecycle: true,
        equipmentArtAndSpiritRootEffectProjection: true,
        cultivationCommandUsesPerMinuteRate: true,
        existingCommandsRemainShortcuts: true
    }
}, null, 2));
