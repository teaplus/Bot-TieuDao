import LuanHoiCommand, {
    createRebirthPreviewPayload,
    REBIRTH_CONFIRM_TIMEOUT_MS
} from '../commands/player/luanhoi.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const preview = {
    outcome: 'REBIRTH_ELIGIBLE', currentRebirthCount: '3', nextRebirthCount: '4',
    policyRevision: 1,
    resetRealmName: 'Luyện Khí', resetRealmStage: 1, retainedSpiritStone: '999',
    baseStats: { hp: '300', atk: '60', def: '30', spd: '7' }
};
const success = {
    outcome: 'REBIRTH_SUCCESS', rebirthCount: '4', realmName: 'Luyện Khí', realmStage: 1,
    retainedSpiritStone: '999', baseStats: preview.baseStats, historyId: '44'
};
const edits = [];
let deferOptions;
let componentDeferred = false;
const component = {
    id: 'confirm-interaction-1',
    user: { id: 'owner' },
    customId: 'luanhoi:slash-interaction-1:confirm',
    async deferUpdate() { componentDeferred = true; }
};
let waits = 0;
const message = {
    async awaitMessageComponent(options) {
        waits += 1;
        assert(options.time === REBIRTH_CONFIRM_TIMEOUT_MS, 'Confirmation TTL mismatch');
        assert(options.filter(component), 'Owner confirmation was rejected');
        assert(!options.filter({ ...component, user: { id: 'intruder' } }), 'Foreign user was accepted');
        return component;
    }
};
const interaction = {
    id: 'slash-interaction-1',
    user: { id: 'owner' },
    async deferReply(options) { deferOptions = options; },
    async editReply(payload) { edits.push(payload); return message; }
};
let rebirthOptions;
const client = {
    rebirthService: {
        async preview() { return preview; },
        async rebirth(_playerId, options) { rebirthOptions = options; return success; }
    },
    logger: { error() {} }
};

await new LuanHoiCommand().execute(interaction, client);
assert(REBIRTH_CONFIRM_TIMEOUT_MS === 120000, 'Approved two-minute TTL mismatch');
assert(Boolean(deferOptions?.flags), 'Destructive confirmation must be ephemeral');
assert(componentDeferred && waits === 1, 'Confirmation component was not acknowledged once');
assert(rebirthOptions.operationId === component.id, 'Confirm interaction must be idempotency key');
assert(rebirthOptions.expectedRebirthCount === preview.nextRebirthCount,
    'Preview identity count was not sent to core service');
assert(rebirthOptions.expectedPolicyRevision === preview.policyRevision,
    'Preview policy revision was not sent to core service');
assert(edits.at(-1).components.length === 0, 'Success response must remove destructive buttons');

const serialized = JSON.stringify(createRebirthPreviewPayload(preview, interaction.id));
assert(serialized.includes('không thể hoàn tác') && serialized.includes('Xác nhận Luân hồi'),
    'Destructive preview warning/buttons missing');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        command: '/luanhoi', ephemeral: true, ownerOnly: true,
        timeoutMs: REBIRTH_CONFIRM_TIMEOUT_MS,
        interactionIdempotencyKey: true, expectedRebirthCount: true
    }
}, null, 2));
