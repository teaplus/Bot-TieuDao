import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import EffectFormatter from '../../core/EffectFormatter.js';

const SCOPE_LABELS = Object.freeze({
    ACTION: 'Kỹ năng cùng hệ',
    CULTIVATION: 'Tu luyện',
    ENTITY: 'Chiến đấu',
    BREAKTHROUGH: 'Đột phá'
});

function formatPercent(value) {
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

function formatEffects(destiny) {
    if (!destiny.effects.length) return '• Chưa có hiệu ứng cộng thêm.';
    return destiny.effects
        .map((effect) => (
            `• ${SCOPE_LABELS[effect.scope] || effect.scope}: ${EffectFormatter.format(effect)}`
        ))
        .join('\n');
}

function buttonId(sessionId, action) {
    return `start:${sessionId}:${action}`;
}

export function createDaoNameModal(sessionId, rules, currentName = '') {
    const input = new TextInputBuilder()
        .setCustomId('dao_name')
        .setLabel('Đạo hiệu')
        .setPlaceholder('Ví dụ: Vân Du Tán Nhân')
        .setStyle(TextInputStyle.Short)
        .setMinLength(rules.daoName.minLength)
        .setMaxLength(rules.daoName.maxLength)
        .setRequired(true);
    if (currentName) input.setValue(currentName);

    return new ModalBuilder()
        .setCustomId(`start:${sessionId}:dao-name`)
        .setTitle('Khai mở đạo đồ')
        .addComponents(new ActionRowBuilder().addComponents(input));
}

export function createCharacterCreationPayload(state, sessionId, rules, options = {}) {
    const remaining = Math.max(0, rules.maxRerolls - state.rerollsUsed);
    const destiny = state.destiny;
    const lines = [
        '## ✦ KHAI MỞ ĐẠO ĐỒ',
        `**Đạo hiệu:** ${state.daoName}`,
        `**Linh Căn:** ${destiny.spiritRootName} — ${destiny.spiritRootQualityName}`,
        `**Hệ tương hợp:** ${destiny.elementIds.length ? destiny.elementIds.join(', ') : 'Vô hệ / Trung tính'}`,
        `**Lượt tái tạo còn lại:** ${remaining}/${rules.maxRerolls}`,
        '',
        '**Hiệu ứng Linh Căn**',
        formatEffects(destiny)
    ];

    if (state.showOdds) {
        lines.push(
            '',
            '**Tỷ lệ loại Linh Căn**',
            state.odds.roots.map((entry) => `${entry.name}: ${formatPercent(entry.percent)}%`).join(' · '),
            '',
            '**Tỷ lệ phẩm cấp ở lần tạo nhân vật**',
            state.odds.qualities
                .map((entry) => `${entry.name}: ${formatPercent(entry.percent)}%`)
                .join(' · ')
        );
    }
    if (options.notice) lines.push('', options.notice);

    const disabled = options.disabled === true;
    return {
        content: lines.join('\n'),
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId(sessionId, 'reroll'))
                .setLabel('Tái tạo Linh Căn')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || remaining <= 0),
            new ButtonBuilder()
                .setCustomId(buttonId(sessionId, 'confirm'))
                .setLabel('Xác nhận nhập đạo')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(buttonId(sessionId, 'odds'))
                .setLabel(state.showOdds ? 'Ẩn tỷ lệ' : 'Xem tỷ lệ')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(buttonId(sessionId, 'rename'))
                .setLabel('Đổi đạo hiệu')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(buttonId(sessionId, 'cancel'))
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
        )]
    };
}

export function createCharacterCreationSuccessPayload(state, result, sessionId, rules) {
    const preview = createCharacterCreationPayload(state, sessionId, rules, {
        disabled: true
    });
    return {
        content: [
            preview.content,
            '',
            '## ✓ ĐẠO LỘ ĐÃ MỞ',
            `Đạo hữu nhận **${result.spiritStones} Linh thạch** và đặt chân tại **${result.currentMap.name}**.`,
            `**Công pháp nhập môn:** ${result.cultivationArtName} [${result.cultivationArtRarity}]`,
            `**Pháp khí ban đầu:** ${result.starterEquipment.getDisplayString()}`,
            `**Đan phương nhập môn:** ${result.starterRecipes.map((recipe) => recipe.name).join(', ')}`
        ].join('\n'),
        components: preview.components
    };
}

export function getDaoNameErrorMessage(error, rules) {
    const messages = {
        DAO_NAME_REQUIRED: 'Đạo hiệu không được để trống.',
        DAO_NAME_TOO_SHORT: `Đạo hiệu phải có ít nhất ${rules.daoName.minLength} ký tự.`,
        DAO_NAME_TOO_LONG: `Đạo hiệu chỉ được dài tối đa ${rules.daoName.maxLength} ký tự.`,
        DAO_NAME_INVALID_CHARACTERS: 'Đạo hiệu chỉ được dùng chữ, số và khoảng trắng.'
    };
    return messages[error?.message] || null;
}
