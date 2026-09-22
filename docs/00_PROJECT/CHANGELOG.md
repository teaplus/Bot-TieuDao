# CHANGELOG.md

# Changelog

---

## 2026-07-11

### Battle Framework

- Hoàn thành Battle Framework V1.

- Bổ sung CombatContext.

- Bổ sung CombatResult.

- Tách SkillExecutor khỏi BattleEngine.

- FormulaEngine trở thành Pure Calculation.

- EffectEngine chỉ quản lý Effect.

---

### Skill Framework

- Bỏ Cooldown.

- Bỏ Mana.

- Bỏ Qi Cost.

- Weight chuyển sang BattleEntity.

- Skill chỉ là Data.

- Skill gồm nhiều Action.

- Target chuyển từ Skill xuống Action.

- Trigger Skill kích hoạt bằng Battle Event.

- Hoàn thành Skill Framework V1.

- Tạo SkillFactory (parse JSON).

- Tạo JSON Specification cho Skill.

---

### Effect Framework

- Hoàn thành Effect Framework V1.

- 8 Effect Types: BUFF, DEBUFF, DOT, HOT, CONTROL, PASSIVE, SHIELD, IMMUNITY.

- 6+ Effect Categories: Stat, Damage, Control, Immunity, Shield, Special.

- Buff System: Stack, Duration, Removal.

- Debuff System: Resistance, Immunity, Removal.

- DOT System: Tick at turn end, Dynamic calculation.

- HOT System: Tick at turn end, Dynamic calculation.

- Control Effect: Stun, Freeze, Silence, Sleep, Charm, Disarm.

- EffectEngine: Apply, Tick, Remove, Cascade.

- EffectFactory: Parse JSON, Validate.

- JSON Specification cho Effect.

---

### Architecture

- BattleEngine chỉ điều phối.

- SkillManager quyết định Skill.

- SkillExecutor thực thi Skill.

- BattleEntity chỉ lưu State.

---

End Of File