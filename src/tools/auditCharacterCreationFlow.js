import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import PlayerStartService from '../gameplay/player/PlayerStartService.js';
import {
    createCharacterCreationPayload,
    createCharacterCreationSuccessPayload,
    createDaoNameModal
} from '../application/discord/CharacterCreationPresentation.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
let randomCalls = 0;
let createdPayload = null;
const randomValues = [
    0.01, 0.01,
    0.11, 0.20,
    0.25, 0.35,
    0.40, 0.50,
    0.60, 0.65,
    0.85, 0.90
];
const service = new PlayerStartService({
    gameDataManager,
    random: () => {
        randomCalls += 1;
        return randomValues.shift();
    },
    playerRuntimeRepository: {
        async findById() {
            return null;
        },
        async createPlayer(_playerId, payload) {
            createdPayload = payload;
        }
    }
});
const rules = service.getRules();
assert(rules.maxRerolls === 5, 'Creation GameData must allow exactly five rerolls');
assert(rules.sessionTtlSeconds === 300, 'Creation session TTL must be data-driven');
assert(rules.starterRecipeIds.length === 2
    && rules.starterRecipeIds.includes('CRAFT_BREAKTHROUGH_PILL')
    && rules.starterRecipeIds.includes('CRAFT_SPIRIT_GATHERING_PILL'),
'Creation GameData must grant both approved starter pill recipes');

const draws = Array.from({ length: rules.maxRerolls + 1 }, () => service.rollDestiny());
assert(draws.length === 6 && randomCalls === 12, 'Initial draw plus five rerolls is not exact');
const finalDestiny = draws.at(-1);
const callsBeforeConfirm = randomCalls;
const result = await service.startPlayer('creation-audit', '  Vân   Du  ', {
    destiny: finalDestiny,
    rerollsUsed: 5
});
assert(randomCalls === callsBeforeConfirm, 'Confirm must not reroll the previewed destiny');
assert(result.daoName === 'Vân Du' && createdPayload.name === 'Vân Du',
    'Dao name was not normalized');
assert(createdPayload.spiritRootId === finalDestiny.spiritRootId
    && createdPayload.spiritRootQualityTierId === finalDestiny.spiritRootQualityTierId,
'Persisted destiny does not match the final preview');
assert(createdPayload.creationRerollsUsed === 5
    && createdPayload.creationRuleRevision === rules.revision,
'Creation audit snapshot is missing');
assert(createdPayload.starterRecipeIds.length === 2
    && createdPayload.starterRecipeIds.includes('CRAFT_BREAKTHROUGH_PILL')
    && createdPayload.starterRecipeIds.includes('CRAFT_SPIRIT_GATHERING_PILL'),
'Starter recipe ownership is missing from the atomic creation payload');
assert(result.starterRecipes.some((recipe) => recipe.id === 'CRAFT_BREAKTHROUGH_PILL')
    && result.starterRecipes.some((recipe) => recipe.id === 'CRAFT_SPIRIT_GATHERING_PILL'),
'Starter recipes are missing from the creation result');

for (const invalidName of ['', 'A', '@everyone', 'Đạo_Hữu', 'Tên\nKhác']) {
    let rejected = false;
    try {
        service.validateDaoName(invalidName);
    } catch {
        rejected = true;
    }
    assert(rejected, `Invalid Dao name was accepted: ${JSON.stringify(invalidName)}`);
}

const state = {
    daoName: result.daoName,
    destiny: finalDestiny,
    rerollsUsed: 5,
    showOdds: true,
    odds: service.getCreationOdds()
};
const payload = createCharacterCreationPayload(state, 'audit-session', rules);
assert(!payload.embeds, 'Character creation must use message content, not an embed');
assert(payload.components[0].components.length === 5, 'Creation action row must expose five actions');
assert(payload.components[0].components[0].data.disabled === true,
    'Reroll button must be disabled after five rerolls');
assert(payload.content.includes('%') && !payload.content.includes('+0.'),
    'Effect/odds presentation must use percentages');
const successPayload = createCharacterCreationSuccessPayload(
    state,
    result,
    'audit-session',
    rules
);
assert(successPayload.content.includes(result.starterRecipes[0].name),
    'Creation success message must display the granted starter recipe');
const modal = createDaoNameModal('audit-session', rules);
assert(modal.data.title === 'Khai mở đạo đồ', 'Dao name modal is missing');

const commandSource = fs.readFileSync(
    new URL('../commands/player/start.js', import.meta.url),
    'utf8'
);
const repositorySource = fs.readFileSync(
    new URL('../repositories/PlayerRuntimeRepository.js', import.meta.url),
    'utf8'
);
const migrationSource = fs.readFileSync(
    new URL('../database/migrations/027_character_creation_snapshot.sql', import.meta.url),
    'utf8'
);
const starterRecipeMigrationSource = fs.readFileSync(
    new URL('../database/migrations/029_starter_alchemy_recipes.sql', import.meta.url),
    'utf8'
);
const spiritGatheringMigrationSource = fs.readFileSync(
    new URL('../database/migrations/030_starter_spirit_gathering_recipe.sql', import.meta.url),
    'utf8'
);
assert(!commandSource.includes('EmbedBuilder'), '/start still depends on EmbedBuilder');
assert(commandSource.includes('showModal') && commandSource.includes('awaitModalSubmit'),
    '/start does not implement modal collection');
assert(repositorySource.includes('INSERT INTO player_learned_recipes')
    && repositorySource.includes('CHARACTER_CREATION'),
'Player creation transaction does not persist starter recipe ownership');
assert(migrationSource.includes('creation_rerolls_used')
    && migrationSource.includes('creation_rule_revision'),
'Character creation migration does not persist audit fields');
assert(starterRecipeMigrationSource.includes('CRAFT_BREAKTHROUGH_PILL')
    && starterRecipeMigrationSource.includes('ON CONFLICT'),
'Starter recipe backfill must be explicit and idempotent');
assert(spiritGatheringMigrationSource.includes('CRAFT_SPIRIT_GATHERING_PILL')
    && spiritGatheringMigrationSource.includes('ON CONFLICT'),
'Tụ Linh Đan recipe backfill must be explicit and idempotent');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        initialDraws: 1,
        maxRerolls: rules.maxRerolls,
        exactPreviewPersisted: true,
        daoName: result.daoName,
        messageOnly: true,
        starterRecipes: result.starterRecipes.map((recipe) => recipe.id)
    }
}, null, 2));
