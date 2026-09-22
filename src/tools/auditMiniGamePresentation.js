import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = new Map([
    ['SLOT', new URL('../message-commands/minigames/slot.js', import.meta.url)],
    ['HIGH_LOW', new URL('../message-commands/minigames/highlow.js', import.meta.url)],
    ['BLACKJACK', new URL('../message-commands/minigames/blackjack.js', import.meta.url)],
    ['WORD_CHAIN', new URL('../application/discord/WordChainPresentation.js', import.meta.url)]
]);

const forbidden = ['Số dư', 'result.balance', 'error?.balance'];
for (const [gameId, url] of sources) {
    const source = fs.readFileSync(url, 'utf8');
    for (const fragment of forbidden) {
        assert(!source.includes(fragment), `${gameId} presentation leaks balance via ${fragment}`);
    }
}

const slot = fs.readFileSync(sources.get('SLOT'), 'utf8');
assert(slot.includes("{ name: 'Cược'"));
assert(slot.includes("{ name: 'Kết quả'"));

const highLow = fs.readFileSync(sources.get('HIGH_LOW'), 'utf8');
assert(highLow.includes(".setTitle('🃏 Cao Thấp')"));
assert(highLow.includes('Đúng 51 tính là thua'));

const blackjack = fs.readFileSync(sources.get('BLACKJACK'), 'utf8');
assert(blackjack.includes("'🃏 **BLACKJACK · KẾT QUẢ**'"));
assert(blackjack.includes('Nhận **${formatIntegerAmount(result.payout)} 💎**'));

const wordChain = fs.readFileSync(sources.get('WORD_CHAIN'), 'utf8');
assert(wordChain.includes('*Đúng 2 từ · không nối hai lượt liên tiếp.*'));
assert(wordChain.includes('Lỗi **${result.failureCount}/${result.maxFailures}**'));

console.log(JSON.stringify({
    status: 'PASS',
    games: [...sources.keys()],
    privacy: 'NO_PLAYER_BALANCE_IN_PRESENTATION',
    layout: 'COMPACT_FRIENDLY'
}, null, 2));
