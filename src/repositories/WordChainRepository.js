function mapWord(row) {
    if (!row) return null;
    return {
        id: String(row.id),
        word: row.word,
        normalizedWord: row.normalized_word,
        firstPart: row.first_part,
        secondPart: row.second_part,
        dictionaryRevision: row.dictionary_revision
    };
}

function mapSession(row) {
    if (!row) return null;
    return {
        id: String(row.id),
        guildId: row.guild_id,
        channelId: row.channel_id,
        startedBy: row.started_by,
        startOperationId: row.start_operation_id,
        endOperationId: row.end_operation_id,
        status: row.status,
        rulesRevision: row.rules_revision,
        dictionaryRevision: row.dictionary_revision,
        languageCode: row.language_code,
        startWordId: String(row.start_word_id),
        currentWordId: String(row.current_word_id),
        currentWord: row.current_word_snapshot,
        requiredPart: row.required_part,
        lastSuccessPlayerId: row.last_success_player_id,
        attemptCount: Number(row.attempt_count),
        validMoveCount: Number(row.valid_move_count),
        failureCount: Number(row.failure_count),
        participantCount: Number(row.participant_count),
        winnerPlayerId: row.winner_player_id,
        rewardAmount: String(row.reward_amount),
        outcomeSnapshot: row.outcome_snapshot,
        startedAt: row.started_at,
        updatedAt: row.updated_at,
        endedAt: row.ended_at
    };
}

export default class WordChainRepository {
    async lockGuild(database, guildId) {
        await database.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [`WORD_CHAIN:${guildId}`]
        );
    }

    async getWordIdRange(database, languageCode, dictionaryRevision) {
        const result = await database.query(
            `SELECT MIN(id) AS min_id, MAX(id) AS max_id
             FROM words
             WHERE lang_code = $1 AND dictionary_revision = $2`,
            [languageCode, dictionaryRevision]
        );
        if (result.rows[0].min_id == null) return null;
        return {
            minId: BigInt(result.rows[0].min_id),
            maxId: BigInt(result.rows[0].max_id)
        };
    }

    async findStartWordFromId(database, languageCode, dictionaryRevision, startId) {
        const result = await database.query(
            `SELECT id, word, normalized_word, first_part, second_part, dictionary_revision
             FROM words current_word
             WHERE current_word.lang_code = $1
               AND current_word.dictionary_revision = $2
               AND current_word.id >= $3
               AND EXISTS (
                   SELECT 1 FROM words next_word
                   WHERE next_word.lang_code = current_word.lang_code
                     AND next_word.dictionary_revision = current_word.dictionary_revision
                     AND next_word.first_part = current_word.second_part
                     AND next_word.id <> current_word.id
               )
             ORDER BY current_word.id
             LIMIT 1`,
            [languageCode, dictionaryRevision, String(startId)]
        );
        return mapWord(result.rows[0]);
    }

    async findWord(database, languageCode, dictionaryRevision, normalizedWord) {
        const result = await database.query(
            `SELECT id, word, normalized_word, first_part, second_part, dictionary_revision
             FROM words
             WHERE lang_code = $1 AND dictionary_revision = $2 AND normalized_word = $3`,
            [languageCode, dictionaryRevision, normalizedWord]
        );
        return mapWord(result.rows[0]);
    }

    async findSessionByStartOperation(database, operationId) {
        const result = await database.query(
            'SELECT * FROM word_chain_sessions WHERE start_operation_id = $1',
            [operationId]
        );
        return mapSession(result.rows[0]);
    }

    async findSessionByEndOperation(database, operationId) {
        const result = await database.query(
            'SELECT * FROM word_chain_sessions WHERE end_operation_id = $1',
            [operationId]
        );
        return mapSession(result.rows[0]);
    }

    async findActiveSession(database, guildId, channelId, options = {}) {
        const result = await database.query(
            `SELECT * FROM word_chain_sessions
             WHERE guild_id = $1 AND channel_id = $2 AND status = 'ACTIVE'
             ${options.forUpdate ? 'FOR UPDATE' : ''}`,
            [guildId, channelId]
        );
        return mapSession(result.rows[0]);
    }

    async findActiveSessionByGuild(database, guildId, options = {}) {
        const result = await database.query(
            `SELECT * FROM word_chain_sessions
             WHERE guild_id = $1 AND status = 'ACTIVE'
             ${options.forUpdate ? 'FOR UPDATE' : ''}`,
            [guildId]
        );
        return mapSession(result.rows[0]);
    }

    async listActiveSessions(database) {
        const result = await database.query(
            `SELECT * FROM word_chain_sessions
             WHERE status = 'ACTIVE'
             ORDER BY guild_id, channel_id`
        );
        return result.rows.map(mapSession);
    }

    async createSession(database, payload) {
        const result = await database.query(
            `INSERT INTO word_chain_sessions (
                guild_id, channel_id, started_by, start_operation_id,
                rules_revision, dictionary_revision, language_code,
                start_word_id, current_word_id, current_word_snapshot,
                required_part, started_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $11)
             RETURNING *`,
            [
                payload.guildId, payload.channelId, payload.startedBy, payload.operationId,
                payload.rulesRevision, payload.dictionaryRevision, payload.languageCode,
                payload.startWordId, payload.startWord, payload.requiredPart, payload.startedAt
            ]
        );
        return mapSession(result.rows[0]);
    }

    async findMoveByOperation(database, operationId) {
        const result = await database.query(
            `SELECT id, session_id, result_snapshot
             FROM word_chain_moves WHERE operation_id = $1`,
            [operationId]
        );
        if (!result.rowCount) return null;
        return {
            moveId: String(result.rows[0].id),
            sessionId: String(result.rows[0].session_id),
            result: result.rows[0].result_snapshot
        };
    }

    async hasUsedWord(database, sessionId, startWordId, normalizedWord) {
        const result = await database.query(
            `SELECT EXISTS (
                SELECT 1 FROM words WHERE id = $2 AND normalized_word = $3
                UNION ALL
                SELECT 1 FROM word_chain_moves
                WHERE session_id = $1 AND normalized_word = $3 AND outcome = 'VALID'
             ) AS used`,
            [sessionId, startWordId, normalizedWord]
        );
        return Boolean(result.rows[0].used);
    }

    async recordMove(database, payload) {
        const result = await database.query(
            `INSERT INTO word_chain_moves (
                session_id, sequence_no, operation_id, player_id, word_id,
                submitted_text, normalized_word, first_part, second_part,
                outcome, failure_reason, result_snapshot, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{}'::jsonb, $12)
             RETURNING id`,
            [
                payload.sessionId, payload.sequenceNo, payload.operationId, payload.playerId,
                payload.wordId, payload.submittedText, payload.normalizedWord,
                payload.firstPart, payload.secondPart, payload.outcome,
                payload.failureReason || null, payload.createdAt
            ]
        );
        return String(result.rows[0].id);
    }

    async updateMoveResult(database, moveId, resultSnapshot) {
        await database.query(
            'UPDATE word_chain_moves SET result_snapshot = $2::jsonb WHERE id = $1',
            [moveId, JSON.stringify(resultSnapshot)]
        );
    }

    async countParticipants(database, sessionId) {
        const result = await database.query(
            `SELECT COUNT(DISTINCT player_id)::int AS count
             FROM word_chain_moves WHERE session_id = $1`,
            [sessionId]
        );
        return Number(result.rows[0].count);
    }

    async applyValidMove(database, payload) {
        const result = await database.query(
            `UPDATE word_chain_sessions
             SET current_word_id = $2,
                 current_word_snapshot = $3,
                 required_part = $4,
                 last_success_player_id = $5,
                 attempt_count = attempt_count + 1,
                 valid_move_count = valid_move_count + 1,
                 participant_count = $6,
                 updated_at = $7
             WHERE id = $1 AND status = 'ACTIVE'
             RETURNING *`,
            [
                payload.sessionId, payload.wordId, payload.word,
                payload.requiredPart, payload.playerId, payload.participantCount, payload.updatedAt
            ]
        );
        if (!result.rowCount) throw new Error('WORD_CHAIN_SESSION_NOT_ACTIVE');
        return mapSession(result.rows[0]);
    }

    async applyFailure(database, payload) {
        const result = await database.query(
            `UPDATE word_chain_sessions
             SET attempt_count = attempt_count + 1,
                 failure_count = failure_count + 1,
                 participant_count = $2,
                 updated_at = $3
             WHERE id = $1 AND status = 'ACTIVE'
             RETURNING *`,
            [payload.sessionId, payload.participantCount, payload.updatedAt]
        );
        if (!result.rowCount) throw new Error('WORD_CHAIN_SESSION_NOT_ACTIVE');
        return mapSession(result.rows[0]);
    }

    async settleSession(database, payload) {
        const result = await database.query(
            `UPDATE word_chain_sessions
             SET status = 'SETTLED',
                 end_operation_id = $2,
                 winner_player_id = $3,
                 reward_amount = $4,
                 outcome_snapshot = $5::jsonb,
                 participant_count = $6,
                 ended_at = $7,
                 updated_at = $7
             WHERE id = $1 AND status = 'ACTIVE'
             RETURNING *`,
            [
                payload.sessionId, payload.operationId, payload.winnerPlayerId,
                payload.rewardAmount, JSON.stringify(payload.outcomeSnapshot),
                payload.participantCount, payload.endedAt
            ]
        );
        if (!result.rowCount) throw new Error('WORD_CHAIN_SESSION_NOT_ACTIVE');
        return mapSession(result.rows[0]);
    }

    async cancelSession(database, payload) {
        const outcome = { reason: 'MANUAL_STOP', rewardAmount: '0' };
        const result = await database.query(
            `UPDATE word_chain_sessions
             SET status = 'CANCELLED',
                 end_operation_id = $2,
                 reward_amount = 0,
                 outcome_snapshot = $3::jsonb,
                 ended_at = $4,
                 updated_at = $4
             WHERE id = $1 AND status = 'ACTIVE'
             RETURNING *`,
            [payload.sessionId, payload.operationId, JSON.stringify(outcome), payload.endedAt]
        );
        if (!result.rowCount) throw new Error('WORD_CHAIN_SESSION_NOT_ACTIVE');
        return mapSession(result.rows[0]);
    }
}
