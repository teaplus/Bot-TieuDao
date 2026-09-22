Purpose

BattleResult là kết quả cuối cùng.

---

BattleResult gồm

Winner

Loser

Combat Log

Statistics

Survivors

Battle Duration

Generated Events

Outcome chuẩn:

```
TEAM_A_WIN
TEAM_B_WIN
DRAW
ABORTED
```

BattleResult giữ `winnerTeam`, `loserTeam`, `isDraw`, `drawReason`, final entity snapshots và survivor snapshots trực tiếp từ entity còn sống.

Giới hạn canonical là 15 hiệp, cấu hình tại `battle/battle_rules.json`. Nếu hết hiệp 15 mà chưa có phe thắng:

- `outcome = DRAW`;
- `winnerTeam = loserTeam = null`;
- `isDraw = true`;
- `drawReason = ROUND_LIMIT`;
- phát event audit `BATTLE_ROUND_LIMIT_REACHED`.

Đây là kết quả gameplay bình thường, không phải error và không dùng outcome/UI `TIMEOUT`.

Statistics gồm hai scope:

```
statistics.battle
statistics.entities[]
```

Per-entity MVP metrics: actual HP damage dealt/taken, effective healing done/received, shield granted/absorbed, kills, deaths, critical hits, actions taken/skipped và effects applied. Amount được snapshot bằng integer-string.

Battle totals: total damage, healing, shield absorbed, actions, turns và rounds.

Metrics được ghi đúng một lần tại mutation boundary qua typed collector trong BattleContext. BattleResult chỉ snapshot aggregate immutable; không scan Combat Log hoặc generated events để tính lại.

---

Không Reward.

Không EXP.

Không Save.

---

Gameplay đọc BattleResult.

↓

Reward.

↓

Quest.

↓

Progress.

↓

Save.

---

End
