import AppError from '../../shared/errors/AppError.js';
import KeysetCursorCodec from '../../shared/pagination/KeysetCursorCodec.js';
import normalizePageRequest from '../../shared/pagination/normalizePageRequest.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import { applicationTelemetry } from '../../platform/observability/telemetryContext.js';

export const LEADERBOARD_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default class CultivationLeaderboardService {
    constructor(options = {}) {
        if (!options.repository) throw new Error('LEADERBOARD_REPOSITORY_REQUIRED');
        if (!options.unitOfWork) throw new Error('LEADERBOARD_UNIT_OF_WORK_REQUIRED');
        if (!options.gameDataManager) throw new Error('LEADERBOARD_GAME_DATA_REQUIRED');
        this.repository = options.repository;
        this.unitOfWork = options.unitOfWork;
        this.gameDataManager = options.gameDataManager;
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.cursorCodec = options.cursorCodec || new KeysetCursorCodec();
        this.telemetry = options.telemetry || applicationTelemetry;
    }

    getRealmDefinitions() {
        const definitions = Object.values(this.gameDataManager.getCollection('realms') || {})
            .map((realm) => ({ id: Number(realm.id), order: Number(realm.order), name: realm.name }))
            .sort((left, right) => left.order - right.order);
        if (!definitions.length || definitions.some((realm) => !Number.isInteger(realm.id)
            || !Number.isInteger(realm.order) || !realm.name)) {
            throw new AppError('Invalid leaderboard realm definitions', {
                code: 'LEADERBOARD_REALM_DEFINITIONS_INVALID'
            });
        }
        return Object.freeze(definitions.map(Object.freeze));
    }

    async refreshIfDue(options = {}) {
        return this.telemetry.measureUseCase({
            operationName: 'leaderboard.refresh',
            operationType: 'BACKGROUND'
        }, () => this.refreshIfDueInternal(options));
    }

    async refreshIfDueInternal(options = {}) {
        return this.unitOfWork.execute(async (client) => {
            const state = await this.repository.getRefreshState(client, { forUpdate: true });
            const now = new Date(this.timeProvider.now());
            const lastRefresh = state.refreshedAt ? new Date(state.refreshedAt) : null;
            const due = options.force === true || !lastRefresh
                || now.getTime() - lastRefresh.getTime() >= LEADERBOARD_REFRESH_INTERVAL_MS;
            if (!due) return Object.freeze({ status: 'SKIPPED', refreshedAt: state.refreshedAt });

            const refreshedAt = now.toISOString();
            await this.repository.replaceSnapshot(client, this.getRealmDefinitions(), refreshedAt);
            return Object.freeze({ status: 'REFRESHED', refreshedAt });
        });
    }

    async list(request = {}) {
        return this.telemetry.measureUseCase({
            operationName: 'leaderboard.list',
            operationType: 'INTERACTIVE'
        }, () => this.listInternal(request));
    }

    async listInternal(request = {}) {
        const pageRequest = normalizePageRequest(request, this.cursorCodec);
        const state = await this.repository.getRefreshState();
        if (!state.refreshedAt) {
            return Object.freeze({ items: Object.freeze([]), nextCursor: null, previousCursor: null, refreshedAt: null });
        }
        if (pageRequest.cursor?.context && pageRequest.cursor.context !== state.refreshedAt) {
            throw new AppError('Leaderboard cursor belongs to an expired snapshot', {
                code: 'LEADERBOARD_CURSOR_STALE'
            });
        }

        const page = await this.repository.listPage(pageRequest);
        const first = page.items[0];
        const last = page.items[page.items.length - 1];
        const direction = pageRequest.cursor?.direction || 'NEXT';
        const nextCursor = last && ((direction === 'NEXT' && page.hasMore) || direction === 'PREVIOUS')
            ? this.cursorCodec.encode({ direction: 'NEXT', sortValue: last.rank, id: last.playerId, context: state.refreshedAt })
            : null;
        const previousCursor = first && ((direction === 'PREVIOUS' && page.hasMore) || Boolean(pageRequest.cursor))
            ? this.cursorCodec.encode({ direction: 'PREVIOUS', sortValue: first.rank, id: first.playerId, context: state.refreshedAt })
            : null;

        return Object.freeze({
            items: Object.freeze(page.items.map((entry) => Object.freeze({
                rank: entry.rank,
                displayName: entry.displayName,
                rebirthCount: entry.rebirthCount,
                realmName: entry.realmName,
                stage: entry.stage
            }))),
            nextCursor,
            previousCursor,
            refreshedAt: state.refreshedAt
        });
    }
}
