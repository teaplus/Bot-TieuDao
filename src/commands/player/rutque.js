import { EmbedBuilder, AttachmentBuilder, MessageFlags } from "discord.js";
import path from "path";
import BaseCommand from "../../core/BaseCommand.js";
import KinhDichService from "../../gameplay/activities/KinhDichService.js";
import ImageStitcher from "../../application/discord/ImageStitcher.js";

const POSITIONS = {
  3: ["✦ Lá 1 — Quá Khứ", "✦ Lá 2 — Hiện Tại", "✦ Lá 3 — Tương Lai"],
  5: [
    "1️⃣ Vấn đề chính",
    "2️⃣ Yếu tố thúc đẩy",
    "3️⃣ Trở ngại",
    "4️⃣ Lời khuyên",
    "5️⃣ Hướng đi",
  ],
  7: [
    "1️⃣ Tình trạng hiện tại",
    "2️⃣ Nội tâm",
    "3️⃣ Yếu tố bên ngoài",
    "4️⃣ Nguyên nhân sâu xa",
    "5️⃣ Giải pháp",
    "6️⃣ Trợ giúp / Cản trở",
    "7️⃣ Kết luận",
  ],
};

const TITLES = {
  3: "🔮 Trải Bài 3 Lá",
  5: "🔮 Trải Bài 5 Lá — Bức Tranh Toàn Cảnh",
  7: "🔮 Trải Bài 7 Lá — Phân Tích Đa Chiều",
};

export default class KinhDichCommand extends BaseCommand {
  constructor() {
    super({
      name: "rutque",
      description: "🔮 Rút quẻ Kinh Dịch ngẫu nhiên",
      options: [
        {
          name: "so_la",
          description: "Số lá muốn rút (mặc định: 1)",
          type: 4, // INTEGER
          required: false,
          choices: [
            { name: "1 lá", value: 1 },
            { name: "3 lá", value: 3 },
            { name: "5 lá", value: 5 },
            { name: "7 lá", value: 7 },
          ],
        },
      ],
    });
    this.kinhDichService = new KinhDichService();
  }

  getSlashData() {
    const builder = super.getSlashData();
    if (this.options && this.options.length > 0) {
      this.options.forEach((opt) => {
        if (opt.type === 4) { // INTEGER
          builder.addIntegerOption((option) => {
            option
              .setName(opt.name)
              .setDescription(opt.description)
              .setRequired(opt.required || false);
            if (opt.choices) {
              option.addChoices(...opt.choices);
            }
            return option;
          });
        }
      });
    }
    return builder;
  }

  async execute(interaction, client) {
    try {
      const soLa = interaction.options.getInteger("so_la") ?? 1;

      if (soLa === 1) {
        const que = this.kinhDichService.getRandomQue();
        if (!que) {
          return interaction.reply({
            content: "Lỗi tải dữ liệu Kinh Dịch.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const { color, label } = this.kinhDichService.getTypeStyle(que.type);
        const imagePath = path.resolve(
          process.cwd(),
          `src/assets/ui/kinhdich/${que.id + 1}.png`
        );

        const file = new AttachmentBuilder(imagePath, { name: "que.png" });

        const embed = new EmbedBuilder()
          .setTitle(`🔮 ${que.full_title}`)
          .setThumbnail("attachment://que.png")
          .setDescription(que.description)
          .setColor(color)
          .addFields({ name: "📊 Phán đoán", value: label, inline: true })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], files: [file] });
      }

      await interaction.deferReply();

      const positions = POSITIONS[soLa];
      const cards = this.kinhDichService.pickUnique(soLa);
      const imagePaths = cards.map((q) =>
        path.resolve(process.cwd(), `src/assets/ui/kinhdich/${q.id + 1}.png`)
      );

      // Generate stitched image buffer using sharp
      const imageBuffer = await ImageStitcher.stitch(imagePaths);
      const file = new AttachmentBuilder(imageBuffer, { name: "combined.png" });

      let embed;
      if (soLa === 3) {
        const fields = cards.map((q, i) => {
          const { label } = this.kinhDichService.getTypeStyle(q.type);
          return {
            name: positions[i],
            value: `**${q.name}**\n${label}`,
            inline: true,
          };
        });

        embed = new EmbedBuilder()
          .setTitle(TITLES[3])
          .setColor(0x5865f2)
          .addFields(...fields)
          .setImage("attachment://combined.png")
          .setTimestamp();
      } else {
        const description = cards
          .map((q, i) => {
            const { label } = this.kinhDichService.getTypeStyle(q.type);
            return `${positions[i]}\n**${q.name}** · ${label}`;
          })
          .join("\n\n");

        embed = new EmbedBuilder()
          .setTitle(TITLES[soLa])
          .setColor(0x5865f2)
          .setDescription(description)
          .setImage("attachment://combined.png")
          .setTimestamp();
      }

      return interaction.editReply({ embeds: [embed], files: [file] });
    } catch (error) {
      client.logger?.error("KinhDich command failed:", error);
      console.error("KinhDich execution error:", error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "Thiên cơ bất khả lộ. Đã có lỗi xảy ra khi gieo quẻ.",
        });
      } else {
        return interaction.reply({
          content: "Thiên cơ bất khả lộ. Đã có lỗi xảy ra khi gieo quẻ.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
}
