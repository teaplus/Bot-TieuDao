import CultivationLeaderboardCommand, {
    createLeaderboardPayload,
    PAGE_SIZE,
    SESSION_TIMEOUT_MS
} from '../commands/player/bangxephang.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const firstPage = {
    items: [{ rank: 1, displayName: 'Dao Huu', rebirthCount: '4', realmName: 'Kết Đan', stage: 3 }],
    nextCursor: 'stale-next', previousCursor: null, refreshedAt: '2026-07-18T00:00:00.000Z'
};
const refreshedPage = {
    items: [{ rank: 1, displayName: 'Tân Đệ Nhất', rebirthCount: '5', realmName: 'Nguyên Anh', stage: 1 }],
    nextCursor: null, previousCursor: null, refreshedAt: '2026-07-18T00:05:00.000Z'
};
const edits = [];
let componentWait = 0;
let deferredComponent = false;
const component = {
    user: { id: 'viewer' },
    customId: 'bangxephang:interaction-1:next',
    async deferUpdate() { deferredComponent = true; }
};
const message = {
    async awaitMessageComponent(options) {
        componentWait += 1;
        if (componentWait === 1) {
            assert(options.filter(component), 'Command session rejected its owner button');
            return component;
        }
        throw new Error('TIMEOUT');
    }
};
const interaction = {
    id: 'interaction-1',
    user: { id: 'viewer' },
    async deferReply() {},
    async editReply(payload) { edits.push(payload); return message; }
};
const calls = [];
const client = {
    cultivationLeaderboardService: {
        async list(request) {
            calls.push(request);
            if (!request.cursor && calls.length === 1) return firstPage;
            if (request.cursor === 'stale-next') {
                const error = new Error('STALE'); error.code = 'LEADERBOARD_CURSOR_STALE'; throw error;
            }
            return refreshedPage;
        }
    },
    logger: { error() {} }
};

await new CultivationLeaderboardCommand().execute(interaction, client);
assert(PAGE_SIZE === 20 && SESSION_TIMEOUT_MS === 600000, 'Approved Discord pagination policy mismatch');
assert(deferredComponent, 'Button interaction was not acknowledged');
assert(calls.length === 3 && calls[1].cursor === 'stale-next', 'Stale cursor reload flow failed', calls);
assert(edits.some((payload) => payload.content?.includes('quay lại trang đầu')), 'Stale refresh notice missing');
assert(edits.at(-1).components.length === 0, 'Buttons were not removed on timeout');

const payload = createLeaderboardPayload(firstPage, 'interaction-1');
const serialized = JSON.stringify(payload);
assert(serialized.includes('#1') && serialized.includes('Dao Huu'), 'Leaderboard entry rendering failed');
assert(serialized.includes('Luân hồi 4'), 'Leaderboard rebirth count rendering failed');
assert(!serialized.includes('playerId') && !serialized.includes('cultivation'), 'Discord projection leaked internal fields');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        command: '/bangxephang',
        pageSize: PAGE_SIZE,
        sessionTimeoutMs: SESSION_TIMEOUT_MS,
        previousNextButtons: true,
        staleCursorReload: true,
        timeoutCleanup: true
    }
}, null, 2));
