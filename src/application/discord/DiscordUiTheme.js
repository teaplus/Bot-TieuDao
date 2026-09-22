import { EmbedBuilder } from 'discord.js';

export const UI_COLORS = Object.freeze({
    PRIMARY: 0xC89B3C,
    CULTIVATION: 0x2E8B57,
    EQUIPMENT: 0x7E57C2,
    JOURNEY: 0x3498DB,
    COLLECTION: 0xD97706,
    SUCCESS: 0x2ECC71,
    DANGER: 0xE74C3C,
    MUTED: 0x64748B
});

export function truncateText(value, maxLength) {
    const text = String(value ?? '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function progressBar(percent, size = 10) {
    const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
    const filled = Math.round((safePercent / 100) * size);
    return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)} **${safePercent}%**`;
}

export function bulletList(entries, emptyText = 'Chưa có dữ liệu.', maxLength = 1024) {
    const lines = (entries || []).filter(Boolean).map((entry) => `• ${entry}`);
    return truncateText(lines.join('\n') || emptyText, maxLength);
}

export function formatDuration(totalSeconds) {
    let remaining = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const parts = [];
    if (days) parts.push(`${days} ngày`);
    if (hours) parts.push(`${hours} giờ`);
    if (minutes) parts.push(`${minutes} phút`);
    if (seconds || parts.length === 0) parts.push(`${seconds} giây`);
    return parts.slice(0, 2).join(' ');
}

export function createUiEmbed({ title, description, color = UI_COLORS.PRIMARY, user = null, footer = null }) {
    const embed = new EmbedBuilder()
        .setTitle(truncateText(title, 256))
        .setColor(color);

    if (description) embed.setDescription(truncateText(description, 4096));
    if (user?.displayAvatarURL) embed.setThumbnail(user.displayAvatarURL());
    if (footer) embed.setFooter({ text: truncateText(footer, 2048) });
    return embed;
}

export function disableComponentRows(rows) {
    for (const row of rows || []) {
        for (const component of row.components || []) component.setDisabled(true);
    }
    return rows;
}
