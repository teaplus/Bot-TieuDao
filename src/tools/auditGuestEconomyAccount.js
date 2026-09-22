import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pool from '../database/postgres.js';
import PlayerAccountRepository from '../repositories/PlayerAccountRepository.js';
import PlayerAccountService from '../gameplay/economy/PlayerAccountService.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import PlayerWalletRepository from '../repositories/PlayerWalletRepository.js';

const playerId = 'audit-guest-economy-account';
const client = await pool.connect();
try {
    await client.query('BEGIN');
    await client.query('DELETE FROM players WHERE id = $1', [playerId]);

    const accountRepository = new PlayerAccountRepository();
    const runtimeRepository = new PlayerRuntimeRepository();
    const walletRepository = new PlayerWalletRepository();
    const guest = await accountRepository.ensureGuest(client, playerId);
    assert.equal(guest.accountStatus, 'GUEST');
    assert.equal(guest.created, true);
    assert.equal(await runtimeRepository.findById(playerId, { client }), null);

    const guestRuntime = await runtimeRepository.findById(playerId, {
        client,
        includeGuest: true,
        forUpdate: true
    });
    assert.equal(guestRuntime.accountStatus, 'GUEST');
    assert.equal(guestRuntime.currencies.SPIRIT_STONE, '0');

    const guestBalance = await walletRepository.credit(client, {
        playerId,
        currencyId: 'SPIRIT_STONE',
        amount: '500'
    });
    assert.equal(guestBalance, '500');

    const accountService = new PlayerAccountService({
        unitOfWork: { async execute(work) { return work(client); } },
        repository: accountRepository,
        walletRepository
    });
    const balanceView = await accountService.getSpiritStoneBalance(playerId);
    assert.equal(balanceView.accountStatus, 'GUEST');
    assert.equal(balanceView.balance, '500');

    await runtimeRepository.createPlayer(playerId, {
        name: 'Thanh Hư Tử',
        realmId: 1,
        realmStage: 1,
        baseStats: { atk: '40', def: '20', hp: '200', spd: '5' },
        spiritRootId: 'FIRE_ROOT',
        spiritRootQualityTierId: 'LOW_GRADE',
        spiritualRoot: 'Hỏa Linh Căn',
        cultivationArtId: 'CP_NEUTRAL_HOANG',
        spiritStones: '100',
        creationRerollsUsed: 0,
        creationRuleRevision: 1,
        starterRecipeIds: [],
        currentMapId: 'THANH_VAN_SON_MACH',
        starterCultivationArtItem: null,
        starterEquipment: {
            itemId: 'EQ_FIRE_WEAPON',
            rarity: 'COMMON',
            grade: 'HOANG',
            gradeQuality: 'LOW',
            fixedEffects: [],
            affixes: [],
            elementIds: ['FIRE'],
            generatedName: 'Audit Kiếm',
            equipmentType: 'WEAPON',
            equippedSlot: 'WEAPON'
        }
    }, { client });

    const registered = await runtimeRepository.findById(playerId, { client, forUpdate: true });
    assert.equal(registered.accountStatus, 'REGISTERED');
    assert.equal(registered.name, 'Thanh Hư Tử');
    assert.equal(registered.currencies.SPIRIT_STONE, '600');
    const ensuredAgain = await accountRepository.ensureGuest(client, playerId);
    assert.equal(ensuredAgain.accountStatus, 'REGISTERED');
    assert.equal(ensuredAgain.created, false);
    await assert.rejects(
        () => runtimeRepository.createPlayer(playerId, {
            name: 'Duplicate', realmId: 1, realmStage: 1,
            baseStats: { atk: 1, def: 1, hp: 1, spd: 1 },
            spiritRootId: 'FIRE_ROOT', spiritRootQualityTierId: 'LOW_GRADE',
            spiritualRoot: 'Hỏa Linh Căn', cultivationArtId: 'CP_NEUTRAL_HOANG',
            spiritStones: 100, creationRerollsUsed: 0, creationRuleRevision: 1,
            starterRecipeIds: [], currentMapId: 'THANH_VAN_SON_MACH',
            starterCultivationArtItem: null, starterEquipment: {
                itemId: 'EQ_FIRE_WEAPON', rarity: 'COMMON', fixedEffects: [], affixes: [],
                elementIds: [], equipmentType: 'WEAPON', equippedSlot: 'WEAPON'
            }
        }, { client }),
        (error) => error?.code === '23505'
    );

    const migration = fs.readFileSync(
        new URL('../database/migrations/038_guest_economy_accounts.sql', import.meta.url),
        'utf8'
    );
    assert(migration.includes("account_status IN ('GUEST', 'REGISTERED')"));
    assert(migration.includes("account_status = 'GUEST' AND character_registered_at IS NULL"));
    for (const relativePath of [
        '../message-commands/economy/daily.js',
        '../message-commands/economy/work.js',
        '../message-commands/minigames/slot.js',
        '../message-commands/minigames/highlow.js'
    ]) {
        const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
        assert(source.includes('playerAccountService.ensureGuest(message.author.id)'));
    }
    const balanceCommandSource = fs.readFileSync(
        new URL('../message-commands/economy/balance.js', import.meta.url),
        'utf8'
    );
    assert(balanceCommandSource.includes('getSpiritStoneBalance(message.author.id)'));
    const wordChainServiceSource = fs.readFileSync(
        new URL('../gameplay/minigames/WordChainService.js', import.meta.url),
        'utf8'
    );
    assert(wordChainServiceSource.includes('accountRepository.ensureGuest(database, playerId)'));
    const leaderboardSource = fs.readFileSync(
        new URL('../repositories/CultivationLeaderboardRepository.js', import.meta.url),
        'utf8'
    );
    assert(leaderboardSource.includes("WHERE player.account_status = 'REGISTERED'"));

    await client.query('ROLLBACK');
    console.log(JSON.stringify({
        status: 'PASS',
        guestHiddenFromGameplay: true,
        guestEconomyBalance: '500',
        registeredBalanceAfterStarterGift: registered.currencies.SPIRIT_STONE,
        duplicateRegistrationBlocked: true,
        economyCommands: ['balance', 'daily', 'work', 'slot', 'highlow', 'noitu'],
        databaseVerification: 'TRANSACTION_ROLLED_BACK'
    }, null, 2));
} catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
} finally {
    client.release();
    await pool.end();
}
