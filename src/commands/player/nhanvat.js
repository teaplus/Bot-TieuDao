import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SlashCommandBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import {
    createMapArtAttachment,
    createUiAssetAttachment
} from '../../application/discord/UiAssetResolver.js';
import {
    UI_COLORS,
    bulletList,
    createUiEmbed,
    disableComponentRows,
    formatDuration,
    progressBar,
    truncateText
} from '../../application/discord/DiscordUiTheme.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { compareDecimal, displayDecimal, subtractDecimal } from '../../shared/numeric/FixedDecimal.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

// --- BỘ ICON DÀNH CHO GIAO DIỆN ---
const UI_ICONS = Object.freeze({
    HP: '❤️',
    ATK: '⚔️',
    DEF: '🛡️',
    SPD: '💨',
    SPIRIT_STONE: '💎',
    CULTIVATION: '✨',
    ROOT: '🌱',
    BOOK: '📜',
    REBIRTH: '🌀',
    TIME: '⏳',
    MAP: '🗺️',
    LOCKED: '🔒',
    UNLOCKED: '🔓',
    SUCCESS: '✅',
    WARNING: '⚠️',
    SWORD: '🗡️',
    BAG: '🎒',
    SKILL: '🔮'
});

export const DASHBOARD_TABS = Object.freeze({
    OVERVIEW: 'overview',
    CULTIVATION: 'cultivation',
    EQUIPMENT: 'equipment',
    JOURNEY: 'journey',
    COLLECTION: 'collection'
});

// Thêm thuộc tính emoji vào các Tab
const TAB_CONFIG = Object.freeze([
    { id: DASHBOARD_TABS.OVERVIEW, label: 'Tổng quan', emoji: '📊', color: UI_COLORS.PRIMARY },
    { id: DASHBOARD_TABS.CULTIVATION, label: 'Tu luyện', emoji: '🧘‍♂️', color: UI_COLORS.CULTIVATION },
    { id: DASHBOARD_TABS.EQUIPMENT, label: 'Trang bị', emoji: '👘', color: UI_COLORS.EQUIPMENT },
    { id: DASHBOARD_TABS.JOURNEY, label: 'Hành trình', emoji: '🧭', color: UI_COLORS.JOURNEY },
    { id: DASHBOARD_TABS.COLLECTION, label: 'Kho đồ', emoji: '📦', color: UI_COLORS.COLLECTION }
]);

function formatEffects(effects) {
    return bulletList(
        (effects || [])
            .filter((effect) => effect.stat !== 'cultivation_speed' || effect.value !== 1)
            .map((effect) => EffectFormatter.format(effect)),
        'Không có hiệu ứng cộng thêm.'
    );
}

function formatCultivationEffects(effects) {
    return bulletList(
        (effects || [])
            .filter((effect) => effect.stat === 'cultivation_speed')
            .map((effect) => EffectFormatter.format(effect)),
        'Không có hiệu ứng tăng tốc tu luyện.'
    );
}

function formatOverviewBonuses(state) {
    const standardEffects = formatEffects(state.attributeBonuses);
    const affinityEffects = (state.spiritRootEffects || [])
        .filter((effect) => effect.scope === 'ACTION')
        .map((effect) => `• **Linh Căn:** ${EffectFormatter.format(effect)}`);
    return [standardEffects, ...affinityEffects].join('\n');
}

function getCultivationDisplay(state) {
    const required = state.player.realmInfo.req_cul;
    const persisted = state.cultivationPreview.persistedCultivation ?? state.player.cultivation;
    const projected = state.cultivationPreview.projectedCultivation ?? state.player.cultivation;
    const missing = compareDecimal(projected, required) >= 0
        ? '0'
        : subtractDecimal(required, projected);
    return {
        required,
        persisted,
        projected,
        missing,
        ready: compareDecimal(projected, required) >= 0
    };
}

function createTabRows(sessionId, activeTab, expired = false) {
    const row = new ActionRowBuilder().addComponents(...TAB_CONFIG.map((tab) => {
        const btn = new ButtonBuilder()
            .setCustomId(`nhanvat:${sessionId}:${tab.id}`)
            .setLabel(tab.label)
            .setEmoji(tab.emoji) // Thêm Emoji vào Button
            .setStyle(tab.id === activeTab ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(expired || tab.id === activeTab);
        return btn;
    }));
    return expired ? disableComponentRows([row]) : [row];
}

function createBaseEmbed(state, activeTab, interaction, expired) {
    const tab = TAB_CONFIG.find((entry) => entry.id === activeTab) || TAB_CONFIG[0];
    return createUiEmbed({
        title: `${tab.emoji} Đạo lộ của ${state.player.name}`,
        color: tab.color,
        user: interaction.user,
        footer: expired
            ? '⏳ Phiên giao diện đã hết hạn • Dùng /nhanvat để mở lại'
            : `${tab.label} • Dùng các slash command hiện hữu làm lối tắt`
    });
}

function renderOverview(state, interaction, expired) {
    const { player, cultivationPreview, location } = state;
    const cultivation = getCultivationDisplay(state);
    const mapName = location?.current?.displayName || 'Chưa xác định';
    const breakthroughStatus = cultivation.ready
        ? `${UI_ICONS.SUCCESS} Đã đủ tu vi — có thể thử đột phá`
        : `${UI_ICONS.WARNING} Còn thiếu ${displayDecimal(cultivation.missing)} tu vi`;
        
    return createBaseEmbed(state, DASHBOARD_TABS.OVERVIEW, interaction, expired)
        .setDescription(`**${player.realmInfo.name} — Tầng ${player.realmStage}**\n${UI_ICONS.MAP} Vị trí: ${mapName}`)
        .addFields(
            {
                name: '⛩️ Đạo cơ',
                value: [
                    `${UI_ICONS.ROOT} Linh căn: **${player.spiritualRoot}**${player.spiritRootQualityInfo ? ` — ${player.spiritRootQualityInfo.displayName}` : ''}`,
                    `${UI_ICONS.BOOK} Công pháp: **${player.cultivationArt.name}**`,
                    `${UI_ICONS.REBIRTH} Luân hồi: **${formatIntegerAmount(player.rebirthCount)} lần**`
                ].join('\n') // Dùng \n vì có không gian rộng rồi
                // ĐÃ XÓA inline: true ở đây
            },
            {
                name: '💰 Tài nguyên',
                value: [
                    `${UI_ICONS.SPIRIT_STONE} Linh Thạch: **${formatIntegerAmount(player.spiritStones)}**`,
                    `${UI_ICONS.CULTIVATION} Tu vi dự kiến: **${displayDecimal(cultivation.projected)}**`,
                    `${UI_ICONS.TIME} Chờ nhận: **+${displayDecimal(cultivationPreview.earned)}**`
                ].join('\n')
                // ĐÃ XÓA inline: true ở đây
            },
            {
                name: '⚔️ Chiến lực',
                value: [
                    `${UI_ICONS.HP} Sinh Mệnh: **${player.getFinalStat('hp')}**`,
                    `${UI_ICONS.ATK} Công Kích: **${player.getFinalStat('atk')}**`,
                    `${UI_ICONS.DEF} Phòng Thủ: **${player.getFinalStat('def')}**`,
                    `${UI_ICONS.SPD} Tốc Độ: **${player.getFinalStat('spd')}**`
                ].join('\n')
                // ĐÃ XÓA inline: true ở đây
            },
            {
                name: '✨ Thuộc tính cộng thêm',
                value: formatOverviewBonuses(state)
            },
            {
                name: '📈 Trạng thái tu luyện',
                value: `${progressBar(player.getCultivationProgress())}\n${breakthroughStatus}`
            },
            {
                name: '🚀 Tiếp tục đạo lộ',
                value: '`/tuvi` bế quan & nhận tu vi • `/thamhiem` chiến đấu • `/chuyenmap` di chuyển'
            }
        );
}

function renderCultivation(state, interaction, expired) {
    const { player, cultivationPreview } = state;
    const cultivation = getCultivationDisplay(state);
    const successRate = player.isAtMaxStage()
        ? player.realmInfo?.success_rate ?? 0
        : 100;
    const breakthroughText = cultivation.ready
        ? `${UI_ICONS.SUCCESS} **Sẵn sàng** • Tỷ lệ thành công ${successRate}%`
        : `${UI_ICONS.WARNING} Chưa đủ • Cần thêm **${displayDecimal(cultivation.missing)} tu vi**`;
    const overflow = compareDecimal(cultivationPreview.overflowEffectiveGain || 0, 0) > 0
        ? `\n${UI_ICONS.WARNING} Vượt ngưỡng hiệu suất: **+${displayDecimal(cultivationPreview.overflowEffectiveGain)}**`
        : '';
        
    return createBaseEmbed(state, DASHBOARD_TABS.CULTIVATION, interaction, expired)
        .setDescription(`🧘‍♂️ Đã bế quan **${formatDuration(cultivationPreview.seconds)}**\n*(Dữ liệu bên dưới là preview, chưa ghi database)*`)
        .addFields(
            {
                name: '📈 Tiến độ sau khi nhận',
                value: `${displayDecimal(cultivation.projected)} / ${displayDecimal(cultivation.required)}\n${progressBar(player.getCultivationProgress())}`
            },
            {
                name: '💾 Tu vi đã lưu',
                value: `**${displayDecimal(cultivation.persisted)}**`,
                inline: true
            },
            {
                name: '⏳ Đang chờ nhận',
                value: `**+${displayDecimal(cultivationPreview.earned)}**`,
                inline: true
            },
            {
                name: '⚡ Tốc độ hấp thụ',
                value: `**${displayDecimal(cultivationPreview.gainPerMinute ?? player.cultivationSpeed)} / phút**`,
                inline: true
            },
            {
                name: '🌌 Linh khí lần này',
                value: `Toàn hiệu suất: **+${displayDecimal(cultivationPreview.fullEfficiencyGain || 0)}**${overflow}`
            },
            { name: '🚀 Đột phá', value: breakthroughText },
            {
                name: '📖 Công pháp vận hành',
                value: `**${player.cultivationArt.name}** [${player.cultivationArt.rarityInfo.name}]\n${formatCultivationEffects(player.effects)}`
            },
            { name: '🔧 Thao tác', value: '`/tuvi` nhận tu vi hoặc đột phá • `/congphap` đổi công pháp' }
        );
}

function renderEquipment(state, interaction, expired) {
    const { player } = state;
    const equipped = player.equipments.filter((item) => item.isEquipped);
    
    return createBaseEmbed(state, DASHBOARD_TABS.EQUIPMENT, interaction, expired)
        .setDescription('🎒 Loadout hiện tại. Mỗi loại trang bị chỉ có tối đa một món đang sử dụng.')
        .addFields(
            {
                name: '🗡️ Trang bị đang dùng',
                value: bulletList(equipped.map((item) => (
                    `**${item.equippedSlot}** — ${item.name} [${item.rarityInfo.name}]\n${truncateText(item.getEffectsDisplay(), 220)}`
                )), 'Chưa trang bị pháp bảo nào.', 4096)
            },
            {
                name: '📊 Chỉ số tổng',
                value: `${UI_ICONS.HP} **${player.getFinalStat('hp')}** • ${UI_ICONS.ATK} **${player.getFinalStat('atk')}** • ${UI_ICONS.DEF} **${player.getFinalStat('def')}** • ${UI_ICONS.SPD} **${player.getFinalStat('spd')}**`
            },
            { name: '✨ Tổng hiệu ứng hiện tại', value: formatEffects(player.effects) },
            { name: '🔧 Lối tắt', value: '`/trangbi` xem chi tiết và mặc • `/thaotrangbi` tháo nhanh' }
        );
}

function accessText(entry) {
    if (!entry?.map) return `${UI_ICONS.LOCKED} Không còn khu vực.`;
    if (entry.access?.canEnter) return `${UI_ICONS.UNLOCKED} **${entry.map.displayName}** — Có thể đi`;
    if (entry.access?.reason?.startsWith('MAP_LOCKED:')) return `${UI_ICONS.LOCKED} **${entry.map.displayName}** — Thiếu cảnh giới`;
    if (entry.access?.reason?.startsWith('MAP_NOT_ACTIVE:')) return `${UI_ICONS.TIME} **${entry.map.displayName}** — Sắp mở`;
    return `${UI_ICONS.WARNING} **${entry.map.displayName}** — Chưa thể đi`;
}

function renderJourney(state, interaction, expired) {
    const location = state.location;
    const embed = createBaseEmbed(state, DASHBOARD_TABS.JOURNEY, interaction, expired);
    
    if (!location) {
        return embed
            .setDescription('❌ Chưa thể tải vị trí hiện tại.')
            .addFields({ name: '🔧 Lối tắt', value: '`/chuyenmap` thử tải lại vị trí' });
    }

    const current = location.current;
    return embed
        .setDescription(`🗺️ ${current.description || 'Hành trình tu tiên đang tiếp diễn.'}`)
        .addFields(
            {
                name: '📍 Vị trí hiện tại',
                value: `**${current.displayName}**\nKhu vực ${location.currentRealmName} • Tuyến ${current.navigationOrder}/15`
            },
            { name: '🔻 Hướng thấp hơn', value: accessText(location.lower), inline: true },
            { name: '🔺 Hướng cao hơn', value: accessText(location.higher), inline: true },
            {
                name: '⚔️ Hoạt động khả dụng',
                value: bulletList((current.activityTypes || []).map((type) => (
                    type === 'EXPLORATION' ? 'Thám hiểm' : type
                )), 'Khu vực này chưa mở hoạt động.')
            },
            { name: '🔧 Lối tắt', value: '`/chuyenmap` di chuyển • `/thamhiem` chiến đấu • `/biccanh` vào Bí Cảnh' }
        );
}

function renderCollection(state, interaction, expired) {
    const items = state.inventoryItems || [];
    const equipmentCount = items.filter((item) => item.type === 'EQUIPMENT').length;
    const stackCount = items.filter((item) => item.type !== 'EQUIPMENT').length;
    
    return createBaseEmbed(state, DASHBOARD_TABS.COLLECTION, interaction, expired)
        .setDescription('📚 Tổng hợp vật phẩm, kỹ năng và công pháp đã sở hữu.')
        .addFields(
            {
                name: '🎒 Kho đồ',
                value: `${UI_ICONS.SWORD} Trang bị: **${equipmentCount}** loại\n${UI_ICONS.BAG} Xếp chồng: **${stackCount}** loại`,
                inline: true
            },
            {
                name: '🔥 Năng lực',
                value: `${UI_ICONS.SKILL} Kỹ năng: **${state.skills.length}**\n${UI_ICONS.BOOK} Công pháp: **${state.player.cultivationArt.name}**`,
                inline: true
            },
            {
                name: '✨ Kỹ năng đã lĩnh ngộ',
                value: bulletList(state.skills.map((skill) => (
                    `**${skill.name}** — ${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'}`
                )), 'Chưa lĩnh ngộ kỹ năng nào.', 4096)
            },
            { name: '🔧 Lối tắt', value: '`/congphap` quản lý Công Pháp, Kỹ Năng và bí kíp' }
        );
}

const TAB_RENDERERS = Object.freeze({
    [DASHBOARD_TABS.OVERVIEW]: renderOverview,
    [DASHBOARD_TABS.CULTIVATION]: renderCultivation,
    [DASHBOARD_TABS.EQUIPMENT]: renderEquipment,
    [DASHBOARD_TABS.JOURNEY]: renderJourney,
    [DASHBOARD_TABS.COLLECTION]: renderCollection
});

const TAB_ASSETS = Object.freeze({
    [DASHBOARD_TABS.OVERVIEW]: 'CHARACTER_OVERVIEW',
    [DASHBOARD_TABS.CULTIVATION]: 'CULTIVATION',
    [DASHBOARD_TABS.JOURNEY]: 'JOURNEY'
});

export function renderDashboardPayload({ state, interaction, sessionId, activeTab, expired = false }) {
    const renderer = TAB_RENDERERS[activeTab] || TAB_RENDERERS[DASHBOARD_TABS.OVERVIEW];
    const embed = renderer(state, interaction, expired);
    const attachment = activeTab === DASHBOARD_TABS.JOURNEY
        ? createMapArtAttachment(state.location?.current?.id)
            || createUiAssetAttachment(TAB_ASSETS[activeTab])
        : createUiAssetAttachment(TAB_ASSETS[activeTab]);
    if (attachment) embed.setImage(attachment.asset.imageUrl);
    return {
        embeds: [embed],
        components: createTabRows(sessionId, activeTab, expired),
        attachments: [],
        files: attachment ? [attachment.file] : []
    };
}

export default class NhanVatCommand extends BaseCommand {
    constructor() {
        super({
            name: 'nhanvat',
            description: 'Mở dashboard quản lý hành trình tu tiên'
        });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const profileView = await client.playerReadService.getManagementProfileView(interaction.user.id);
        if (!profileView) return interaction.editReply('❌ Hãy dùng `/start` để tạo nhân vật trước.');

        const [inventoryView, location] = await Promise.all([
            client.playerReadService.getInventoryView(interaction.user.id),
            client.playerMapService
                ? client.playerMapService.getCurrentLocation(interaction.user.id).catch(() => null)
                : Promise.resolve(null)
        ]);
        const state = {
            ...profileView,
            inventoryItems: inventoryView?.items || [],
            location
        };
        const sessionId = interaction.id;
        let activeTab = DASHBOARD_TABS.OVERVIEW;
        const render = (options = {}) => renderDashboardPayload({
            state,
            interaction,
            sessionId,
            activeTab,
            ...options
        });
        const message = await interaction.editReply(render());

        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `nhanvat:${sessionId}:`
        }).run({
            onCollect: async (selected) => {
                const selectedTab = selected.customId.split(':')[2];
                if (!TAB_RENDERERS[selectedTab]) return false;
                activeTab = selectedTab;
                await selected.update(render());
                return true;
            },
            onTimeout: async () => interaction.editReply(render({ expired: true }))
        });
        return null;
    }
}
