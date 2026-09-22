import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import SectService from '../gameplay/sect/SectService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import SectCommand from '../commands/player/tongmon.js';
import { createSectPayload } from '../application/discord/SectPresentation.js';

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const expectedElementIcons = Object.freeze({
    METAL: '⚙️',
    WOOD: '🌿',
    WATER: '💧',
    FIRE: '🔥',
    EARTH: '⛰️',
    ICE: '❄️',
    LIGHTNING: '⚡',
    WIND: '🌪️',
    DARK: '🌑',
    CHAOS: '☯️'
});
for (const [elementId, icon] of Object.entries(expectedElementIcons)) {
    assert.equal(gameDataManager.getRecord('elements', elementId)?.icon, icon,
        `Canonical Element icon mismatch for ${elementId}`);
}
const runtimePlayerFactory = new RuntimePlayerFactory();
const createRuntimePlayer = (overrides = {}) => runtimePlayerFactory.create({
    playerId: 'sect-command-player',
    name: 'Đạo Hữu Thử Nghiệm',
    realmId: 15,
    realmStage: 10,
    cultivationArtId: 'CP_FIRE_HOANG',
    spiritualRoot: 'FIRE',
    sectId: overrides.sectId || null,
    sectRejoinAvailableAt: overrides.sectRejoinAvailableAt || null,
    sectPolicyRevision: overrides.sectPolicyRevision || null,
    sectPoints: overrides.sectPoints || '1000000',
    spiritStones: '1000000',
    cultivation: 0,
    baseAtk: 100,
    baseDef: 100,
    baseHp: 1000,
    baseSpd: 100,
    inventory: [],
    learnedSkillIds: [],
    equippedSkillIds: [],
    cultivationArtIds: ['CP_FIRE_HOANG']
});

let runtimePlayer = createRuntimePlayer();
const mutations = [];
const transactionClient = { id: 'sect-command-transaction' };
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async joinSect(playerId, payload) {
        mutations.push({ type: 'JOIN', playerId, payload });
        runtimePlayer = createRuntimePlayer({ sectId: payload.sectId });
        return { status: 'JOINED_SECT', playerId, sectId: payload.sectId };
    },
    async exchangeTemplate(playerId, payload) {
        mutations.push({ type: 'EXCHANGE', playerId, payload });
        return {
            status: 'EXCHANGED',
            playerId,
            rewards: payload.rewards
        };
    },
    async leaveSect(playerId, payload) {
        mutations.push({ type: 'LEAVE', playerId, payload });
        runtimePlayer = createRuntimePlayer({
            sectRejoinAvailableAt: payload.rejoinAvailableAt,
            sectPolicyRevision: payload.policyRevision
        });
        return { status: 'LEFT_SECT', playerId, ...payload };
    }
};
const sectService = new SectService({
    playerRuntimeRepository,
    gameDataManager,
    operationExecutor: {
        async execute(_operation, work) {
            return work(transactionClient);
        }
    },
    seedProvider: { nextSeed: () => 20260730 },
    timeProvider: { now: () => new Date('2026-07-30T00:00:00.000Z') }
});

const initialOverview = await sectService.listSects(runtimePlayer.playerId);
assert.equal(initialOverview.sects.length, 10);
assert.equal(initialOverview.sectPoints, '1000000');
assert.equal(initialOverview.membershipPolicy.leaveCooldownSeconds, 604800);
assert.equal(initialOverview.membershipPolicy.retainSectPoints, true);
const sectEffectIds = initialOverview.sects.flatMap((sect) => sect.effects);
assert.equal(sectEffectIds.length, 15);
assert(sectEffectIds.every((effectId) => {
    const effect = gameDataManager.getRecord('coreEffects', effectId);
    return String(effect?.displayName || effect?.name || '').trim()
        && String(effect?.description || '').trim();
}), 'Every Sect Effect must have a display name and full description');

const presentationInteraction = {
    user: {
        displayAvatarURL: () => 'https://example.invalid/avatar.png'
    }
};
const presentationState = {
    overview: initialOverview,
    exchange: null,
    gameDataManager
};
for (const sect of initialOverview.sects) {
    const payload = createSectPayload({
        interaction: presentationInteraction,
        state: presentationState,
        selectedSectId: sect.id,
        selectedRuleId: null,
        sessionId: `presentation-${sect.id}`
    });
    const embed = payload.embeds[0].toJSON();
    const serialized = JSON.stringify(embed);
    assert(!serialized.toLowerCase().includes('undefined'),
        `Sect presentation contains undefined for ${sect.id}`);
    const directory = embed.fields.find((field) => field.name.includes('Danh sách Tông Môn'));
    assert(directory, 'Sect directory field is missing');
    assert(initialOverview.sects.every((entry) => directory.value.includes(entry.name)),
        'Sect directory must show all ten Sect names');
    const selectedField = embed.fields.find((field) => (
        !field.name.includes('Danh sách Tông Môn') && field.name.includes(sect.name)
    ));
    assert(selectedField, `Selected Sect detail is missing for ${sect.id}`);
    assert(sect.effects.every((effectId) => {
        const effect = gameDataManager.getRecord('coreEffects', effectId);
        return selectedField.value.includes(effect.displayName)
            && selectedField.value.includes(effect.description);
    }), `Selected Sect must show every complete Effect for ${sect.id}`);
    const element = sect.element
        ? gameDataManager.getRecord('elements', sect.element)
        : null;
    const elementLabel = element
        ? `${element.icon} ${element.displayName}`
        : 'Vô hệ';
    assert(directory.value.includes(`**${sect.name}** [${elementLabel}]`),
        `Sect directory does not use canonical Element presentation for ${sect.id}`);
    assert(selectedField.value.includes(`**Truyền thừa:** ${elementLabel}`),
        `Selected Sect does not use canonical Element presentation for ${sect.id}`);
    const selectOption = payload.components[0].toJSON().components[0].options.find(
        (option) => option.value === sect.id
    );
    assert(selectOption?.description?.startsWith(elementLabel),
        `Sect select does not use canonical Element icon for ${sect.id}`);
    assert(embed.fields.every((field) => field.name.length <= 256 && field.value.length <= 1024),
        `Sect embed field exceeds Discord limits for ${sect.id}`);
}

const sessionId = 'sect-command-interaction';
const actionNames = ['join', 'join', 'exchange', 'leave', 'leave', 'close'];
const components = actionNames.map((action, index) => ({
    id: `sect-command-component-${index + 1}`,
    customId: `tongmon:${sessionId}:${action}`,
    user: { id: runtimePlayer.playerId },
    values: [],
    deferred: false,
    updatedPayload: null,
    async deferUpdate() {
        this.deferred = true;
    },
    async update(payload) {
        this.updatedPayload = payload;
    }
}));
let componentCursor = 0;
const message = {
    async awaitMessageComponent() {
        if (componentCursor >= components.length) {
            throw new Error('AUDIT_COMPONENT_QUEUE_EMPTY');
        }
        return components[componentCursor++];
    }
};
const replies = [];
const interaction = {
    id: sessionId,
    user: {
        id: runtimePlayer.playerId,
        displayAvatarURL: () => 'https://example.invalid/avatar.png'
    },
    deferredOptions: null,
    async deferReply(options) {
        this.deferredOptions = options;
    },
    async editReply(payload) {
        replies.push(payload);
        return message;
    }
};
const command = new SectCommand();
await command.execute(interaction, {
    sectService,
    gameDataManager,
    logger: { error() {} }
});

assert.equal(interaction.deferredOptions.flags, MessageFlags.Ephemeral);
assert.deepEqual(mutations.map((mutation) => mutation.type), [
    'JOIN',
    'EXCHANGE',
    'LEAVE'
]);
assert.equal(mutations[0].payload.sectId, 'SECT_FIRE');
assert.equal(mutations[1].payload.exchangeId, 'SECT:SECT_FIRE:CULTIVATION_ART_HOANG');
assert.equal(mutations[2].payload.policyRevision, 'sect-membership-v1');
assert.equal(
    new Date(mutations[2].payload.rejoinAvailableAt).toISOString(),
    '2026-08-06T00:00:00.000Z'
);
assert.equal(components.filter((component) => component.deferred).length, 5);
assert(components.at(-1).updatedPayload, 'Close action did not update the message');

const firstPayload = replies[0];
assert.equal(firstPayload.embeds.length, 1);
assert.equal(firstPayload.components.length, 3);
assert.equal(firstPayload.components[0].components[0].options.length, 10);
assert(firstPayload.components.every((row) => row.components.length <= 5));
const joinedPayload = replies.find((payload) => (
    payload.embeds?.[0]?.toJSON().description?.includes('Đã bái nhập')
));
const exchangedPayload = replies.find((payload) => (
    payload.embeds?.[0]?.toJSON().description?.includes('đổi được')
));
const leftPayload = replies.find((payload) => (
    payload.embeds?.[0]?.toJSON().description?.includes('Đã rời')
));
assert(joinedPayload, 'Join confirmation was not presented');
assert(exchangedPayload, 'Exchange reward was not presented');
assert(leftPayload, 'Leave cooldown was not presented');
assert(components.at(-1).updatedPayload.components.every((row) => (
    row.components.every((component) => component.data.disabled === true)
)), 'Closed Sect panel must disable every component');

console.log(JSON.stringify({
    status: 'PASS',
    command: '/tongmon',
    sects: initialOverview.sects.length,
    componentRows: firstPayload.components.length,
    mutationFlow: mutations.map((mutation) => mutation.type),
    confirmations: {
        join: true,
        leave: true
    },
    idempotentOperationIds: mutations.length,
    leaveCooldownSeconds: initialOverview.membershipPolicy.leaveCooldownSeconds,
    effectDefinitions: sectEffectIds.length,
    undefinedPresentationValues: 0,
    completeSectDirectory: true,
    configuredElementIcons: Object.keys(expectedElementIcons).length,
    sectElementPresentation: 'CANONICAL_GAMEDATA'
}, null, 2));
