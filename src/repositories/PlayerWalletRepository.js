import {
    compareIntegerAmounts,
    isPositiveIntegerAmount,
    normalizeIntegerAmount
} from '../shared/numeric/IntegerAmount.js';

const LEGACY_CURRENCY_COLUMNS = Object.freeze({
    SPIRIT_STONE: 'spirit_stones',
    SECT_POINT: 'sect_points',
    HONOR: 'honor_points',
    EVENT_POINT: 'event_points'
});

function assertNonNegative(amount) {
    if (compareIntegerAmounts(amount, 0) < 0) {
        throw new Error('NEGATIVE_CURRENCY_AMOUNT');
    }
}

export default class PlayerWalletRepository {
    async ensureWallet(client, playerId, currencyId) {
        const result = await client.query(
            `INSERT INTO player_wallets (player_id, currency_id, amount)
             SELECT id, $2, 0
             FROM players
             WHERE id = $1
             ON CONFLICT (player_id, currency_id) DO NOTHING
             RETURNING amount`,
            [playerId, currencyId]
        );

        if (!result.rowCount) {
            const existing = await client.query(
                `SELECT amount
                 FROM player_wallets
                 WHERE player_id = $1 AND currency_id = $2`,
                [playerId, currencyId]
            );
            if (!existing.rowCount) throw new Error('PLAYER_NOT_FOUND');
        }
    }

    async lockPlayer(client, playerId) {
        const result = await client.query(
            `SELECT id FROM players WHERE id = $1 FOR UPDATE`,
            [playerId]
        );
        if (!result.rowCount) throw new Error('PLAYER_NOT_FOUND');
    }

    async debit(client, payload) {
        const amount = normalizeIntegerAmount(payload.amount || 0);
        assertNonNegative(amount);
        await this.lockPlayer(client, payload.playerId);
        await this.ensureWallet(client, payload.playerId, payload.currencyId);

        if (!isPositiveIntegerAmount(amount)) {
            return this.getBalance(client, payload.playerId, payload.currencyId, true);
        }

        const result = await client.query(
            `UPDATE player_wallets
             SET amount = amount - $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE player_id = $1
               AND currency_id = $2
               AND amount >= $3
             RETURNING amount`,
            [payload.playerId, payload.currencyId, amount]
        );
        if (!result.rowCount) throw new Error('INSUFFICIENT_CURRENCY');

        const balance = normalizeIntegerAmount(result.rows[0].amount);
        await this.syncLegacyBalance(client, payload.playerId, payload.currencyId, balance);
        return balance;
    }

    async credit(client, payload) {
        const amount = normalizeIntegerAmount(payload.amount || 0);
        assertNonNegative(amount);
        await this.lockPlayer(client, payload.playerId);
        await this.ensureWallet(client, payload.playerId, payload.currencyId);

        if (!isPositiveIntegerAmount(amount)) {
            return this.getBalance(client, payload.playerId, payload.currencyId, true);
        }

        const result = await client.query(
            `UPDATE player_wallets
             SET amount = amount + $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE player_id = $1 AND currency_id = $2
             RETURNING amount`,
            [payload.playerId, payload.currencyId, amount]
        );
        const balance = normalizeIntegerAmount(result.rows[0].amount);
        await this.syncLegacyBalance(client, payload.playerId, payload.currencyId, balance);
        return balance;
    }

    async getBalance(client, playerId, currencyId, forUpdate = false) {
        const result = await client.query(
            `SELECT amount
             FROM player_wallets
             WHERE player_id = $1 AND currency_id = $2${forUpdate ? ' FOR UPDATE' : ''}`,
            [playerId, currencyId]
        );
        if (!result.rowCount) return '0';
        return normalizeIntegerAmount(result.rows[0].amount);
    }

    async listBalances(database, playerId) {
        const result = await database.query(
            `SELECT currency_id, amount
             FROM player_wallets
             WHERE player_id = $1
             ORDER BY currency_id`,
            [playerId]
        );
        return Object.fromEntries(result.rows.map((row) => [
            row.currency_id,
            normalizeIntegerAmount(row.amount)
        ]));
    }

    async syncLegacyBalance(client, playerId, currencyId, balance) {
        const column = LEGACY_CURRENCY_COLUMNS[currencyId];
        if (!column) return;

        await client.query(
            `UPDATE players SET ${column} = $1 WHERE id = $2`,
            [balance, playerId]
        );
    }
}
