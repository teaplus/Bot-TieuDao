# 021_BATTLE_CONTEXT.md

# Battle Context

Version: 1.0.0

---

# 1. Purpose

BattleContext lưu toàn bộ trạng thái của một trận đấu.

BattleContext chỉ chứa dữ liệu.

Không chứa Business Logic.

Không chứa Gameplay Logic.

---

# 2. Design Philosophy

BattleContext giống như "Memory" của Battle.

BattleEngine sẽ đọc và cập nhật BattleContext trong suốt trận đấu.

---

# 3. Structure

BattleContext

├── battleId

├── seed

├── state

├── round

├── turn

├── playerTeam

├── monsterTeam

├── winner

├── battleLog

└── metadata

---

# 4. battleId

ID duy nhất của trận đấu.

Dùng cho

- Replay
- Log
- Debug

---

# 5. Seed

Seed của RandomProvider.

Một Battle chỉ có một Seed.

Replay phải sử dụng cùng Seed.

---

# 6. Battle State

Các trạng thái

```
WAITING

RUNNING

FINISHED
```

---

# 7. Round

Round hiện tại.

Khởi đầu từ

```
1
```

---

# 8. Turn

Turn hiện tại.

Khởi đầu từ

```
1
```

---

# 9. Teams

BattleContext luôn có

```
playerTeam

monsterTeam
```

Mỗi Team chứa danh sách BattleEntity.

---

# 10. Winner

Battle kết thúc.

Winner nhận giá trị

```
PLAYER

MONSTER

NONE
```

---

# 11. Battle Log

Lưu lại

- Damage
- Heal
- Skill
- Effect
- Death

Dùng cho

Replay

History

Debug

---

# 12. Metadata

Cho phép mở rộng.

Ví dụ

DungeonId

BossId

Difficulty

Weather

Map

---

# 13. Rule

BattleContext chỉ lưu dữ liệu.

Không được chứa

- Damage Formula
- Skill Logic
- Buff Logic

---

# 14. Public API

Khuyến nghị

```
nextRound()

nextTurn()

finish()

setWinner()

isFinished()
```

---

# 15. AI Instruction

BattleContext là Data Model.

Không viết Gameplay Logic trong BattleContext.

---

# End Of File