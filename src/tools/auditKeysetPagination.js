import KeysetCursorCodec from '../shared/pagination/KeysetCursorCodec.js';
import normalizePageRequest, { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../shared/pagination/normalizePageRequest.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const codec = new KeysetCursorCodec();
const encoded = codec.encode({ direction: 'NEXT', sortValue: 42, id: 'player-42', context: 'snapshot-1' });
const decoded = codec.decode(encoded);
assert(!encoded.includes('player-42'), 'Cursor must be opaque');
assert(decoded.version === 1 && decoded.direction === 'NEXT', 'Cursor version/direction mismatch');
assert(decoded.sortValue === 42 && decoded.id === 'player-42', 'Cursor keyset mismatch');
assert(decoded.context === 'snapshot-1', 'Cursor context mismatch');
assert(normalizePageRequest({}, codec).limit === DEFAULT_PAGE_SIZE, 'Default page size mismatch');
assert(normalizePageRequest({ limit: MAX_PAGE_SIZE, cursor: encoded }, codec).cursor.id === 'player-42', 'Max page request failed');

for (const invalidLimit of [0, 101, 1.5, '20']) {
    let code = null;
    try { normalizePageRequest({ limit: invalidLimit }, codec); } catch (error) { code = error.code; }
    assert(code === 'PAGINATION_LIMIT_INVALID', `Invalid limit was accepted: ${invalidLimit}`);
}

let invalidCursorCode = null;
try { codec.decode('not-a-cursor'); } catch (error) { invalidCursorCode = error.code; }
assert(invalidCursorCode === 'PAGINATION_CURSOR_INVALID', 'Invalid cursor must be rejected');

console.log(JSON.stringify({
    status: 'PASS',
    checks: { opaqueVersionedCursor: true, defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE }
}, null, 2));
