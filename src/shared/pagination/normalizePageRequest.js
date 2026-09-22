import AppError from '../errors/AppError.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export default function normalizePageRequest(request = {}, cursorCodec = null) {
    const rawLimit = request.limit ?? DEFAULT_PAGE_SIZE;
    const limit = rawLimit;
    if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        throw new AppError('Invalid page size', {
            code: 'PAGINATION_LIMIT_INVALID',
            details: { min: 1, max: MAX_PAGE_SIZE }
        });
    }
    if (request.cursor && !cursorCodec) {
        throw new AppError('Cursor codec is required', { code: 'PAGINATION_CURSOR_CODEC_REQUIRED' });
    }

    return Object.freeze({
        limit,
        cursor: request.cursor ? cursorCodec.decode(request.cursor) : null
    });
}
