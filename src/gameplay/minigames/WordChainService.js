import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import PeriodCounterRepository from '../../repositories/PeriodCounterRepository.js';
import PlayerAccountRepository from '../../repositories/PlayerAccountRepository.js';
import PlayerMapStateRepository from '../../repositories/PlayerMapStateRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';
import ResourceLedgerRepository from '../../repositories/ResourceLedgerRepository.js';
import WordChainRepository from '../../repositories/WordChainRepository.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import WordChainNormalizer from './WordChainNormalizer.js';

const BASIS_POINTS = 10000n;

function multiplyBasisPoints(amount, basisPoints) {
    return ((BigInt(normalizeIntegerAmount(amount)) * BigInt(basisPoints)) / BASIS_POINTS).toString();
}

export default class WordChainService {
    constructor(options = {}) {
        this.unitOfWork = options.unitOfWork;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.repository = options.repository || new WordChainRepository();
        this.accountRepository = options.accountRepository || new PlayerAccountRepository();
        this.mapStateRepository = options.mapStateRepository || new PlayerMapStateRepository();
        this.periodCounterRepository = options.periodCounterRepository || new PeriodCounterRepository();
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
        this.periodKeyService = options.periodKeyService || new PeriodKeyService();
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.normalizer = options.normalizer || new WordChainNormalizer({ rules: this.getRules() });
    }

    getRules() {
        const rules = this.gameDataManager.getCollection('wordChainRules');
        if (!rules) throw new Error('WORD_CHAIN_RULES_NOT_FOUND');
        return rules;
    }

    createSessionView(session, status = session.status) {
        return {
            status,
            sessionId: session.id,
            guildId: session.guildId,
            channelId: session.channelId,
            startedBy: session.startedBy,
            currentWord: session.currentWord,
            requiredPart: session.requiredPart,
            validMoveCount: session.validMoveCount,
            failureCount: session.failureCount,
            maxFailures: this.getRules().sessionPolicy.maxQualifiedFailures,
            participantCount: session.participantCount,
            minimumParticipants: this.getRules().sessionPolicy.minimumDistinctParticipants,
            winnerPlayerId: session.winnerPlayerId,
            rewardAmount: session.rewardAmount,
            outcome: session.outcomeSnapshot,
            startedAt: session.startedAt,
            endedAt: session.endedAt
        };
    }

    async start(guildId, channelId, playerId, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        if (!guildId || !channelId) throw new Error('WORD_CHAIN_GUILD_CHANNEL_REQUIRED');
        if (!options.operationId) throw new Error('WORD_CHAIN_OPERATION_ID_REQUIRED');
        const rules = this.getRules();
        const startedAt = options.startedAt || this.timeProvider.now();
        return this.unitOfWork.execute(async (database) => {
            const replay = await this.repository.findSessionByStartOperation(database, options.operationId);
            if (replay) return { ...this.createSessionView(replay, 'WORD_CHAIN_STARTED'), idempotentReplay: true };

            await this.repository.lockGuild(database, guildId);
            const active = await this.repository.findActiveSessionByGuild(database, guildId, { forUpdate: true });
            if (active) return this.createSessionView(active, 'WORD_CHAIN_ALREADY_ACTIVE');

            await this.accountRepository.ensureGuest(database, playerId);
            const idRange = await this.repository.getWordIdRange(
                database, rules.languageCode, rules.dictionaryRevision
            );
            if (!idRange) throw new Error('WORD_CHAIN_DICTIONARY_EMPTY');
            const seed = options.seed ?? this.seedProvider.nextSeed();
            const width = (idRange.maxId - idRange.minId) + 1n;
            const targetId = idRange.minId + (BigInt(seed) % width);
            let startWord = await this.repository.findStartWordFromId(
                database, rules.languageCode, rules.dictionaryRevision, targetId
            );
            if (!startWord && targetId !== idRange.minId) {
                startWord = await this.repository.findStartWordFromId(
                    database, rules.languageCode, rules.dictionaryRevision, idRange.minId
                );
            }
            if (!startWord) throw new Error('WORD_CHAIN_START_WORD_NOT_FOUND');

            const session = await this.repository.createSession(database, {
                guildId,
                channelId,
                startedBy: playerId,
                operationId: options.operationId,
                rulesRevision: rules.revision,
                dictionaryRevision: rules.dictionaryRevision,
                languageCode: rules.languageCode,
                startWordId: startWord.id,
                startWord: startWord.word,
                requiredPart: startWord.secondPart,
                startedAt
            });
            return { ...this.createSessionView(session, 'WORD_CHAIN_STARTED'), randomSeed: seed };
        });
    }

    async getStatus(guildId, channelId) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        return this.unitOfWork.execute(async (database) => {
            const session = await this.repository.findActiveSessionByGuild(database, guildId);
            return session ? this.createSessionView(session, 'WORD_CHAIN_ACTIVE') : null;
        });
    }

    async listActiveSessions() {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        return this.unitOfWork.execute(async (database) => (
            this.repository.listActiveSessions(database)
        ));
    }

    async stop(guildId, channelId, actorId, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        if (!options.operationId) throw new Error('WORD_CHAIN_OPERATION_ID_REQUIRED');
        const endedAt = options.endedAt || this.timeProvider.now();
        return this.unitOfWork.execute(async (database) => {
            const replay = await this.repository.findSessionByEndOperation(database, options.operationId);
            if (replay) return { ...this.createSessionView(replay, 'WORD_CHAIN_CANCELLED'), idempotentReplay: true };
            await this.repository.lockGuild(database, guildId);
            const session = await this.repository.findActiveSession(
                database, guildId, channelId, { forUpdate: true }
            );
            if (!session) throw new Error('WORD_CHAIN_SESSION_NOT_FOUND');
            if (session.startedBy !== actorId && options.canModerate !== true) {
                throw new Error('WORD_CHAIN_STOP_FORBIDDEN');
            }
            const cancelled = await this.repository.cancelSession(database, {
                sessionId: session.id,
                operationId: options.operationId,
                endedAt
            });
            return this.createSessionView(cancelled, 'WORD_CHAIN_CANCELLED');
        });
    }

    getMapBasePrice(mapId) {
        const entry = this.gameDataManager.getCollection('shopRules')
            ?.pricePolicy?.mapBasePrices?.find((candidate) => candidate.mapId === mapId);
        if (!entry) throw new Error('ECONOMY_MAP_BASE_PRICE_NOT_FOUND');
        return normalizeIntegerAmount(entry.amount);
    }

    async resolveWinnerMap(database, playerId) {
        const state = await this.mapStateRepository.get(database, playerId);
        const maps = Object.values(this.gameDataManager.getCollection('maps') || {});
        const fallback = maps.find((map) => map.isStartingMap) || maps
            .sort((left, right) => left.navigationOrder - right.navigationOrder)[0];
        const mapId = state?.currentMapId || fallback?.id;
        if (!mapId) throw new Error('WORD_CHAIN_WINNER_MAP_NOT_FOUND');
        return this.gameDataManager.requireRecord('maps', mapId);
    }

    calculateReward(mapBasePrice, validMoveCount) {
        const policy = this.getRules().rewardPolicy;
        const steps = Math.floor(validMoveCount / policy.stepEveryValidMoves);
        const multiplier = Math.min(
            policy.maximumMultiplierBasisPoints,
            policy.baseMultiplierBasisPoints + (steps * policy.stepMultiplierBasisPoints)
        );
        return { amount: multiplyBasisPoints(mapBasePrice, multiplier), multiplierBasisPoints: multiplier };
    }

    async settle(database, session, operationId, participantCount, endedAt) {
        const rules = this.getRules();
        const hasEnoughParticipants = participantCount >= rules.sessionPolicy.minimumDistinctParticipants;
        const winnerPlayerId = hasEnoughParticipants ? session.lastSuccessPlayerId : null;
        let rewardAmount = '0';
        let balance = null;
        let rewardStatus = winnerPlayerId ? 'ELIGIBLE' : 'NO_ELIGIBLE_WINNER';
        let mapId = null;
        let mapName = null;
        let multiplierBasisPoints = 0;
        let periodKey = null;

        if (winnerPlayerId) {
            const winnerMap = await this.resolveWinnerMap(database, winnerPlayerId);
            mapId = winnerMap.id;
            mapName = winnerMap.name;
            const reward = this.calculateReward(this.getMapBasePrice(winnerMap.id), session.validMoveCount);
            multiplierBasisPoints = reward.multiplierBasisPoints;
            periodKey = this.periodKeyService.getKey(rules.rewardPolicy.periodType, endedAt);
            try {
                await this.periodCounterRepository.incrementWithinLimit(database, {
                    playerId: winnerPlayerId,
                    counterType: 'WORD_CHAIN_REWARD',
                    subjectId: rules.revision,
                    periodType: rules.rewardPolicy.periodType,
                    periodKey,
                    increment: 1,
                    limit: rules.rewardPolicy.periodLimit,
                    errorCode: 'WORD_CHAIN_DAILY_REWARD_LIMIT'
                });
                rewardAmount = reward.amount;
                balance = await this.walletRepository.credit(database, {
                    playerId: winnerPlayerId,
                    currencyId: rules.rewardPolicy.currencyId,
                    amount: rewardAmount
                });
                await this.resourceLedgerRepository.record(database, {
                    playerId: winnerPlayerId,
                    resourceType: 'CURRENCY',
                    resourceId: rules.rewardPolicy.currencyId,
                    delta: rewardAmount,
                    balanceAfter: balance,
                    reason: 'WORD_CHAIN_WIN_REWARD',
                    referenceType: 'WORD_CHAIN_SESSION',
                    referenceId: session.id,
                    operationId,
                    createdAt: endedAt
                });
                rewardStatus = 'REWARDED';
            } catch (error) {
                if (error?.message !== 'WORD_CHAIN_DAILY_REWARD_LIMIT') throw error;
                rewardStatus = 'DAILY_LIMIT_REACHED';
            }
        }

        const outcomeSnapshot = {
            reason: 'QUALIFIED_FAILURE_LIMIT',
            winnerPlayerId,
            participantCount,
            validMoveCount: session.validMoveCount,
            failureCount: session.failureCount,
            rewardStatus,
            rewardAmount,
            currencyId: rules.rewardPolicy.currencyId,
            multiplierBasisPoints,
            mapId,
            mapName,
            periodKey,
            balance
        };
        const settled = await this.repository.settleSession(database, {
            sessionId: session.id,
            operationId,
            winnerPlayerId,
            rewardAmount,
            outcomeSnapshot,
            participantCount,
            endedAt
        });
        return { session: settled, outcomeSnapshot };
    }

    async submit(guildId, channelId, playerId, input, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        if (!options.operationId) throw new Error('WORD_CHAIN_OPERATION_ID_REQUIRED');
        const parsed = this.normalizer.parse(input);
        if (!parsed) {
            return this.unitOfWork.execute(async (database) => {
                const session = await this.repository.findActiveSession(
                    database, guildId, channelId
                );
                if (!session) return { status: 'WORD_CHAIN_IGNORED_NO_SESSION' };
                return {
                    status: 'WORD_CHAIN_IGNORED_INVALID_INPUT',
                    sessionId: session.id,
                    currentWord: session.currentWord,
                    requiredPart: session.requiredPart
                };
            });
        }
        const rules = this.getRules();
        const createdAt = options.createdAt || this.timeProvider.now();

        return this.unitOfWork.execute(async (database) => {
            let replay = await this.repository.findMoveByOperation(database, options.operationId);
            if (replay) return { ...replay.result, idempotentReplay: true };
            const session = await this.repository.findActiveSession(
                database, guildId, channelId, { forUpdate: true }
            );
            if (!session) return { status: 'WORD_CHAIN_IGNORED_NO_SESSION' };
            replay = await this.repository.findMoveByOperation(database, options.operationId);
            if (replay) return { ...replay.result, idempotentReplay: true };

            const word = await this.repository.findWord(
                database, rules.languageCode, session.dictionaryRevision, parsed.normalizedWord
            );
            if (rules.inputPolicy.disallowConsecutiveSuccessfulPlayer
                && session.lastSuccessPlayerId === playerId) {
                return {
                    status: 'WORD_CHAIN_WAIT_OTHER_PLAYER',
                    sessionId: session.id,
                    currentWord: session.currentWord,
                    requiredPart: session.requiredPart
                };
            }

            await this.accountRepository.ensureGuest(database, playerId);
            const used = word ? await this.repository.hasUsedWord(
                database, session.id, session.startWordId, word.normalizedWord
            ) : false;
            const isCorrect = Boolean(word)
                && word.firstPart === session.requiredPart
                && !used;
            const outcome = isCorrect ? 'VALID' : 'QUALIFIED_FAILURE';
            const failureReason = isCorrect
                ? null
                : !word
                    ? 'NOT_IN_DICTIONARY'
                    : used
                        ? 'WORD_ALREADY_USED'
                        : 'WRONG_LINK';
            const moveId = await this.repository.recordMove(database, {
                sessionId: session.id,
                sequenceNo: session.attemptCount + 1,
                operationId: options.operationId,
                playerId,
                wordId: word?.id || null,
                submittedText: String(input).slice(0, rules.inputPolicy.maxLength),
                normalizedWord: word?.normalizedWord || parsed.normalizedWord,
                firstPart: word?.firstPart || parsed.firstPart,
                secondPart: word?.secondPart || parsed.secondPart,
                outcome,
                failureReason,
                createdAt
            });
            const participantCount = await this.repository.countParticipants(database, session.id);

            if (isCorrect) {
                const updated = await this.repository.applyValidMove(database, {
                    sessionId: session.id,
                    wordId: word.id,
                    word: word?.word || parsed.normalizedWord,
                    requiredPart: word.secondPart,
                    playerId,
                    participantCount,
                    updatedAt: createdAt
                });
                const result = {
                    status: 'WORD_CHAIN_VALID_MOVE',
                    sessionId: updated.id,
                    word: word?.word || parsed.normalizedWord,
                    requiredPart: updated.requiredPart,
                    validMoveCount: updated.validMoveCount,
                    failureCount: updated.failureCount,
                    maxFailures: rules.sessionPolicy.maxQualifiedFailures,
                    participantCount
                };
                await this.repository.updateMoveResult(database, moveId, result);
                return result;
            }

            let updated = await this.repository.applyFailure(database, {
                sessionId: session.id,
                participantCount,
                updatedAt: createdAt
            });
            if (updated.failureCount < rules.sessionPolicy.maxQualifiedFailures) {
                const result = {
                    status: 'WORD_CHAIN_QUALIFIED_FAILURE',
                    sessionId: updated.id,
                    word: word?.word || parsed.normalizedWord,
                    failureReason,
                    currentWord: updated.currentWord,
                    requiredPart: updated.requiredPart,
                    validMoveCount: updated.validMoveCount,
                    failureCount: updated.failureCount,
                    maxFailures: rules.sessionPolicy.maxQualifiedFailures,
                    participantCount
                };
                await this.repository.updateMoveResult(database, moveId, result);
                return result;
            }

            const settlement = await this.settle(
                database, updated, options.operationId, participantCount, createdAt
            );
            updated = settlement.session;
            const result = {
                status: 'WORD_CHAIN_SETTLED',
                sessionId: updated.id,
                word: word?.word || parsed.normalizedWord,
                failureReason,
                currentWord: updated.currentWord,
                requiredPart: updated.requiredPart,
                validMoveCount: updated.validMoveCount,
                failureCount: updated.failureCount,
                maxFailures: rules.sessionPolicy.maxQualifiedFailures,
                participantCount,
                winnerPlayerId: updated.winnerPlayerId,
                rewardAmount: updated.rewardAmount,
                outcome: settlement.outcomeSnapshot
            };
            await this.repository.updateMoveResult(database, moveId, result);
            return result;
        });
    }
}
