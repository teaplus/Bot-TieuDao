import SpiritRootCommand, {
    createSpiritRootRerollPreviewPayload,
    SPIRIT_ROOT_CONFIRM_TIMEOUT_MS
} from '../commands/player/linhcan.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const current = {
    spiritRootId: 'HOA_LINH_CAN', spiritRootName: 'Hỏa Linh Căn',
    qualityTierId: 'UPPER_GRADE', qualityName: 'Thượng Phẩm', qualityOrder: 3,
    elementIds: ['FIRE'],
    effects: [{
        scope: 'CULTIVATION', stat: 'cultivation_speed',
        mode: 'mul_total', value: 1.1
    }, {
        scope: 'ACTION', stat: 'finalDamage', mode: 'add_percent_base', value: 0.04,
        modifierId: 'SPIRIT_ROOT_MATCH_DAMAGE_UP_4'
    }]
};
const preview = {
    outcome: 'SPIRIT_ROOT_REROLL_AVAILABLE', current, availableCount: '2',
    entitlement: { id: '41', rebirthNumber: '3' },
    pool: {
        bracketId: 'REBIRTH_10_19',
        qualityWeights: [
            { qualityName: 'Hạ Phẩm', weight: 10 },
            { qualityName: 'Trung Phẩm', weight: 22 },
            { qualityName: 'Thượng Phẩm', weight: 32 },
            { qualityName: 'Cực Phẩm', weight: 24 },
            { qualityName: 'Thiên Phẩm', weight: 8 },
            { qualityName: 'Thánh Phẩm', weight: 3 },
            { qualityName: 'Tiên Phẩm', weight: 1 },
            { qualityName: 'Thần Phẩm', weight: 0 }
        ]
    }
};
const result = {
    outcome: 'SPIRIT_ROOT_REROLL_SUCCESS', previous: current,
    current: { ...current, spiritRootId: 'LOI_LINH_CAN', spiritRootName: 'Lôi Linh Căn', qualityOrder: 2, qualityName: 'Trung Phẩm' },
    rejectedExactDuplicates: 1, historyId: '91'
};
let deferOptions;
let rerollOptions;
let componentDeferred = false;
const component = {
    id: 'component-operation-1', user: { id: 'owner' },
    customId: 'linhcan:slash-1:confirm',
    async deferUpdate() { componentDeferred = true; }
};
const message = {
    async awaitMessageComponent(options) {
        assert(options.time > 0 && options.time <= SPIRIT_ROOT_CONFIRM_TIMEOUT_MS, 'Command TTL mismatch');
        assert(options.filter(component), 'Owner confirm rejected');
        assert(!options.filter({ ...component, user: { id: 'intruder' } }), 'Foreign user accepted');
        return component;
    }
};
const edits = [];
const interaction = {
    id: 'slash-1', user: { id: 'owner' },
    options: { getSubcommand: () => 'reroll' },
    async deferReply(options) { deferOptions = options; },
    async editReply(payload) { edits.push(payload); return message; }
};
const client = {
    spiritRootRerollService: {
        async preview() { return preview; },
        async reroll(_playerId, options) { rerollOptions = options; return result; }
    },
    logger: { error() {} }
};

await new SpiritRootCommand().execute(interaction, client);
assert(Boolean(deferOptions?.flags), 'Reroll UI must be ephemeral');
assert(componentDeferred, 'Confirm component was not acknowledged');
assert(rerollOptions.operationId === component.id
    && rerollOptions.expectedEntitlementId === preview.entitlement.id,
'Component idempotency/stale identity mismatch', rerollOptions);
assert(edits.at(-1).components.length === 0, 'Success must remove destructive controls');
const serialized = JSON.stringify(createSpiritRootRerollPreviewPayload(preview, interaction.id));
assert(serialized.includes('Phẩm cấp có thể thấp hơn')
    && serialized.includes('Tái tạo Linh Căn')
    && serialized.includes('32%')
    && serialized.includes('Thần Phẩm')
    && serialized.includes('10%')
    && serialized.includes('4%')
    && serialized.includes('Kỹ năng cùng hệ')
    && serialized.includes('Hiệu ứng đang có'),
'Risk/odds preview is incomplete');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        command: '/linhcan reroll', ephemeral: true, ownerOnly: true,
        timeoutMs: SPIRIT_ROOT_CONFIRM_TIMEOUT_MS,
        interactionIdempotencyKey: true,
        expectedEntitlementGuard: true,
        lowerQualityWarning: true
    }
}, null, 2));
