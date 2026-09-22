# Legacy Modules

This file tracks modules kept temporarily while the project moves from the old
manager/repository style into the newer `Application -> Gameplay Service ->
Runtime Repository` flow.

## Legacy Replacements

| Legacy module | Replacement |
| --- | --- |
| `src/repositories/PlayerRepository.js` | `src/repositories/PlayerRuntimeRepository.js` plus gameplay services |
| `src/managers/CultivationArtManager.js` | `src/gameplay/player/CultivationArtService.js` |
| `src/managers/EquipmentManager.js` | `src/gameplay/player/EquipmentService.js` |
| `src/managers/SkillManager.js` | `src/gameplay/player/SkillService.js` |
| `src/managers/TreasureHuntManager.js` | `src/gameplay/player/TreasureHuntService.js` |

## Still Active Support Modules

These modules are still intentionally used by the current compatibility layer:

| Module | Current usage |
| --- | --- |
| `src/factories/ItemFactory.js` | Creates legacy item view objects for commands and snapshots |
| `src/factories/SkillFactory.js` | Creates legacy skill view objects for commands and snapshots |
| `src/factories/ItemGenerator.js` | Rolls equipment data, now backed by `GameDataManager` |
| `src/managers/CommandHandler.js` | Loads Discord command classes |

## Removal Rule

Do not delete legacy modules until:

- no command, service, repository, or item class imports them,
- the replacement service has covered the same behavior,
- the relevant changelog step records the removal.
