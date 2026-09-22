import { EmbedBuilder } from 'discord.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';

export default class EconomyHelpMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'help', aliases: ['commands'], description: 'Xem lệnh tin nhắn.' });
    }

    async execute(message, client) {
        const prefix = client.messageCommandPrefix;
        const embed = new EmbedBuilder()
            .setColor('#6C7A89')
            .setTitle('📜 Lệnh Tin Nhắn')
            .setDescription([
                '*Có thể dùng các lệnh kinh tế trước khi tạo nhân vật bằng `/start`.*',
                '',
                `\`${prefix}balance\` — xem số Linh Thạch hiện có.`,
                `\`${prefix}daily\` — nhận Bổng Lộc Hằng Ngày.`,
                `\`${prefix}work\` — làm việc kiếm Linh Thạch.`,
                `\`${prefix}slot <số tiền>\` — quay Linh Thạch Luân Bàn, ví dụ \`${prefix}slot 1000\`.`,
                `\`${prefix}highlow <số tiền>\` — đoán thiên số Cao/Thấp, ví dụ \`${prefix}highlow 1000\`.`,
                `\`${prefix}blackjack <số tiền|all|half>\` (gọn: \`${prefix}bj\`) — Tiên Bài Bốc/Dừng/Gấp đôi.`,
                `\`${prefix}noitu\` — mở Nối Từ cộng đồng; \`${prefix}noitu status\` để xem và \`${prefix}noitu stop\` để dừng.`
            ].join('\n'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
}
