import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import { createSectEmblemAttachment } from './UiAssetResolver.js';

const CATEGORY_LABELS = Object.freeze({
    CULTIVATION_ART: 'Công Pháp',
    ATTACK: 'Kỹ Năng Công',
    DEFENSE: 'Kỹ Năng Thủ'
});

const GRADE_LABELS = Object.freeze({
    HOANG: 'Hoàng',
    HUYEN: 'Huyền',
    DIA: 'Địa',
    THIEN: 'Thiên',
    THANH: 'Thánh',
    THAN: 'Thần'
});

const SCOPE_LABELS = Object.freeze({
    ENTITY: 'Chiến đấu',
    CULTIVATION: 'Tu luyện',
    BREAKTHROUGH: 'Đột phá'
});

const UNAVAILABLE_LABELS = Object.freeze({
    REALM_LOCKED: 'Chưa đủ cảnh giới',
    UNSUPPORTED_SECT_CURRENCY: 'Tiền tệ chưa được hỗ trợ',
    SECT_REWARD_POOL_EMPTY: 'Tông môn chưa có phần thưởng phù hợp',
    SECT_REWARD_ALREADY_OWNED: 'Đã học hoặc đang sở hữu bí kíp',
    INSUFFICIENT_SECT_POINT: 'Không đủ Điểm Tông Môn'
});

function formatPercent(value) {
    return `${Number(value || 0).toLocaleString('vi-VN', {
        maximumFractionDigits: 2
    })}%`;
}

function formatDuration(seconds) {
    const days = Number(seconds || 0) / 86400;
    if (Number.isInteger(days) && days > 0) return `${days} ngày`;
    const hours = Number(seconds || 0) / 3600;
    if (Number.isInteger(hours) && hours > 0) return `${hours} giờ`;
    return `${Number(seconds || 0)} giây`;
}

function effectDisplayName(effect, fallbackId = 'Hiệu ứng chưa định danh') {
    return String(effect?.displayName || effect?.name || effect?.id || fallbackId);
}

function elementPresentation(elementId, gameDataManager) {
    if (!elementId) {
        return Object.freeze({ id: null, icon: null, name: 'Vô hệ', label: 'Vô hệ' });
    }
    const element = gameDataManager?.getRecord('elements', elementId);
    const icon = element?.icon || null;
    const name = String(element?.displayName || element?.name || elementId);
    return Object.freeze({
        id: elementId,
        icon,
        name,
        label: icon ? `${icon} ${name}` : name
    });
}

function describeSectEffect(effect, gameDataManager, fallbackId = null) {
    if (!effect) {
        return `• **${fallbackId || 'Hiệu ứng chưa định danh'}:** Dữ liệu hiệu ứng đang thiếu.`;
    }
    const policy = effect.sectPolicy || {};
    let mechanic = String(effect.description || '').trim() || null;

    if (!mechanic && policy.kind === 'BURN_DURATION') {
        mechanic = `Thiêu Đốt do bản thân gây ra +${policy.durationBonusTurns} lượt`;
    } else if (!mechanic && policy.kind === 'SHIELD_BREAK_REFLECT') {
        mechanic = `Khi khiên vỡ, phản lại ${formatPercent(Number(policy.shieldDamageRatio) * 100)} lượng khiên đã hấp thụ`;
    } else if (!mechanic && policy.kind === 'SLOW_AFTER_CONTROL') {
        mechanic = `Khống chế thành công làm mục tiêu giảm Tốc Độ trong ${policy.durationTurns} lượt`;
    } else if (!mechanic && policy.kind === 'BATTLE_MODIFIER') {
        const modifier = gameDataManager?.getRecord('modifiers', policy.modifierId);
        mechanic = modifier
            ? EffectFormatter.format({
                ...modifier,
                value: modifier.normalizedValue
            })
            : policy.modifierId;
    } else if (!mechanic && policy.kind === 'CULTIVATION_MULTIPLIER') {
        mechanic = `Tốc độ tu luyện +${formatPercent(Number(policy.value) * 100)}`;
    } else if (!mechanic && policy.kind === 'BREAKTHROUGH_CHANCE') {
        const points = Number(policy.percentagePoints || 0);
        mechanic = `Tỷ lệ đột phá ${points > 0 ? '+' : ''}${formatPercent(points)}`;
    } else if (!mechanic) {
        const action = effect.actions?.[0];
        if (action?.type === 'HEAL') {
            const formula = gameDataManager?.getRecord('formulas', action.arguments?.formulaId);
            mechanic = formula?.description || 'Hồi máu vào cuối lượt';
        } else if (action?.type === 'PURIFY') {
            mechanic = 'Đầu lượt thanh tẩy một hiệu ứng bất lợi, một lần mỗi trận';
        }
    }

    const scopes = (effect.scopes || [])
        .map((scope) => SCOPE_LABELS[scope] || scope)
        .join('/');
    return `• **${effectDisplayName(effect, fallbackId)}**${scopes ? ` [${scopes}]` : ''}: ${mechanic || 'Nội tại Tông Môn'}`;
}

function createSectDirectory(state) {
    const manager = state.gameDataManager;
    return state.overview.sects.map((sect) => {
        const effectNames = sect.effects.map((effectId) => (
            effectDisplayName(manager?.getRecord('coreEffects', effectId), effectId)
        ));
        return `• **${sect.name}** [${elementPresentation(sect.element, manager).label}] — ${effectNames.join(', ')}`;
    }).join('\n');
}

function resolveSelection(state, selectedSectId, selectedRuleId) {
    const currentSect = state.overview.sects.find(
        (sect) => sect.id === state.overview.currentSectId
    ) || null;
    const selectedSect = state.overview.sects.find((sect) => sect.id === selectedSectId)
        || currentSect
        || state.overview.sects[0]
        || null;
    const rules = state.exchange?.rules || [];
    const selectedRule = rules.find((rule) => rule.id === selectedRuleId)
        || rules[0]
        || null;
    return { currentSect, selectedSect, selectedRule, rules };
}

function createComponents({
    state,
    selectedSectId,
    selectedRuleId,
    sessionId,
    pendingAction,
    disabled
}) {
    const { currentSect, selectedSect, selectedRule, rules } = resolveSelection(
        state,
        selectedSectId,
        selectedRuleId
    );
    const cooldownActive = state.overview.rejoinAvailableAt
        && new Date(state.overview.rejoinAvailableAt).getTime() > Date.now();
    const sectOptions = state.overview.sects.map((sect) => {
        const element = elementPresentation(sect.element, state.gameDataManager);
        const effectNames = sect.effects.map((effectId) => effectDisplayName(
            state.gameDataManager?.getRecord('coreEffects', effectId),
            effectId
        ));
        return {
            label: `${sect.joined ? '✓ ' : ''}${sect.name}`.slice(0, 100),
            value: sect.id,
            description: `${element.label} · ${effectNames.join(', ')}`.slice(0, 100),
            default: sect.id === selectedSect?.id
        };
    });
    const sectSelect = new StringSelectMenuBuilder()
        .setCustomId(`tongmon:${sessionId}:sect`)
        .setPlaceholder('Chọn Tông Môn để xem')
        .setDisabled(disabled || sectOptions.length === 0)
        .addOptions(sectOptions.length ? sectOptions : [{
            label: 'Chưa có Tông Môn',
            value: 'NO_SECT'
        }]);

    const ruleOptions = rules.map((rule) => ({
        label: `${rule.available ? '✓' : '🔒'} ${rule.rewardItem?.name || `${CATEGORY_LABELS[rule.category] || rule.category} · ${GRADE_LABELS[rule.grade] || rule.grade}`}`.slice(0, 100),
        value: rule.id,
        description: `${CATEGORY_LABELS[rule.category] || rule.category} · ${formatIntegerAmount(rule.cost.amount)} Điểm Tông Môn`.slice(0, 100),
        default: rule.id === selectedRule?.id
    }));
    const ruleSelect = new StringSelectMenuBuilder()
        .setCustomId(`tongmon:${sessionId}:rule`)
        .setPlaceholder(currentSect ? 'Chọn bí tịch muốn đổi' : 'Gia nhập Tông Môn để mở đổi thưởng')
        .setDisabled(disabled || !currentSect || ruleOptions.length === 0)
        .addOptions(ruleOptions.length ? ruleOptions : [{
            label: 'Chưa có danh mục đổi thưởng',
            value: 'NO_RULE'
        }]);

    const confirmingJoin = pendingAction?.type === 'JOIN'
        && pendingAction.sectId === selectedSect?.id;
    const confirmingLeave = pendingAction?.type === 'LEAVE';
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tongmon:${sessionId}:join`)
            .setLabel(confirmingJoin ? 'Xác nhận gia nhập' : 'Gia nhập')
            .setStyle(confirmingJoin ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(disabled || Boolean(currentSect) || cooldownActive || !selectedSect),
        new ButtonBuilder()
            .setCustomId(`tongmon:${sessionId}:exchange`)
            .setLabel('Đổi thưởng')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || !currentSect || !selectedRule?.available),
        new ButtonBuilder()
            .setCustomId(`tongmon:${sessionId}:leave`)
            .setLabel(confirmingLeave ? 'Xác nhận rời' : 'Rời Tông Môn')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || !currentSect),
        new ButtonBuilder()
            .setCustomId(`tongmon:${sessionId}:refresh`)
            .setLabel('Làm mới')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`tongmon:${sessionId}:close`)
            .setLabel('Đóng')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    return [
        new ActionRowBuilder().addComponents(sectSelect),
        new ActionRowBuilder().addComponents(ruleSelect),
        buttons
    ];
}

export function createSectPayload({
    interaction,
    state,
    selectedSectId,
    selectedRuleId,
    sessionId,
    pendingAction = null,
    notice = null,
    disabled = false
}) {
    const { currentSect, selectedSect, selectedRule } = resolveSelection(
        state,
        selectedSectId,
        selectedRuleId
    );
    const manager = state.gameDataManager;
    const selectedEffects = (selectedSect?.effects || []).map((effectId) => (
        describeSectEffect(manager?.getRecord('coreEffects', effectId), manager, effectId)
    ));
    const policy = state.overview.membershipPolicy;
    const emblem = createSectEmblemAttachment(selectedSect?.id);
    const embed = new EmbedBuilder()
        .setColor(currentSect ? '#D49A36' : '#637381')
        .setTitle('🏯 Tông Môn')
        .setThumbnail(emblem?.asset.imageUrl || interaction.user.displayAvatarURL())
        .setDescription([
            notice,
            currentSect
                ? `Đạo hữu hiện là môn đồ của **${currentSect.name}**.`
                : 'Chọn một Tông Môn để xem truyền thừa và cân nhắc gia nhập.',
            `**Điểm Tông Môn:** ${formatIntegerAmount(state.overview.sectPoints)}`
        ].filter(Boolean).join('\n'));

    if (state.overview.rejoinAvailableAt
        && new Date(state.overview.rejoinAvailableAt).getTime() > Date.now()) {
        embed.addFields({
            name: '⏳ Đang tĩnh tâm sau khi rời Tông',
            value: `Có thể gia nhập lại <t:${Math.floor(
                new Date(state.overview.rejoinAvailableAt).getTime() / 1000
            )}:R>.`
        });
    }

    embed.addFields({
        name: '📚 Danh sách Tông Môn',
        value: createSectDirectory(state)
    });

    if (selectedSect) {
        const element = elementPresentation(selectedSect.element, manager);
        embed.addFields({
            name: `${selectedSect.joined ? '✅' : '📜'} ${selectedSect.name}`,
            value: [
                `**Truyền thừa:** ${element.label}`,
                selectedEffects.join('\n') || '• Không có nội tại'
            ].join('\n').slice(0, 1024)
        });
    }

    if (selectedRule && currentSect) {
        const unavailable = selectedRule.available
            ? '✅ Có thể đổi'
            : `🔒 ${UNAVAILABLE_LABELS[selectedRule.unavailableReason]
                || selectedRule.unavailableReason}`;
        embed.addFields({
            name: '🎁 Đổi bí tịch',
            value: [
                `**${CATEGORY_LABELS[selectedRule.category] || selectedRule.category} · ${GRADE_LABELS[selectedRule.grade] || selectedRule.grade}**`,
                selectedRule.rewardItem?.name ? `**Bí kíp:** ${selectedRule.rewardItem.name}` : null,
                selectedRule.rewardItem?.elementLabel ? `**Hệ:** ${selectedRule.rewardItem.elementLabel}` : null,
                selectedRule.rewardItem?.cultivationBonus != null
                    ? `**Tốc độ tu luyện khi tương hợp:** +${formatPercent(Number(selectedRule.rewardItem.cultivationBonus) * 100)}`
                    : null,
                Number(selectedRule.rewardItem?.cooldownTurns) > 0
                    ? `**Hồi chiêu:** ${selectedRule.rewardItem.cooldownTurns} lượt` : null,
                selectedRule.rewardItem?.description || null,
                `Yêu cầu: \`${selectedRule.requiredRealm}\``,
                `Chi phí: **${formatIntegerAmount(selectedRule.cost.amount)} Điểm Tông Môn**`,
                unavailable,
                'Mỗi bí kíp là độc truyền cố định; không thể đổi trùng khi đã học hoặc đang sở hữu.'
            ].filter(Boolean).join('\n')
        });
    }

    embed.setFooter({
        text: `Rời Tông giữ nguyên Điểm Tông Môn nhưng phải chờ ${formatDuration(
            policy.leaveCooldownSeconds
        )} mới được gia nhập lại.`
    });

    return {
        embeds: [embed],
        attachments: [],
        files: emblem ? [emblem.file] : [],
        components: createComponents({
            state,
            selectedSectId: selectedSect?.id,
            selectedRuleId: selectedRule?.id,
            sessionId,
            pendingAction,
            disabled
        })
    };
}
