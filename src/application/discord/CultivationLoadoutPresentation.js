import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import {
    resolveBattleSemanticComponentEmoji,
    resolveBattleSemanticEmoji
} from './BattleSemanticEmojiResolver.js';

const MAX_SELECT_OPTIONS = 25;
const MAX_LIST_ENTRIES = 8;

function truncate(value, maximum) {
    const text = String(value || '');
    return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function effectText(effects = []) {
    const lines = effects.map((effect) => EffectFormatter.format(effect));
    return lines.length ? lines.join(' · ') : 'Không có hiệu ứng.';
}

function skillEffects(skill) {
    return typeof skill?.getEffects === 'function' ? skill.getEffects() : (skill?.effects || []);
}

function localizedMeta(entry) {
    return [entry?.elementLabel, entry?.gradeLabel || entry?.rarityInfo?.name || entry?.rarity]
        .filter(Boolean)
        .join(' · ');
}

function artAffinityText(art) {
    if (!art) return '';
    const total = Number(art.cultivationBonus || 0) * 100;
    if (art.element === 'NEUTRAL') {
        return `Vô hệ ổn định · Tốc độ tu luyện +${total}%`;
    }
    if (art.affinityMatched) {
        return `✅ Tương hợp Linh Căn · Tốc độ tu luyện +${total}%`;
    }
    return `⚠️ Không tương hợp Linh Căn · +0%`
        + `${Number(art.affinityPotentialBonus || 0) > 0
            ? ` (tương hợp: +${Number(art.affinityPotentialBonus) * 100}%)`
            : ''}`;
}

function summarizeList(entries, formatter, emptyText) {
    if (!entries.length) return emptyText;
    const visible = entries.slice(0, MAX_LIST_ENTRIES).map(formatter);
    if (entries.length > visible.length) {
        visible.push(`… và **${entries.length - visible.length}** mục khác.`);
    }
    return visible.join('\n').slice(0, 1024);
}

function selectRow({
    customId,
    placeholder,
    options,
    disabled,
    minimumValues = 1,
    maximumValues = 1
}) {
    if (!options.length) return null;
    const visibleOptions = options.slice(0, MAX_SELECT_OPTIONS);
    const select = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .setDisabled(disabled)
        .setMinValues(minimumValues)
        .setMaxValues(Math.min(maximumValues, visibleOptions.length))
        .addOptions(visibleOptions);
    return new ActionRowBuilder().addComponents(select);
}

function bookOption(book, description) {
    return {
        label: truncate(`${book.label || book.name} [${localizedMeta(book) || 'Phàm'}]`, 100),
        value: truncate(book.uuid, 100),
        description: truncate(description || book.description || 'Bí kíp tu tiên', 100),
        emoji: resolveBattleSemanticComponentEmoji(book.skill || book)
    };
}

export async function loadCultivationLoadoutState(client, playerId) {
    const [artState, skillState] = await Promise.all([
        client.cultivationArtService.listLearnableCultivationArts(playerId),
        client.skillService.listLearnableSkills(playerId)
    ]);
    if (!artState || !skillState) return null;
    return Object.freeze({
        learnedArts: Object.freeze([...(artState.learnedArts || [])]),
        artBooks: Object.freeze([...(artState.books || [])]),
        learnedSkills: Object.freeze([...(skillState.learnedSkills || [])]),
        skillBooks: Object.freeze([...(skillState.books || [])]),
        skillLoadout: Object.freeze({
            ...(skillState.loadout || {}),
            equippedSkillIds: Object.freeze([
                ...(skillState.loadout?.equippedSkillIds || [])
            ])
        })
    });
}

export function getSkillLoadoutPage(state, requestedPage = 0) {
    const equipped = state.learnedSkills
        .filter((skill) => skill.isEquipped)
        .sort((left, right) => left.equippedSlot - right.equippedSlot);
    const unequipped = state.learnedSkills.filter((skill) => !skill.isEquipped);
    const pageSize = Math.max(1, MAX_SELECT_OPTIONS - equipped.length);
    const pageCount = Math.max(1, Math.ceil(unequipped.length / pageSize));
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, pageCount - 1));
    return Object.freeze({
        page,
        pageCount,
        entries: Object.freeze([
            ...equipped,
            ...unequipped.slice(page * pageSize, (page + 1) * pageSize)
        ])
    });
}

export function createCultivationLoadoutPayload({
    state,
    sessionId,
    notice = null,
    disabled = false,
    skillPage = 0
}) {
    const activeArt = state.learnedArts.find((art) => art.active) || null;
    const otherArts = state.learnedArts.filter((art) => !art.active);
    const equippedSkills = state.learnedSkills
        .filter((skill) => skill.isEquipped)
        .sort((left, right) => left.equippedSlot - right.equippedSlot);
    const equippedActiveCount = equippedSkills
        .filter((skill) => skill.type === 'ACTIVE').length;
    const equippedPassiveCount = equippedSkills.length - equippedActiveCount;
    const loadoutPage = getSkillLoadoutPage(state, skillPage);

    const embed = new EmbedBuilder()
        .setTitle('📜 Công Pháp & Kỹ Năng')
        .setColor('#2E8B57')
        .setDescription([
            notice,
            'Công Pháp tu luyện và Kỹ Năng được quản lý bằng hai thanh chọn riêng.'
        ].filter(Boolean).join('\n\n'))
        .addFields(
            {
                name: '🧘 Công Pháp đang vận hành',
                value: activeArt
                    ? `**${activeArt.label || activeArt.name}** [${localizedMeta(activeArt)}]`
                        + `\n${artAffinityText(activeArt)}\n${effectText(activeArt.effects)}`
                    : 'Chưa có Công Pháp đang vận hành.'
            },
            {
                name: `📚 Công Pháp đã lĩnh ngộ (${state.learnedArts.length})`,
                value: summarizeList(
                    state.learnedArts,
                    (art) => `${art.active ? '◆' : '◇'} **${art.label || art.name}** [${localizedMeta(art)}]`
                        + ` · ${artAffinityText(art)}`,
                    'Chưa lĩnh ngộ Công Pháp nào.'
                )
            },
            {
                name: `✨ Kỹ Năng đã lĩnh ngộ (${state.learnedSkills.length})`,
                value: summarizeList(
                    state.learnedSkills,
                    (skill) => (
                        `${resolveBattleSemanticEmoji(skill)} ${skill.isEquipped ? `✅ Ô ${skill.equippedSlot}` : '◇ Chưa dùng'}`
                        + ` · ${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'}`
                        + ` — **${skill.label || skill.name}** [${localizedMeta(skill)}]\n${truncate(effectText(skillEffects(skill)), 180)}`
                    ),
                    'Chưa lĩnh ngộ Kỹ Năng nào.'
                )
            },
            {
                name: `⚔️ Kỹ Năng đang trang bị (${equippedSkills.length}/${state.skillLoadout.capacity})`,
                value: [
                    `Chủ động: **${equippedActiveCount}/${state.skillLoadout.maxActiveSkills}**`
                        + ` · Bị động: **${equippedPassiveCount}**`,
                    equippedSkills.length
                        ? equippedSkills.map((skill) => (
                            `${resolveBattleSemanticEmoji(skill)} **Ô ${skill.equippedSlot}:** ${skill.label || skill.name}`
                            + ` [${localizedMeta(skill)}]`
                            + ` · ${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'}`
                        )).join('\n')
                        : 'Chưa trang bị Kỹ Năng nào.',
                    'Kỹ Năng Bị động chỉ cộng Effect khi nằm trong loadout.'
                ].join('\n').slice(0, 1024)
            },
            {
                name: '🎒 Bí kíp có thể lĩnh ngộ',
                value: `Công Pháp: **${state.artBooks.length}** · Kỹ Năng: **${state.skillBooks.length}**`
            }
        );

    const rows = [
        selectRow({
            customId: `congphap:${sessionId}:equip-art`,
            placeholder: '【Công Pháp】Chọn pháp môn muốn vận hành',
            disabled,
            options: otherArts.map((art) => ({
                label: truncate(`${art.label || art.name} [${localizedMeta(art)}]`, 100),
                value: art.id,
                description: truncate(artAffinityText(art), 100)
            }))
        }),
        selectRow({
            customId: `congphap:${sessionId}:equip-skills`,
            placeholder: `【Kỹ Năng】Chọn loadout · trang ${loadoutPage.page + 1}/${loadoutPage.pageCount}`,
            disabled,
            minimumValues: 0,
            maximumValues: state.skillLoadout.capacity,
            options: loadoutPage.entries.map((skill) => ({
                label: truncate(
                    `${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'} · ${skill.label || skill.name}`,
                    100
                ),
                value: skill.id,
                description: truncate(`${localizedMeta(skill)} · ${effectText(skillEffects(skill))}`, 100),
                default: skill.isEquipped,
                emoji: resolveBattleSemanticComponentEmoji(skill)
            }))
        }),
        selectRow({
            customId: `congphap:${sessionId}:learn-art`,
            placeholder: '【Công Pháp】Lĩnh ngộ bí kíp trong túi',
            disabled,
            options: state.artBooks.map((book) => bookOption(book, book.description))
        }),
        selectRow({
            customId: `congphap:${sessionId}:learn-skill`,
            placeholder: '【Kỹ Năng】Lĩnh ngộ bí kíp trong túi',
            disabled,
            options: state.skillBooks.map((book) => bookOption(
                book,
                `${book.skill?.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'} · ${book.description || ''}`
            ))
        }),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`congphap:${sessionId}:skill-prev`)
                .setLabel('Trang Kỹ Năng trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || loadoutPage.page <= 0),
            new ButtonBuilder()
                .setCustomId(`congphap:${sessionId}:skill-next`)
                .setLabel('Trang Kỹ Năng sau')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || loadoutPage.page >= loadoutPage.pageCount - 1),
            new ButtonBuilder()
                .setCustomId(`congphap:${sessionId}:close`)
                .setLabel('Đóng')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
        )
    ].filter(Boolean);

    return { embeds: [embed], components: rows };
}
