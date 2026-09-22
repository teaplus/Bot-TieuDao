import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import {
    createEquipmentIconAttachment,
    createEquipmentTemplateIconAttachment
} from '../../application/discord/UiAssetResolver.js';
import {
    getEquipmentTypeEmoji,
    resolveEquipmentComponentEmoji,
    resolveEquipmentEmoji
} from '../../application/discord/EquipmentEmojiResolver.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { compareBattleFixed } from '../../battle/numeric/BattleFixed.js';

const PRIMARY_STATS = Object.freeze([
    ['hp', 'HP'],
    ['atk', 'ATK'],
    ['def', 'DEF'],
    ['spd', 'SPD']
]);

const SECONDARY_STATS = Object.freeze([
    ['critRate', 'Chí mạng'],
    ['critDamage', 'ST chí mạng'],
    ['pen', 'Xuyên giáp'],
    ['skillDamage', 'ST kỹ năng'],
    ['lifesteal', 'Hút máu'],
    ['shieldPower', 'Hiệu quả khiên'],
    ['regen', 'Hồi phục'],
    ['controlRate', 'Khống chế'],
    ['controlResist', 'Kháng khống chế'],
    ['reflect', 'Phản đòn']
]);

const EMPTY_SLOT_PREFIX = 'EMPTY_';

function getEquipmentType(item) {
    return String(item.equipmentType || item.slot || item.equippedSlot || '').toUpperCase();
}

function formatFixed(value, suffix = '') {
    const normalized = String(value ?? '0');
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const localizedWhole = BigInt(whole || '0').toLocaleString('vi-VN');
    const trimmedFraction = fraction.slice(0, 2).replace(/0+$/, '');
    return `${negative ? '-' : ''}${localizedWhole}${trimmedFraction ? `,${trimmedFraction}` : ''}${suffix}`;
}

function formatDelta(change, { percentagePoint = false } = {}) {
    const suffix = percentagePoint ? '%' : '';
    const absolute = formatFixed(change.delta, suffix);
    const sign = compareBattleFixed(change.delta, 0) > 0 ? '+' : '';
    if (percentagePoint || change.percentDelta == null || compareBattleFixed(change.delta, 0) === 0) {
        return `${sign}${absolute}`;
    }
    const percentSign = compareBattleFixed(change.percentDelta, 0) > 0 ? '+' : '';
    return `${sign}${absolute} (${percentSign}${formatFixed(change.percentDelta, '%')})`;
}

function renderPrimaryStatTable(preview, panel) {
    const changes = preview?.statChanges;
    return PRIMARY_STATS.map(([stat, label]) => {
        const current = changes?.[stat]?.current ?? panel.currentStats[stat];
        const projected = changes?.[stat]?.projected ?? current;
        const delta = changes?.[stat]
            ? formatDelta(changes[stat])
            : '—';
        return `${label.padEnd(4)} ${formatFixed(current)} → ${formatFixed(projected)}  ${delta}`;
    }).join('\n');
}

function renderSecondaryChanges(preview) {
    if (!preview) return 'Chọn một trang bị để xem thay đổi chỉ số phụ.';
    const changed = SECONDARY_STATS
        .filter(([stat]) => compareBattleFixed(preview.statChanges[stat].delta, 0) !== 0)
        .map(([stat, label]) => {
            const change = preview.statChanges[stat];
            return `• ${label}: ${formatFixed(change.current, '%')} → ${formatFixed(change.projected, '%')} (**${formatDelta(change, { percentagePoint: true })}**)`;
        });
    return changed.join('\n') || 'Không thay đổi chỉ số phụ.';
}

function getConfiguredTypes(client) {
    return Object.values(client.gameDataManager?.getCollection('equipmentTypes') || {});
}

function describeItem(item) {
    const effects = item.getEffects().map((effect) => EffectFormatter.format(effect)).join(' • ');
    return (effects || 'Không có hiệu ứng').slice(0, 100);
}

function createTypeSelectRow({ type, panel, preview, sessionId, disabled }) {
    const items = panel.equipments.filter((item) => getEquipmentType(item) === type.id);
    const current = items.find((item) => item.isEquipped);
    const pendingSelection = preview?.selections?.find(
        (selection) => selection.equipmentType === type.id
    );
    const selectedId = pendingSelection
        ? (pendingSelection.unequip ? `${EMPTY_SLOT_PREFIX}${type.id}` : pendingSelection.inventoryId)
        : (current?.uuid || `${EMPTY_SLOT_PREFIX}${type.id}`);
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`trangbi:${sessionId}:select:${type.id}`)
        .setPlaceholder(`${type.name}: ${current?.name || 'Trống'}`)
        .setDisabled(disabled || items.length === 0);

    menu.addOptions({
        emoji: getEquipmentTypeEmoji(type.id),
        label: current ? `— Tháo ${type.name} —` : `— ${type.name} để trống —`,
        value: `${EMPTY_SLOT_PREFIX}${type.id}`,
        description: current
            ? `Tháo ${current.name} khỏi ô ${type.name}.`
            : `Không trang bị vật phẩm ở ô ${type.name}.`,
        default: selectedId === `${EMPTY_SLOT_PREFIX}${type.id}`
    });
    if (items.length) {
        menu.addOptions(items.slice(0, 24).map((item) => ({
            emoji: resolveEquipmentComponentEmoji({
                itemId: item.id,
                equipmentType: getEquipmentType(item)
            }),
            label: `${item.isEquipped ? '✓ ' : ''}${item.name} [${item.rarityInfo.name}]`.slice(0, 100),
            value: String(item.uuid).slice(0, 100),
            description: describeItem(item),
            default: String(item.uuid) === String(selectedId)
        })));
    }
    return new ActionRowBuilder().addComponents(menu);
}

function createComponents({ types, panel, preview, sessionId, disabled = false }) {
    const rows = types.map((type) => createTypeSelectRow({
        type,
        panel,
        preview,
        sessionId,
        disabled
    }));
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`trangbi:${sessionId}:confirm`)
            .setLabel('Trang bị đã chọn')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || !preview?.hasChanges || preview.applied),
        new ButtonBuilder()
            .setCustomId(`trangbi:${sessionId}:close`)
            .setLabel('Đóng')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));
    return rows;
}

function renderCurrentEffects(panel) {
    const effects = panel.player.effects
        .filter((effect) => effect.stat !== 'cultivation_speed' || Number(effect.value) !== 1)
        .map((effect) => `• ${EffectFormatter.format(effect)}`);
    return effects.join('\n').slice(0, 1024) || 'Không có hiệu ứng cộng thêm.';
}

function getHighlightedEquipment(panel, preview) {
    const selected = [...(preview?.selections || [])]
        .reverse()
        .find((selection) => selection.selectedItem)?.selectedItem;
    return selected
        || panel.equipments.find((item) => item.isEquipped && getEquipmentType(item) === 'WEAPON')
        || panel.equipments.find((item) => item.isEquipped)
        || panel.equipments[0]
        || null;
}

export function renderPanel({ interaction, panel, preview, types, sessionId, notice = null, disabled = false }) {
    const equippedLines = types.map((type) => {
        const item = panel.equipments.find(
            (entry) => entry.isEquipped && getEquipmentType(entry) === type.id
        );
        const icon = item
            ? resolveEquipmentEmoji({ itemId: item.id, equipmentType: type.id })
            : getEquipmentTypeEmoji(type.id);
        return `${icon} **${type.name}:** ${item ? `${item.name} [${item.rarityInfo.name}]` : '— Trống —'}`;
    });
    const highlightedEquipment = getHighlightedEquipment(panel, preview);
    const iconOptions = highlightedEquipment ? {
        itemId: highlightedEquipment.id,
        equipmentType: getEquipmentType(highlightedEquipment),
        grade: highlightedEquipment.grade || 'HOANG',
        quality: highlightedEquipment.gradeQuality || 'LOW'
    } : null;
    const iconAttachment = iconOptions
        ? createEquipmentTemplateIconAttachment(iconOptions)
            || createEquipmentIconAttachment(iconOptions)
        : null;
    const embed = new EmbedBuilder()
        .setTitle(`Trang bị · ${panel.player.name}`)
        .setColor(preview ? '#D4A72C' : '#5865F2')
        .setDescription([
            notice,
            'Có thể chọn đồng thời ở nhiều ô. Bảng chỉ số sẽ cộng toàn bộ lựa chọn và chỉ cập nhật thật sau khi bấm **Trang bị đã chọn**.',
            ...equippedLines
        ].filter(Boolean).join('\n'))
        .addFields(
            {
                name: preview?.applied ? 'So sánh chỉ số vừa áp dụng' : 'Chỉ số chiến đấu dự kiến',
                value: `\`\`\`text\n${renderPrimaryStatTable(preview, panel)}\n\`\`\``
            },
            {
                name: 'Hiệu ứng chỉ số hiện tại',
                value: renderCurrentEffects(panel)
            }
        );
    embed.setThumbnail(iconAttachment?.asset.imageUrl || interaction.user.displayAvatarURL());

    if (preview) {
        const selectedLines = preview.selections.map((selection) => {
            const type = types.find((entry) => entry.id === selection.equipmentType);
            if (selection.unequip) {
                return `${getEquipmentTypeEmoji(selection.equipmentType)} **${type?.name || selection.equipmentType}:** — Để trống —${
                    selection.replacedItem ? ` · tháo ${selection.replacedItem.name}` : ''
                }`;
            }
            const replacement = selection.replacedItem
                ? ` → thay ${selection.replacedItem.name}`
                : '';
            const status = selection.alreadyEquipped ? ' · đang dùng' : '';
            const icon = resolveEquipmentEmoji({
                itemId: selection.selectedItem.id,
                equipmentType: selection.equipmentType
            });
            return `${icon} **${type?.name || selection.equipmentType}:** ${selection.selectedItem.name} [${selection.selectedItem.rarityInfo.name}]${replacement}${status}`;
        });
        const selectedEffects = preview.selections.flatMap((selection) => {
            const type = types.find((entry) => entry.id === selection.equipmentType);
            return [
                `${resolveEquipmentEmoji({
                    itemId: selection.selectedItem?.id,
                    equipmentType: selection.equipmentType
                })} **${type?.name || selection.equipmentType} · ${
                    selection.selectedItem?.name || 'Để trống'
                }**`,
                selection.selectedItem?.getEffectsDisplay() || 'Không có hiệu ứng.'
            ];
        });
        embed.addFields(
            {
                name: preview.applied ? 'Bộ trang bị vừa áp dụng · ✅' : 'Bộ trang bị đang chọn',
                value: selectedLines.join('\n').slice(0, 1024)
            },
            {
                name: 'Thuộc tính & hiệu ứng trang bị',
                value: selectedEffects.join('\n').slice(0, 1024)
            },
            {
                name: 'Chỉ số phụ thay đổi',
                value: renderSecondaryChanges(preview).slice(0, 1024)
            }
        );
    } else {
        embed.addFields({
            name: 'Preview',
            value: 'Chưa chọn trang bị.'
        });
    }

    return {
        embeds: [embed],
        components: createComponents({ types, panel, preview, sessionId, disabled }),
        attachments: [],
        files: iconAttachment ? [iconAttachment.file] : []
    };
}

export default class EquipCommand extends BaseCommand {
    constructor() {
        super({ name: 'trangbi', description: 'Quản lý và xem trước trang bị nhân vật' });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let panel = await client.equipmentService.getEquipmentPanelView(interaction.user.id);
            if (!panel) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');

            const types = getConfiguredTypes(client);
            if (types.length !== 4) {
                throw new Error('EQUIPMENT_PANEL_REQUIRES_FOUR_TYPES');
            }

            const sessionId = interaction.id;
            let preview = null;
            const selectedByType = new Map();
            let notice = null;
            const message = await interaction.editReply(renderPanel({
                interaction,
                panel,
                preview,
                types,
                sessionId
            }));

            await ComponentSession.forMessage({
                interaction,
                message,
                prefix: `trangbi:${sessionId}:`
            }).run({
                onCollect: async (selected) => {
                    const action = selected.customId.split(':')[2];
                    if (action === 'close') {
                        await selected.update(renderPanel({
                            interaction,
                            panel,
                            preview,
                            types,
                            sessionId,
                            notice: 'Đã đóng bảng trang bị.',
                            disabled: true
                        }));
                        return false;
                    }

                    await selected.deferUpdate();
                    try {
                        if (action === 'select') {
                            const equipmentType = selected.customId.split(':')[3];
                            selectedByType.set(equipmentType, selected.values[0]);
                            const inventoryIds = [...selectedByType.values()].filter(
                                (value) => !value.startsWith(EMPTY_SLOT_PREFIX)
                            );
                            const unequipTypes = [...selectedByType.entries()]
                                .filter(([, value]) => value.startsWith(EMPTY_SLOT_PREFIX))
                                .map(([type]) => type);
                            preview = await client.equipmentService.previewEquipmentLoadout(
                                interaction.user.id,
                                inventoryIds,
                                unequipTypes
                            );
                            notice = preview.hasChanges
                                ? `Đã chọn **${preview.selections.length}/4** ô trang bị.`
                                : 'Các món đã chọn đều đang được trang bị.';
                        }
                        if (action === 'confirm' && preview?.hasChanges && !preview.applied) {
                            const inventoryIds = [...selectedByType.values()].filter(
                                (value) => !value.startsWith(EMPTY_SLOT_PREFIX)
                            );
                            const unequipTypes = [...selectedByType.entries()]
                                .filter(([, value]) => value.startsWith(EMPTY_SLOT_PREFIX))
                                .map(([type]) => type);
                            const result = await client.equipmentService.equipLoadout(
                                interaction.user.id,
                                inventoryIds,
                                unequipTypes
                            );
                            const changedItems = result.equippedItems.filter(
                                (item) => !item.alreadyEquipped
                            );
                            const equippedNames = changedItems
                                .filter((item) => !item.unequipped)
                                .map((item) => item.name);
                            const unequippedNames = changedItems
                                .filter((item) => item.unequipped)
                                .map((item) => item.name);
                            notice = [
                                equippedNames.length
                                    ? `✅ Đã trang bị: **${equippedNames.join(', ')}**.`
                                    : null,
                                unequippedNames.length
                                    ? `↩️ Đã tháo: **${unequippedNames.join(', ')}**.`
                                    : null
                            ].filter(Boolean).join('\n');
                            panel = await client.equipmentService.getEquipmentPanelView(interaction.user.id);
                            preview = {
                                ...preview,
                                hasChanges: false,
                                applied: true
                            };
                        }
                    } catch (error) {
                        client.logger?.error('Equipment panel action failed', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                        notice = error?.code === 'EQUIPMENT_REALM_LOCKED'
                            ? `🔒 Cần đạt **${error.requiredRealmName}** mới có thể trang bị pháp bảo này.`
                            : 'Không thể cập nhật preview/trang bị. Dữ liệu có thể vừa thay đổi, hãy mở lại bảng.';
                        preview = null;
                        panel = await client.equipmentService.getEquipmentPanelView(interaction.user.id) || panel;
                    }

                    await interaction.editReply(renderPanel({
                        interaction,
                        panel,
                        preview,
                        types,
                        sessionId,
                        notice
                    }));
                    return true;
                },
                onTimeout: async () => {
                    await interaction.editReply(renderPanel({
                        interaction,
                        panel,
                        preview,
                        types,
                        sessionId,
                        notice: 'Bảng trang bị đã hết hạn. Dùng lại `/trangbi` để tiếp tục.',
                        disabled: true
                    }));
                }
            });
        } catch (error) {
            client.logger?.error('Trangbi command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            const message = error.message === 'EQUIPMENT_PANEL_REQUIRES_FOUR_TYPES'
                ? 'Cấu hình trang bị hiện không có đúng 4 loại. Hãy kiểm tra GameData.'
                : 'Không thể mở bảng trang bị lúc này.';
            return interaction.editReply({ content: message, embeds: [], components: [] });
        }
    }
}
