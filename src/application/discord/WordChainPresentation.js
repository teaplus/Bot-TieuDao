import { EmbedBuilder } from 'discord.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export function createWordChainSessionEmbed(result, options = {}) {
    const alreadyActive = result.status === 'WORD_CHAIN_ALREADY_ACTIVE'
        || result.status === 'WORD_CHAIN_ACTIVE';
    const activeElsewhere = options.invokedChannelId
        && String(options.invokedChannelId) !== String(result.channelId);
    return new EmbedBuilder()
        .setColor('#3FAF7C')
        .setTitle('🧩 Nối Từ Tu Tiên')
        .setDescription([
            activeElsewhere
                ? `Ván đang diễn ra tại <#${result.channelId}>.`
                : alreadyActive
                    ? 'Ván đang tiếp diễn.'
                    : 'Ván mới đã bắt đầu!',
            `**${result.currentWord}** → nối **${result.requiredPart} ...**`,
            '*Đúng 2 từ · không nối hai lượt liên tiếp.*'
        ].join('\n'))
        .addFields(
            { name: 'Lượt đúng', value: String(result.validMoveCount), inline: true },
            { name: 'Lỗi', value: `${result.failureCount}/${result.maxFailures}`, inline: true },
            { name: 'Người chơi', value: `${result.participantCount}/${result.minimumParticipants}+`, inline: true }
        )
        .setFooter({ text: `#${result.sessionId} · !noitu status · !noitu stop` });
}

export function createWordChainCancelledEmbed(result) {
    return new EmbedBuilder()
        .setColor('#6C7A89')
        .setTitle('🌫️ Đã dừng Nối Từ')
        .setDescription([
            `Từ cuối: **${result.currentWord}**`,
            '*Phiên bị hủy không phát thưởng.*'
        ].join('\n'));
}

export function createWordChainFailureText(result) {
    return `❌ Sai · Hãy nối cụm từ bắt đầu bằng **“${result.requiredPart} …”** · Lỗi **${result.failureCount}/${result.maxFailures}**`;
}

export function createWordChainInvalidFormatText(result) {
    return `⚠️ Từ không phù hợp · Hãy nối bằng cụm 2 từ bắt đầu với **“${result.requiredPart} …”**`;
}

export function createWordChainSettledText(result) {
    const outcome = result.outcome || {};
    const winner = result.winnerPlayerId ? `<@${result.winnerPlayerId}>` : 'Không có người đủ điều kiện';
    const reward = outcome.rewardStatus === 'REWARDED'
        ? `**${formatIntegerAmount(result.rewardAmount)} Linh Thạch**`
        : outcome.rewardStatus === 'DAILY_LIMIT_REACHED'
            ? 'Đã đạt giới hạn 10 lần nhận thưởng hôm nay'
            : 'Không phát thưởng';
    return [
        createWordChainFailureText(result),
        `🏁 Kết thúc · Từ cuối **${result.currentWord}**`,
        `Thắng: ${winner} · ${reward}`
    ].join('\n');
}
