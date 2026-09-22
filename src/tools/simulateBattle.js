import BattleEngine from '../battle/BattleEngine.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ItemFactory from '../factories/ItemFactory.js';
import ItemGenerator from '../factories/ItemGenerator.js';
import MonsterGeneratorService from '../gameplay/monsters/MonsterGeneratorService.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import createSeededRandom from '../platform/random/createSeededRandom.js';

const SUPPORTED_ELEMENTS = new Set(['FIRE', 'WOOD', 'EARTH', 'METAL', 'WATER', 'LIGHTNING', 'ICE']);

function parseArgs(argv) {
    const args = {};

    for (const arg of argv) {
        const [key, value] = arg.replace(/^--/, '').split('=');
        args[key] = value ?? true;
    }

    return args;
}

function normalizeElement(element = 'FIRE') {
    const normalizedElement = String(element || 'FIRE').toUpperCase();

    if (!SUPPORTED_ELEMENTS.has(normalizedElement)) {
        throw new Error(`UNSUPPORTED_SIM_ELEMENT:${normalizedElement}`);
    }

    return normalizedElement;
}

function createRuntimePlayer(options = {}) {
    const element = normalizeElement(options.element);
    const starterTemplate = ItemFactory.getTemplate(`EQ_${element}_WEAPON`);
    const starterEquipment = ItemGenerator.rollEquipment(starterTemplate, 'UNCOMMON', {
        grade: 'HOANG',
        gradeQuality: 'LOW'
    });

    return new RuntimePlayerFactory().create({
        playerId: 'sim-player',
        name: 'Simulator',
        realmId: 1,
        cultivationArtId: `CP_${element}_HOANG`,
        spiritualRoot: element,
        spiritStones: 0,
        cultivation: 0,
        baseAtk: 60,
        baseDef: 20,
        baseHp: 220,
        baseSpd: 8,
        lastCultivate: new Date(),
        inventory: [
            {
                instanceId: 'sim-eq-1',
                itemId: `EQ_${element}_WEAPON`,
                quantity: 1,
                rarity: 'UNCOMMON',
                equippedSlot: 'weapon',
                instanceData: {
                    fixedEffects: starterEquipment.fixedEffects,
                    grade: starterEquipment.grade,
                    gradeQuality: starterEquipment.gradeQuality,
                    affixes: [
                        {
                            stat: 'ATK',
                            mode: 'add_percent_base',
                            value: 0.1
                        }
                    ]
                }
            }
        ],
        skillIds: [`SK_${element}_HOANG`],
        cultivationArtIds: [`CP_${element}_HOANG`]
    });
}

function summarize(result) {
    return {
        battleId: result.battleId,
        winnerTeam: result.winnerTeam,
        rounds: result.rounds,
        turns: result.turns,
        durationMs: result.durationMs,
        entities: result.entities,
        triggerTimeline: result.events
            .filter((event) => event.type === 'BATTLE_TRIGGER')
            .slice(0, 16)
            .map((event) => ({
                round: event.round,
                turn: event.turn,
                timing: event.timing,
                actorId: event.actorId || null,
                targetId: event.targetId || null,
                actionType: event.actionType || null
            })),
        combatLogPreview: result.combatLog.slice(0, 8)
    };
}

const args = parseArgs(process.argv.slice(2));
const seed = Number(args.seed || 1);
const element = normalizeElement(args.element || 'FIRE');
const monsterId = args.monster || `TPL_MON_${element}_001`;
const maxRounds = Number(args.maxRounds || 15);
const random = createSeededRandom(seed);

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const monsterGeneratorService = new MonsterGeneratorService({ random });
const battleEntityFactory = new BattleEntityFactory();
const runtimePlayer = createRuntimePlayer({ element });
const monsterPlan = monsterGeneratorService.createMonster(monsterId, { stage: 1 });
const playerEntity = battleEntityFactory.createFromRuntimePlayer(runtimePlayer, { team: 'A' });
const monsterEntity = battleEntityFactory.createFromMonsterPlan(monsterPlan, { team: 'B' });
const battleEngine = new BattleEngine({ random, maxRounds });

const result = battleEngine.run({
    battleId: `sim:${seed}:${monsterId}`,
    teams: {
        A: [playerEntity],
        B: [monsterEntity]
    }
});

console.log(JSON.stringify(summarize(result), null, 2));
