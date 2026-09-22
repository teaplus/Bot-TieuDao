import AppError from '../errors/AppError.js';

const CURSOR_VERSION = 1;
const DIRECTIONS = new Set(['NEXT', 'PREVIOUS']);

function invalidCursor() {
    return new AppError('Invalid pagination cursor', { code: 'PAGINATION_CURSOR_INVALID' });
}

export default class KeysetCursorCodec {
    encode(payload) {
        const direction = String(payload?.direction || '').toUpperCase();
        const id = String(payload?.id || '');
        if (!DIRECTIONS.has(direction) || !id || payload?.sortValue === undefined || payload?.sortValue === null) {
            throw invalidCursor();
        }

        return Buffer.from(JSON.stringify({
            v: CURSOR_VERSION,
            d: direction,
            s: payload.sortValue,
            i: id,
            c: payload.context ?? null
        }), 'utf8').toString('base64url');
    }

    decode(cursor) {
        try {
            const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
            if (parsed.v !== CURSOR_VERSION || !DIRECTIONS.has(parsed.d) || !String(parsed.i || '')
                || parsed.s === undefined || parsed.s === null) {
                throw invalidCursor();
            }
            return Object.freeze({
                version: parsed.v,
                direction: parsed.d,
                sortValue: parsed.s,
                id: String(parsed.i),
                context: parsed.c ?? null
            });
        } catch (error) {
            if (error?.code === 'PAGINATION_CURSOR_INVALID') throw error;
            throw invalidCursor();
        }
    }
}

export { CURSOR_VERSION };
