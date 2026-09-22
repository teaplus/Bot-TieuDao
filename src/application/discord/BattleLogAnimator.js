import { EmbedBuilder } from 'discord.js';
import { compareBattleFixed, floorBattleFixed, ratioToBasisPoints } from '../../battle/numeric/BattleFixed.js';
import { BATTLE_DRAW_MESSAGE } from './BattleOutcomeText.js';
import { resolveBattleSemanticEmoji } from './BattleSemanticEmojiResolver.js';

const DEFAULT_DELAY_MS = 1300;
const DEFAULT_MAX_ENTRIES = 4; // 4-5 dòng log là đẹp nhất trên mobile
const HP_BAR_SIZE = 8; // Rút ngắn thanh máu từ 10 xuống 8 để không vỡ dòng

// Bảng màu trực quan
const COLOR_ACTIVE = 0xFFA500;   // Cam - Đang giao chiến
const COLOR_VICTORY = 0x2ECC71;  // Xanh lá - Thắng
const COLOR_DEFEAT = 0xE74C3C;   // Đỏ - Thua / Hòa
const COLOR_DRAW = 0xF1C40F;      // Vàng - Bất phân thắng bại

const TEAM_LABELS = Object.freeze({
    A: 'Đạo hữu',
    B: 'Đối thủ'
});

function sleep(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanMessage(message) {
    return String(message || '').replace(/\s+/g, ' ').trim();
}

function formatWinner(winnerTeam) {
    return TEAM_LABELS[winnerTeam] || winnerTeam || 'Không rõ';
}

function getEntityMaxHP(entity) {
    return String(entity?.maxHP || entity?.battleStat?.hp || entity?.currentHP || 1);
}

/**
 * Thanh máu dạng mảnh, tối giản, hiển thị đẹp trên cả Desktop & Mobile
 */
function renderHPBar(currentHP, maxHP) {
    const current = compareBattleFixed(currentHP || 0, 0) < 0 ? '0' : String(currentHP || 0);
    const max = compareBattleFixed(maxHP || 1, 1) < 0 ? '1' : String(maxHP || 1);
    const basisPoints = ratioToBasisPoints(current, max);
    
    const filledCount = Math.max(0, Math.min(HP_BAR_SIZE, Math.ceil(basisPoints * HP_BAR_SIZE / 10_000)));
    const emptyCount = HP_BAR_SIZE - filledCount;

    // Biểu tượng trạng thái HP
    const statusIcon = basisPoints <= 2500 ? '🔴' : (basisPoints <= 5000 ? '🟡' : '🟢');
    const bar = '▰'.repeat(filledCount) + '▱'.repeat(emptyCount);

    return `${statusIcon} \`${bar}\` **${floorBattleFixed(current)}**/${floorBattleFixed(max)}`;
}

function createEntityLookup(battleResult) {
    const lookup = new Map();
    for (const entity of battleResult?.entities || []) {
        lookup.set(entity.id, entity);
        lookup.set(entity.name, entity);
    }
    return lookup;
}

function getEntityName(lookup, entityId, fallback = 'mục tiêu') {
    return lookup.get(entityId)?.name || fallback;
}

function collectHpUpdates(summary = {}) {
    return [...(summary.damage || []), ...(summary.healing || [])]
        .filter((result) => result.targetId && result.applied?.remainingHP != null)
        .map((result) => ({
            entityId: result.targetId,
            currentHP: String(result.applied.remainingHP)
        }));
}

function buildSkillCastText({ actor, skill, summary, lookup, fallbackMessage }) {
    if (!actor || !skill) return fallbackMessage;

    const damage = summary.damage || [];
    const healing = summary.healing || [];
    const shields = summary.shields || [];
    const dispels = summary.dispels || [];
    const visibleEffects = (summary.effects || [])
        .filter((effect) => !effect.tags?.includes('ELEMENT'));

    const actions = [];

    if (damage.length > 0) {
        const dmgText = damage.map((entry) => {
            const targetName = getEntityName(lookup, entry.targetId);
            const criticalText = entry.critical ? ' (**Chí mạng**) 💥' : '';
            return `**${entry.amount}** sát thương lên **${targetName}**${criticalText}`;
        }).join(', ');
        actions.push(`gây ${dmgText}`);
    }
    if (healing.length > 0) {
        const healText = healing.map((entry) => (
            entry.blocked || entry.applied?.blocked
                ? 'bị **Khóa Hồi Máu**, hồi phục **0 HP**'
                : `hồi +**${entry.amount}** HP`
        )).join(', ');
        actions.push(healText);
    }
    if (shields.length > 0) {
        const shieldText = shields.map(s => `+**${s.amount}** khiên`).join(', ');
        actions.push(shieldText);
    }
    for (const effect of visibleEffects) {
        const effectName = effect.effectName || effect.effectId || 'Khống chế';
        const effectIcon = resolveBattleSemanticEmoji(effect.effectId || effect);
        const verb = effect.controlDirective || effect.tags?.includes('CONTROL')
            ? 'khống chế'
            : 'áp dụng hiệu ứng';
        actions.push(`${effectIcon} ${verb} **${effectName}** ${effect.success ? 'thành công' : 'thất bại'}`);
    }
    for (const dispel of dispels) {
        if (!dispel.success) {
            actions.push(`${resolveBattleSemanticEmoji('PURIFY')} xóa buff **thất bại**`);
        } else if (dispel.removedCount > 0) {
            actions.push(`${resolveBattleSemanticEmoji('PURIFY')} xóa **${dispel.removedId || 'một buff'}** thành công`);
        } else {
            actions.push('không tìm thấy buff có thể xóa');
        }
    }

    const actionStr = actions.length ? ` ➔ ${actions.join(' | ')}` : '';
    const cooldownText = Number(summary.cooldown?.remainingTurns || 0) > 0
        ? ` · hồi **${summary.cooldown.remainingTurns} lượt**`
        : '';
    return `**${actor}** dùng **${skill}**${actionStr}${cooldownText}`;
}

function pickSkillEmoji(summary) {
    if ((summary.damage || []).some(d => d.critical)) return resolveBattleSemanticEmoji('CRITICAL');
    if ((summary.healing || []).some((entry) => entry.blocked || entry.applied?.blocked)) {
        return resolveBattleSemanticEmoji('HEAL_BLOCK');
    }
    if ((summary.healing || []).length) return resolveBattleSemanticEmoji('HEAL');
    if ((summary.shields || []).length) return resolveBattleSemanticEmoji('SHIELD');
    if ((summary.dispels || []).length) return resolveBattleSemanticEmoji('PURIFY');
    if ((summary.actionTypes || []).length) {
        return resolveBattleSemanticEmoji({
            actions: summary.actionTypes.map((type) => ({ type }))
        });
    }
    return resolveBattleSemanticEmoji(summary.actionType || 'DAMAGE');
}

function createLogEntry({ emoji, round, text, hpUpdates = [] }) {
    return {
        round,
        // Loại bỏ blockquote (>), dùng định dạng dòng đơn gọn gàng
        line: `\`V${round}\` ${emoji} ${text}`,
        hpUpdates: Object.freeze([...hpUpdates])
    };
}

function formatEntry(entry, lookup, options = {}) {
    const message = cleanMessage(entry.message);
    const round = Number(entry.round || 1);

    if (!message || message.startsWith('Trigger ')) return null;

    if (message === 'Battle started') {
        return createLogEntry({
            emoji: '⚔️',
            round,
            text: 'Trận chiến bắt đầu!',
            hpUpdates: (entry.details?.entities || []).map((e) => ({
                entityId: e.id,
                currentHP: String(e.currentHP),
                maxHP: String(e.maxHP)
            }))
        });
    }

    if (message === 'Battle ended') {
        if (!entry.details?.winnerTeam && entry.details?.outcome === 'DRAW') {
            return createLogEntry({
                emoji: '☯️',
                round,
                text: options.drawMessage || BATTLE_DRAW_MESSAGE
            });
        }
        return createLogEntry({
            emoji: '🏆',
            round,
            text: `Trận đấu kết thúc! Phe thắng: **${formatWinner(entry.details?.winnerTeam)}**`
        });
    }

    if (message.endsWith(' cannot act')) {
        const actor = message.slice(0, -' cannot act'.length);
        return createLogEntry({
            emoji: resolveBattleSemanticEmoji(entry.details?.effectId || 'STUN'),
            round,
            text: `**${actor}** bị khống chế và mất lượt`
        });
    }

    if (message.includes(' uses ')) {
        const [, actor, skill] = message.match(/^(.+) uses (.+)$/) || [];
        const summary = entry.details?.summary || {};
        return createLogEntry({
            emoji: pickSkillEmoji(summary),
            round,
            text: buildSkillCastText({
                actor: entry.details?.actorName || actor,
                skill: entry.details?.skillName || skill,
                summary,
                lookup,
                fallbackMessage: message
            }),
            hpUpdates: collectHpUpdates(summary)
        });
    }

    if (message.includes(' suffers ')) {
        const [, target, effect] = message.match(/^(.+) suffers (.+)$/) || [];
        const summary = entry.details?.summary || {};
        const effectName = entry.details?.effectName || effect || 'hiệu ứng';
        const damageText = (summary.damage || []).map((result) => (
            `, nhận **${result.amount}** sát thương`
        )).join('');
        const healingText = (summary.healing || []).map((result) => (
            `, hồi **${result.amount}** HP`
        )).join('');
        return createLogEntry({
            emoji: resolveBattleSemanticEmoji(entry.details?.effectId || effect),
            round,
            text: `**${entry.details?.targetName || target}** chịu **${effectName}**${damageText}${healingText}`,
            hpUpdates: collectHpUpdates(summary)
        });
    }

    if (message.includes(' deals ')) {
        const [, actor, amount, target] = message.match(/^(.+) deals (\d+) damage to (.+)$/) || [];
        const isCritical = Boolean(entry.details?.critical);
        return createLogEntry({
            emoji: resolveBattleSemanticEmoji(isCritical ? 'CRITICAL' : 'DAMAGE'),
            round,
            text: `**${actor}** đánh **${target}** ➔ **${amount}** dmg`
        });
    }

    return null;
}

function buildHpSnapshot(lines, battleResult) {
    const snapshot = new Map((battleResult?.entities || []).map((entity) => [
        entity.id,
        {
            currentHP: String(entity.maxHP || entity.battleStat?.hp || entity.currentHP || 1),
            maxHP: getEntityMaxHP(entity)
        }
    ]));

    for (const line of lines || []) {
        for (const update of line.hpUpdates || []) {
            const current = snapshot.get(update.entityId) || {};
            snapshot.set(update.entityId, {
                currentHP: String(update.currentHP),
                maxHP: String(update.maxHP || current.maxHP || 1)
            });
        }
    }
    return snapshot;
}

export default class BattleLogAnimator {
    static formatCombatLog(battleResult, options = {}) {
        const maxEntries = Number(options.maxEntries ?? DEFAULT_MAX_ENTRIES);
        const lookup = createEntityLookup(battleResult);
        const entries = battleResult?.combatLog || [];

        const formatted = entries
            .map((entry) => formatEntry(entry, lookup, options))
            .filter(Boolean);

        return maxEntries > 0 ? formatted.slice(-maxEntries) : formatted;
    }

    static renderEmbed(battleResult, options = {}) {
        const lines = options.lines || this.formatCombatLog(battleResult, options);
        const entities = battleResult?.entities || [];
        const player = entities.find((e) => e.team === 'A');
        const opponent = entities.find((e) => e.team === 'B');
        const hpSnapshot = options.hpSnapshot || null;

        // Tính toán thông tin HP 2 bên
        const playerHP = player ? renderHPBar(
            hpSnapshot?.get(player.id)?.currentHP ?? player.currentHP,
            hpSnapshot?.get(player.id)?.maxHP ?? getEntityMaxHP(player)
        ) : '';

        const opponentHP = opponent ? renderHPBar(
            hpSnapshot?.get(opponent.id)?.currentHP ?? opponent.currentHP,
            hpSnapshot?.get(opponent.id)?.maxHP ?? getEntityMaxHP(opponent)
        ) : '';

        // Chọn màu viền Embed linh hoạt
        let embedColor = COLOR_ACTIVE;
        if (options.complete) {
            embedColor = battleResult?.isDraw
                ? COLOR_DRAW
                : battleResult?.winnerTeam === 'A' ? COLOR_VICTORY : COLOR_DEFEAT;
        }

        // --- XÂY DỰNG DESCRIPTION TỐI GIẢN (KHOẢNG CÁCH DÒNG ĐƠN \n) ---
        const descParts = [];

        // 1. Khung Máu 2 bên
        if (player || opponent) {
            descParts.push(`👤 **${player?.name || 'Đạo hữu'}**: ${playerHP}`);
            descParts.push(`👹 **${opponent?.name || 'Đối thủ'}**: ${opponentHP}`);
            descParts.push('───────────────────────────'); // Đường phân cách mảnh
        }

        // 2. Nhật ký giao chiến (Gộp các dòng nhật ký chỉ bằng 1 dấu \n)
        if (lines.length > 0) {
            descParts.push(lines.map(l => l.line).join('\n'));
        } else {
            descParts.push('*Chưa có hành động nào...*');
        }

        // 3. Trạng thái nhỏ phía dưới
        if (options.status) {
            descParts.push(`\n⏳ *${options.status}*`);
        }

        const embed = new EmbedBuilder()
            .setTitle(options.title || '⚔️ GIAO CHIẾN')
            .setColor(embedColor)
            .setDescription(descParts.join('\n'));

        if (options.footer) {
            embed.setFooter({ text: options.footer });
        }

        if (options.thumbnailUrl) {
            embed.setThumbnail(options.thumbnailUrl);
        } else if (options.interaction?.user) {
            embed.setThumbnail(options.interaction.user.displayAvatarURL({ dynamic: true, size: 128 }));
        }

        return embed;
    }

    static renderFinalEmbed(battleResult, options = {}) {
        return this.renderEmbed(battleResult, {
            ...options,
            complete: true,
            status: options.status || 'Đã hoàn tất',
            footer: options.footer || 'Trận đấu đã hoàn tất.'
        });
    }

    static async play(interaction, battleResult, options = {}) {
        const lines = this.formatCombatLog(battleResult, { ...options, maxEntries: 0 });
        if (!lines.length) return;

        const delayMs = Number(options.delayMs ?? DEFAULT_DELAY_MS);

        for (let index = 0; index < lines.length; index += 1) {
            const currentLines = lines.slice(Math.max(0, index + 1 - DEFAULT_MAX_ENTRIES), index + 1);
            const snapshot = buildHpSnapshot(lines.slice(0, index + 1), battleResult);
            const isLast = index === lines.length - 1;

            try {
                await interaction.editReply({
                    embeds: [this.renderEmbed(battleResult, {
                        ...options,
                        lines: currentLines,
                        hpSnapshot: snapshot,
                        complete: isLast,
                        status: isLast ? null : `Đang diễn ra (Lượt ${index + 1}/${lines.length})`,
                        footer: isLast ? 'Trận đấu đã hoàn tất.' : null
                    })],
                    components: [],
                    ...(index === 0 && options.files?.length
                        ? { attachments: [], files: options.files }
                        : {})
                });
            } catch (err) {
                // Bắt lỗi nếu người chơi tắt kênh hoặc interaction hết hạn
                console.error('Lỗi cập nhật BattleLogAnimator:', err);
                break;
            }

            if (!isLast) {
                await sleep(delayMs);
            }
        }
    }
}
