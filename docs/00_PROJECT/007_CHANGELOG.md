# 007_CHANGELOG.md

Project: Discord Tu Tiên RPG

Version: 1.0

Status: ACTIVE

---

# Purpose

Theo dõi lịch sử thay đổi của dự án.

Không mô tả Gameplay.

Không mô tả Source Code.

Chỉ ghi nhận thay đổi.

---

# Version 1.0

Status

In Development

---

## Version 1.0.1

### Added

- `docs/01_FOUNDATION/008_PROJECT_ROADMAP_V2.md`
- Core Data registry collections: `attributes`, `elements`, `targets`, `actionTypes`, `formulas`, `coreEffects`, `skillDefinitions`
- Battle pipeline core-data path cho `skillDefinitions -> coreEffects -> actions -> formulas/modifiers`
- Formula audit cho current battle stat
- Battle combat log aggregation cho moi lan thi trien
- BattleLogAnimator summary renderer
- Trigger hook execution cho effect event runtime
- Battle simulator element parameter

### Changed

- `GameDataManager` bootstrap uu tien data source va contract theo `docs/02_CORE_DATA`
- `actionTypes`, `effects`, `modifiers` duoc dua sang schema core v2 co bridge compatibility
- Battle `SkillManager`, `BattleEngine`, `ActionExecutor`, `FormulaEngine`, `EffectEngine`, `TargetSelector` bat dau doc contract battle/core data moi
- `FormulaEngine` tra ro `statScope: CURRENT_BATTLE_STAT` va clamp damage toi thieu `1`
- `combatLog` gom damage/effect/modifier vao cung object `uses`, trigger/action detail chi con trong event queue
- `BattleLogAnimator` uu tien render tu `details.summary` thay vi parse message action cu
- Trigger dispatcher bat dau kich hoat effect action theo `ON_HIT`, `ON_ATTACK`, `ON_HEAL`, `ON_SHIELD`, `ON_EFFECT_APPLIED`, `ON_DEATH`
- Effect tick dung `source` cua effect de tinh formula DOT va sinh combat log rieng cho DOT/regen/shield tick
- `simulateBattle` ho tro chon he runtime qua tham so `--element`

### Deprecated

- Viec xem `docs/02_CORE_DATA` chi nhu tai lieu tham khao khong rang buoc source code
- Battle path chi doc `skill.combat.actions` legacy
- Battle log tach rieng `deals damage` va `applies effect` cho cung mot lan thi trien
- BattleLogAnimator phu thuoc vao message `deals`, `heals`, `shields`, `applies` cho log moi

### Removed

- Trigger/action detail khong con ghi thanh combat log object rieng

### Fixed

- Cross-reference giua element/effect/action/target/formula/skill duoc validate ngay luc bootstrap
- Skill legacy khong con bo qua contract `Skill -> Effect`
- Modifier v2 `MULTIPLY/PERCENT` duoc normalize dung cho battle runtime
- Audit xac nhan `SKILL_DAMAGE` doc ATK hien tai sau modifier, khong doc raw base ATK
- Battle log khong con sinh thua object cho cung mot don danh/ky nang
- BattleLogAnimator render duoc damage/heal/shield/effect/modifier trong cung dong thi trien
- Effect trigger/passive khong con bi chi ghi event ma khong execute action
- DOT nhu `BURN` da co the gay damage runtime va hien thi thanh combat log animator entry
- Battle simulator khong con bi hardcode chi test duoc he Hoa

### Notes

- Runtime cu van duoc giu on dinh thong qua bridge layer
- Chi tiet dot thay doi nam tai `changelogs/2026-07-13_step-52-core-data-contract-alignment.md`
- Chi tiet battle alignment nam tai `changelogs/2026-07-13_step-53-battle-core-data-pipeline-alignment.md`
- Chi tiet formula stat scope nam tai `changelogs/2026-07-13_step-54-formula-current-battle-stat-audit.md`
- Chi tiet battle log aggregation nam tai `changelogs/2026-07-13_step-55-battle-log-skill-cast-aggregation.md`
- Chi tiet battle log animator summary renderer nam tai `changelogs/2026-07-13_step-56-battle-log-animator-summary-renderer.md`
- Chi tiet trigger/effect DOT runtime nam tai `changelogs/2026-07-13_step-57-effect-trigger-dot-runtime.md`
- Chi tiet battle simulator element parameter nam tai `changelogs/2026-07-13_step-58-simulate-battle-element-parameter.md`

---

## Phase 0

### Added

- AI_BOOTSTRAP.md
- AI_PROMPT.md
- AI_RULE.md
- AI_CONTEXT.md
- PROJECT_ROADMAP.md
- PROJECT_TODO.md
- DESIGN_DECISION.md
- CHANGELOG.md

---

### Locked

Project Workflow

Documentation Workflow

Development Workflow

Roadmap

Architecture Philosophy

---

### Notes

Bắt đầu xây dựng bộ Engineering Specification.

---

# Changelog Format

Mỗi thay đổi mới phải theo mẫu:

---

## Version x.y.z

### Added

-

### Changed

-

### Deprecated

-

### Removed

-

### Fixed

-

### Notes

-

---

# Update Rules

Chỉ ghi:

- File mới.
- Rule mới.
- Architecture mới.
- Data Schema mới.

Không ghi thay đổi nhỏ trong quá trình code.

---

# End Of File
