# 003_FOLDER_STRUCTURE.md

# Folder Structure

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ cấu trúc thư mục của dự án.

Mọi source code phải tuân theo cấu trúc này.

AI không được tự ý tạo thêm thư mục nếu chưa được định nghĩa.

---

# 2. Root Structure

```
tu-tien-bot/

│

├── docs/

├── resources/

├── scripts/

├── src/

├── test/

│

├── .env

├── .gitignore

├── package.json

└── README.md
```

---

# 3. docs/

Chứa toàn bộ tài liệu thiết kế.

```
docs/

000_INDEX.md

001_ARCHITECTURE.md

...

099_APPENDIX.md
```

Không chứa source code.

---

# 4. resources/

Chứa dữ liệu tĩnh.

Ví dụ

```
resources/

config/

json/

images/

fonts/

audio/
```

Ví dụ

```
skills.json

effects.json

monster.json

equipment.json

cultivation.json
```

Gameplay có thể đọc từ đây.

---

# 5. scripts/

Chứa script hỗ trợ.

Ví dụ

```
seed.js

backup.js

import_excel.js

export_json.js
```

Không chứa gameplay.

---

# 6. src/

Đây là thư mục source chính.

```
src

config

database

engine

modules

repositories

services

shared

discord

utils
```

---

# 7. config/

Chỉ chứa cấu hình.

```
config

app.js

database.js

discord.js

redis.js

logger.js
```

Không chứa logic.

---

# 8. database/

```
database

connection.js

migration/

seed/

sql/
```

Không chứa Business Logic.

---

# 9. engine/

Engine là trái tim của game.

```
engine

battle

calculator

effects

events

turn

ai
```

Engine hoàn toàn độc lập.

---

# 10. battle/

```
battle

BattleEngine.js

BattleContext.js

BattleEntity.js

BattleAction.js

BattleResult.js

BattleState.js
```

Không chứa Skill.

Không chứa Player.

---

# 11. calculator/

```
calculator

DamageCalculator.js

HealCalculator.js

ShieldCalculator.js

CriticalCalculator.js

SpeedCalculator.js
```

Calculator chỉ tính toán.

Không phát Event.

Không lưu dữ liệu.

---

# 12. effects/

```
effects

Effect.js

Burn.js

Freeze.js

Shield.js

Heal.js

Poison.js

Bleed.js

Taunt.js

Slow.js

Stun.js
```

Mọi Effect đều kế thừa Effect.

---

# 13. turn/

```
turn

TurnManager.js

ActionQueue.js

TargetSelector.js
```

Chỉ điều khiển lượt.

---

# 14. events/

```
events

BattleEvent.js

EventBus.js

Listeners/
```

Chỉ quản lý Event.

---

# 15. ai/

```
ai

MonsterAI.js

BossAI.js

TargetStrategy.js
```

BattleEngine không chứa AI.

---

# 16. modules/

Đây là Gameplay.

```
modules

player

monster

skill

equipment

sect

talent

spiritRoot

dungeon

worldBoss

guild

ranking
```

---

# 17. player/

```
player

Player.js

PlayerStat.js

PlayerCultivation.js

PlayerInventory.js

PlayerEquipment.js

PlayerSkill.js

PlayerTalent.js

PlayerSpiritRoot.js
```

---

# 18. monster/

```
monster

Monster.js

MonsterSkill.js

MonsterPassive.js

MonsterFactory.js
```

---

# 19. skill/

```
skill

Skill.js

SkillFactory.js

SkillExecutor.js

SkillLoader.js
```

---

# 20. repositories/

Repository chỉ truy cập Database.

```
repositories

PlayerRepository.js

MonsterRepository.js

SkillRepository.js

DungeonRepository.js
```

Repository không xử lý gameplay.

---

# 21. services/

Business Logic.

```
services

PlayerService.js

BattleService.js

DungeonService.js

InventoryService.js

RankingService.js
```

Service không query SQL trực tiếp.

Service gọi Repository.

---

# 22. discord/

```
discord

commands

events

buttons

modals

embeds
```

Discord chỉ xử lý giao diện Discord.

---

# 23. commands/

```
commands

battle

player

inventory

admin

guild

ranking
```

Ví dụ

```
battle/

BattleCommand.js
```

---

# 24. shared/

Các object dùng chung.

```
shared

enums

constants

interfaces

errors

dto
```

---

# 25. utils/

Các hàm tiện ích.

```
utils

Random.js

MathUtil.js

DateUtil.js

StringUtil.js

DiscordUtil.js
```

Không chứa gameplay.

---

# 26. test/

```
test

battle

calculator

effects

services

repositories
```

Mỗi module có test riêng.

---

# 27. Dependency Rule

```
Discord

↓

Service

↓

Repository

↓

Database
```

```
Service

↓

BattleEngine
```

```
BattleEngine

↓

Calculator

↓

Effect

↓

EventBus
```

Không được dependency ngược.

---

# 28. Forbidden Import

Ví dụ

BattleEngine

```
import BattleService
```

❌

Sai.

---

Player

```
import BattleCommand
```

❌

Sai.

---

Repository

```
import Discord
```

❌

Sai.

---

# 29. Naming Convention

Một class

↓

Một file.

Ví dụ

```
BattleEngine.js

BattleContext.js

DamageCalculator.js
```

Không gộp nhiều class.

---

# 30. Future Modules

Framework phải hỗ trợ

```
Pet

Mount

Artifact

Formation

Alchemy

Auction

Mail

CrossServer

Quest

Achievement
```

Không cần thay đổi Engine.

---

# 31. Architecture Goal

Sau khi hoàn thành

src/

dự kiến có

```
250~400 JavaScript files
```

Tất cả đều tuân theo cấu trúc này.

---

# End of File