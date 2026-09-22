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
    resolveItemResourceComponentEmoji,
    resolveItemResourceEmoji
} from '../../application/discord/ItemResourceEmojiResolver.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const BATCH_OPTIONS = Object.freeze([1, 5, 10, 25, 50, 99]);

function formatMinutes(minutes) {
    const value = Number(minutes || 0);
    if (value < 60) return `${value} phút`;
    if (value % 1440 === 0) return `${value / 1440} ngày`;
    if (value % 60 === 0) return `${value / 60} giờ`;
    return `${Math.floor(value / 60)} giờ ${value % 60} phút`;
}

function formatRemaining(readyAt) {
    const seconds = Math.max(0, Math.ceil((new Date(readyAt).getTime() - Date.now()) / 1000));
    if (seconds <= 0) return 'Đã hoàn thành — có thể nhận';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes} phút ${remainder} giây`;
}

function errorMessage(error) {
    const messages = {
        PROFESSION_BATCH_OUT_OF_RANGE: 'Số lượng chế tạo phải từ 1 đến 99.',
        PROFESSION_GRADE_LOCKED: 'Nghề phẩm chưa đủ để dùng công thức này.',
        PROFESSION_RECIPE_NOT_LEARNED: 'Bạn chưa học công thức này.',
        PROFESSION_NOT_ACTIVE: 'Nghề này chưa mở gameplay trong phiên bản hiện tại.',
        REALM_LOCKED: 'Cảnh giới hiện tại chưa đủ.',
        INSUFFICIENT_CURRENCY: 'Không đủ tiền tệ để bắt đầu.',
        INSUFFICIENT_MATERIAL: 'Không đủ nguyên liệu để bắt đầu.',
        PROFESSION_CRAFT_JOB_NOT_READY: 'Mẻ chế tạo chưa hoàn thành.',
        PROFESSION_CRAFT_JOB_NOT_CLAIMABLE: 'Mẻ chế tạo này không còn có thể nhận.',
        INVENTORY_FULL: 'Kho đồ đã đầy; hãy dọn chỗ rồi nhận lại.'
    };
    if (String(error?.message || '').includes('profession_craft_jobs_one_active_slot')) {
        return 'Nghề này đang có một mẻ chế tạo khác.';
    }
    return messages[error?.message] || 'Không thể thực hiện thao tác nghề nghiệp lúc này.';
}

function selectedState(dashboard, professionId, recipeId) {
    const profession = dashboard.professions.find((entry) => entry.id === professionId)
        || dashboard.professions[0];
    const recipe = profession?.recipes.find((entry) => entry.id === recipeId)
        || profession?.recipes[0] || null;
    return { profession, recipe };
}

export function getProfessionShortages(recipe, batch) {
    if (!recipe) return [];
    const shortages = [];
    const currencyRequired = BigInt(recipe.costCurrency.amount) * BigInt(batch);
    const currencyOwned = BigInt(recipe.costCurrency.owned || 0);
    if (currencyOwned < currencyRequired) {
        shortages.push({
            type: 'CURRENCY',
            currencyId: recipe.costCurrency.currencyId,
            name: recipe.costCurrency.currencyId,
            owned: currencyOwned.toString(),
            required: currencyRequired.toString(),
            missing: (currencyRequired - currencyOwned).toString()
        });
    }
    for (const material of recipe.materials) {
        const required = BigInt(material.quantity) * BigInt(batch);
        const owned = BigInt(material.owned || 0);
        if (owned < required) {
            shortages.push({
                type: 'ITEM',
                itemId: material.itemId,
                name: material.name,
                owned: owned.toString(),
                required: required.toString(),
                missing: (required - owned).toString()
            });
        }
    }
    return shortages;
}

function createComponents({ dashboard, professionId, recipeId, batch, sessionId, disabled = false }) {
    const { profession, recipe } = selectedState(dashboard, professionId, recipeId);
    const shortages = getProfessionShortages(recipe, batch);
    const professionSelect = new StringSelectMenuBuilder()
        .setCustomId(`nghenghiep:${sessionId}:profession`)
        .setPlaceholder('Chọn nghề nghiệp')
        .setDisabled(disabled)
        .addOptions(dashboard.professions.map((entry) => ({
            label: `${entry.name} · ${entry.gradeName}`.slice(0, 100),
            value: entry.id,
            description: entry.status === 'ACTIVE' ? 'Đã mở' : 'Nội dung đang phát triển',
            default: entry.id === profession?.id
        })));

    const recipeSelect = new StringSelectMenuBuilder()
        .setCustomId(`nghenghiep:${sessionId}:recipe`)
        .setPlaceholder(profession?.recipes.length ? 'Chọn công thức' : 'Nghề chưa có công thức')
        .setDisabled(disabled || !profession?.recipes.length)
        .addOptions((profession?.recipes.length ? profession.recipes : [{
            id: 'NO_RECIPE', name: 'Chưa có công thức', available: false
        }]).slice(0, 25).map((entry) => ({
            label: `${entry.available ? '✓' : '🔒'} ${entry.name}`.slice(0, 100),
            value: entry.id,
            description: entry.professionGradeName
                ? `Yêu cầu ${entry.professionGradeName}`.slice(0, 100) : 'Đang chờ content',
            emoji: resolveItemResourceComponentEmoji({ semanticId: 'RECIPE_SCROLL' }),
            default: entry.id === recipe?.id
        })));

    const batchSelect = new StringSelectMenuBuilder()
        .setCustomId(`nghenghiep:${sessionId}:batch`)
        .setPlaceholder('Chọn số lượng')
        .setDisabled(disabled || !recipe)
        .addOptions(BATCH_OPTIONS.map((quantity) => ({
            label: `Chế tạo ${quantity} lần`, value: String(quantity), default: quantity === batch
        })));

    const canStart = Boolean(recipe?.available && shortages.length === 0
        && !profession?.activeJob && profession?.status === 'ACTIVE');
    const canClaim = profession?.activeJob?.computedStatus === 'READY';
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`nghenghiep:${sessionId}:start`)
            .setLabel('Bắt đầu').setEmoji('🔥').setStyle(ButtonStyle.Success)
            .setDisabled(disabled || !canStart),
        new ButtonBuilder().setCustomId(`nghenghiep:${sessionId}:claim`)
            .setLabel('Nhận thành phẩm').setEmoji('🎁').setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || !canClaim),
        new ButtonBuilder().setCustomId(`nghenghiep:${sessionId}:refresh`)
            .setLabel('Làm mới').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`nghenghiep:${sessionId}:close`)
            .setLabel('Đóng').setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
    return [
        new ActionRowBuilder().addComponents(professionSelect),
        new ActionRowBuilder().addComponents(recipeSelect),
        new ActionRowBuilder().addComponents(batchSelect),
        buttons
    ];
}

function render({ interaction, dashboard, professionId, recipeId, batch, sessionId, notice, disabled = false }) {
    const { profession, recipe } = selectedState(dashboard, professionId, recipeId);
    const nextExperience = profession.nextGradeExperience == null
        ? 'Đã đạt Cửu Phẩm'
        : `${formatIntegerAmount(profession.experience)} / ${formatIntegerAmount(profession.nextGradeExperience)} EXP`;
    const embed = new EmbedBuilder()
        .setColor(profession.status === 'ACTIVE' ? '#C77D32' : '#6B7280')
        .setTitle(`⚒️ Nghề nghiệp · ${profession.name}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription([
            notice,
            `**Nghề phẩm:** ${profession.gradeName}`,
            `**Tiến độ:** ${nextExperience}`,
            profession.status === 'ACTIVE'
                ? 'Chế tạo dùng lazy evaluation: nguyên liệu trừ lúc bắt đầu, thành phẩm nhận khi hoàn tất.'
                : 'Nghề đã được đăng ký nhưng gameplay đang chờ phase mở rộng.'
        ].filter(Boolean).join('\n'));

    if (recipe) {
        const shortages = getProfessionShortages(recipe, batch);
        const materialLines = recipe.materials.map((material) => {
            const need = Number(material.quantity) * batch;
            const enough = BigInt(material.owned || 0) >= BigInt(need);
            const sourceMethods = [];
            if (material.source?.methods?.includes('GATHERING')) {
                sourceMethods.push('/thuthap');
            }
            if (material.source?.methods?.includes('MONSTER_DROP')) {
                sourceMethods.push('/thamhiem');
            }
            const source = sourceMethods.length || material.source?.mapName
                ? `\n  ↳ Nguồn: ${sourceMethods.join(', ') || 'Nội dung bản đồ'}`
                    + `${material.source?.mapName ? ` tại **${material.source.mapName}**` : ''}`
                : '';
            const icon = resolveItemResourceEmoji({
                itemId: material.itemId,
                category: 'MATERIAL',
                resourceFamily: material.resourceFamily,
                resourceRole: material.resourceRole
            }, '📦');
            return `• ${enough ? '✅' : '❌'} ${icon} ${material.name}: **${material.owned}/${need}**${source}`;
        });
        const currencyAmount = BigInt(recipe.costCurrency.amount) * BigInt(batch);
        const currencyEnough = BigInt(recipe.costCurrency.owned || 0) >= currencyAmount;
        const shortageLines = shortages.map((entry) => (
            `• ${resolveItemResourceEmoji(entry, entry.type === 'CURRENCY' ? '💎' : '📦')} Thiếu **${formatIntegerAmount(entry.missing)} ${entry.name}** `
            + `(${formatIntegerAmount(entry.owned)}/${formatIntegerAmount(entry.required)})`
        ));
        const outputIcon = resolveItemResourceEmoji({
            itemId: recipe.output?.itemId
        }, recipe.output?.type === 'EQUIPMENT' ? '⚔️' : '📦');
        const currencyIcon = resolveItemResourceEmoji({
            currencyId: recipe.costCurrency.currencyId
        }, '🪙');
        embed.addFields({
            name: `${resolveItemResourceEmoji({ semanticId: 'RECIPE_SCROLL' }, '📜')} ${recipe.name}`,
            value: [
                `Thành phẩm: ${outputIcon} **${recipe.outputName} ×${Number(recipe.output.quantity) * batch}**`,
                `Yêu cầu: **${recipe.professionGradeName}** · Cảnh giới \`${recipe.requiredRealm}\``,
                `Thời gian: **${formatMinutes(recipe.durationMinutes * batch)}**`,
                `Chi phí: ${currencyEnough ? '✅' : '❌'} ${currencyIcon} **${formatIntegerAmount(recipe.costCurrency.owned || 0)}/${formatIntegerAmount(currencyAmount)} ${recipe.costCurrency.currencyId}**`,
                materialLines.join('\n') || '• Không cần nguyên liệu',
                recipe.learned ? null : '🔒 Chưa học công thức'
            ].filter(Boolean).join('\n').slice(0, 1024)
        });
        if (shortageLines.length) {
            embed.addFields({
                name: '⚠️ Không đủ nguyên liệu',
                value: `${shortageLines.join('\n')}\nNút **Bắt đầu** đã bị khóa cho tới khi đủ tài nguyên.`.slice(0, 1024)
            });
        }
    } else {
        embed.addFields({ name: '📜 Công thức', value: 'Chưa có công thức được phát hành cho nghề này.' });
    }

    if (profession.activeJob) {
        const job = profession.activeJob;
        embed.addFields({
            name: job.computedStatus === 'READY' ? '✅ Mẻ chế tạo đã xong' : '⏳ Đang chế tạo',
            value: [
                `Công thức: **${job.recipeId}** · Số lượng **${job.batchQuantity}**`,
                `Hoàn thành: <t:${Math.floor(new Date(job.readyAt).getTime() / 1000)}:R>`,
                `Còn lại: **${formatRemaining(job.readyAt)}**`
            ].join('\n')
        });
    } else {
        embed.addFields({ name: '🛠️ Xưởng hiện tại', value: 'Không có mẻ chế tạo đang hoạt động ở nghề này.' });
    }

    return {
        embeds: [embed],
        components: createComponents({ dashboard, professionId: profession.id, recipeId: recipe?.id, batch, sessionId, disabled })
    };
}

export default class ProfessionCommand extends BaseCommand {
    constructor() {
        super({ name: 'nghenghiep', description: 'Quản lý nghề nghiệp và chế tạo vật phẩm' });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!client.professionService) return interaction.editReply('Hệ thống nghề nghiệp chưa sẵn sàng.');
        try {
            let dashboard = await client.professionService.getDashboard(interaction.user.id);
            let professionId = dashboard.professions.find((entry) => entry.status === 'ACTIVE')?.id
                || dashboard.professions[0]?.id;
            let recipeId = dashboard.professions.find((entry) => entry.id === professionId)?.recipes[0]?.id || null;
            let batch = 1;
            let notice = null;
            const sessionId = interaction.id;
            const message = await interaction.editReply(render({
                interaction, dashboard, professionId, recipeId, batch, sessionId, notice
            }));
            await ComponentSession.forMessage({
                interaction, message, prefix: `nghenghiep:${sessionId}:`, timeoutMs: 120_000
            }).run({
                onCollect: async (component) => {
                    const action = component.customId.split(':')[2];
                    if (action === 'close') {
                        await component.update(render({
                            interaction, dashboard, professionId, recipeId, batch, sessionId,
                            notice: 'Đã đóng bảng nghề nghiệp.', disabled: true
                        }));
                        return false;
                    }
                    await component.deferUpdate();
                    try {
                        if (action === 'profession') {
                            professionId = component.values[0];
                            recipeId = dashboard.professions.find((entry) => entry.id === professionId)?.recipes[0]?.id || null;
                        } else if (action === 'recipe') {
                            recipeId = component.values[0];
                        } else if (action === 'batch') {
                            batch = Number(component.values[0]);
                        } else if (action === 'start') {
                            if (!recipeId) throw new Error('CRAFT_RECIPE_NOT_FOUND');
                            const result = await client.professionService.start(
                                interaction.user.id, recipeId, batch, { operationId: component.id }
                            );
                            notice = `✅ Đã bắt đầu mẻ chế tạo #${result.job.jobId}.`;
                            dashboard = await client.professionService.getDashboard(interaction.user.id);
                        } else if (action === 'claim') {
                            const profession = dashboard.professions.find((entry) => entry.id === professionId);
                            if (!profession?.activeJob) throw new Error('PROFESSION_CRAFT_JOB_NOT_CLAIMABLE');
                            const result = await client.professionService.claim(
                                interaction.user.id, profession.activeJob.jobId, { operationId: component.id }
                            );
                            notice = `🎁 Đã nhận ${result.output.itemId} ×${result.output.quantity}.`;
                            dashboard = await client.professionService.getDashboard(interaction.user.id);
                        } else if (action === 'refresh') {
                            dashboard = await client.professionService.getDashboard(interaction.user.id);
                            notice = '🔄 Đã cập nhật trạng thái xưởng.';
                        }
                    } catch (error) {
                        client.logger?.error('Profession panel action failed', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                        notice = `⚠️ ${errorMessage(error)}`;
                        dashboard = await client.professionService.getDashboard(interaction.user.id);
                    }
                    await interaction.editReply(render({
                        interaction, dashboard, professionId, recipeId, batch, sessionId, notice
                    }));
                    return true;
                },
                onTimeout: async () => interaction.editReply(render({
                    interaction, dashboard, professionId, recipeId, batch, sessionId,
                    notice: 'Phiên nghề nghiệp đã hết hạn. Dùng lại `/nghenghiep` để tiếp tục.', disabled: true
                }))
            });
        } catch (error) {
            client.logger?.error('Profession command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            const content = error.message === 'PLAYER_NOT_FOUND'
                ? 'Hãy dùng `/start` để tạo nhân vật trước.'
                : 'Không thể mở bảng nghề nghiệp lúc này.';
            return interaction.editReply({ content, embeds: [], components: [] });
        }
    }
}
