# 004_CODING_STANDARD.md

# Coding Standard

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ quy tắc viết source code.

Mọi file JavaScript trong dự án đều phải tuân thủ tài liệu này.

Nếu source code không đúng Coding Standard thì được xem là không hợp lệ.

---

# 2. Coding Philosophy

Ưu tiên

- Readability
- Maintainability
- Simplicity
- Extensibility
- Performance

Không ưu tiên

- Clever Code
- One-liner
- Magic

Code phải dễ đọc hơn là ngắn.

---

# 3. File Rules

Một file

↓

Một Class

Ví dụ

```
BattleEngine.js

BattleEntity.js

DamageCalculator.js

Player.js
```

Không được

```
BattleEngine

BattleContext

BattleAction
```

trong cùng một file.

---

# 4. File Length

Khuyến nghị

```
200~400 dòng
```

Tối đa

```
700 dòng
```

Nếu dài hơn

↓

Tách Class.

---

# 5. Class Rules

Một Class

↓

Một Responsibility

Ví dụ

```
DamageCalculator
```

Chỉ tính Damage.

Không Heal.

Không Shield.

Không Crit.

---

Sai

```
BattleCalculator
```

vừa Damage

vừa Heal

vừa Shield

vừa Buff

---

# 6. Naming Convention

Class

```
PascalCase
```

Ví dụ

```
BattleEngine

PlayerService

MonsterRepository
```

---

Method

```
camelCase
```

Ví dụ

```
takeDamage()

heal()

calculateDamage()

startBattle()
```

---

Variable

```
camelCase
```

Ví dụ

```
playerHp

criticalRate

baseDamage
```

---

Constant

```
UPPER_SNAKE_CASE
```

Ví dụ

```
MAX_LEVEL

MAX_EFFECT_STACK

DEFAULT_SPEED
```

---

File Name

```
PascalCase.js
```

Ví dụ

```
BattleEntity.js

BurnEffect.js

PlayerService.js
```

---

Folder

```
lowercase
```

Ví dụ

```
battle

effects

calculator

player
```

---

# 7. Method Length

Khuyến nghị

```
<30 dòng
```

Nếu lớn hơn

↓

Tách Method.

---

# 8. Function Rule

Một Function

↓

Một việc.

Ví dụ

Sai

```
battle()

↓

Damage

Heal

Reward

Save

Discord
```

Đúng

```
calculateDamage()

↓

applyDamage()

↓

reward()

↓

saveBattle()
```

---

# 9. Constructor Rule

Constructor chỉ

- Khởi tạo dữ liệu

Không

- Query SQL

- Tính Damage

- Load Config

---

Ví dụ

Đúng

```js
constructor(player){

    this.id=player.id;

}
```

Sai

```js
constructor(){

    this.player=

await repository.find();

}
```

---

# 10. Async Rule

Luôn dùng

```
async/await
```

Không dùng

```
.then()

.catch()
```

---

# 11. Error Handling

Không

```js
catch(e){

}
```

Luôn

```js
catch(error){

    logger.error(error);

    throw error;

}
```

---

# 12. Magic Number

Không viết

```js
damage*=1.5;
```

Đúng

```js
const CRITICAL_MULTIPLIER=1.5;
```

---

# 13. Comment Rules

Không comment

```js
i++;
```

Chỉ comment

Business Logic.

Ví dụ

```js
// Burn sẽ gây sát thương đầu lượt
```

---

# 14. JSDoc

Mọi Public Method

↓

Có JSDoc.

Ví dụ

```js
/**
 * Calculate battle damage.
 *
 * @param {BattleEntity} attacker
 * @param {BattleEntity} target
 *
 * @returns {number}
 */
```

---

# 15. Return Rule

Không

```js
return null;
```

Ưu tiên

```js
return [];

return {};

return false;
```

Nếu Method có thể thất bại

↓

Throw Error.

---

# 16. Boolean

Không

```js
isDead==true
```

Đúng

```js
if(entity.isDead)
```

---

# 17. Equality

Luôn

```
===

!==
```

Không dùng

```
==

!=
```

---

# 18. Optional Chaining

Cho phép

```js
player?.equipment?.weapon
```

---

# 19. Nullish

Ưu tiên

```js
??

```

Không

```
||

```

trong trường hợp giá trị có thể bằng `0`.

---

# 20. Array Rules

Ưu tiên

```
map

filter

find

reduce

some

every
```

Không lạm dụng

```
for
```

trừ khi cần Performance.

---

# 21. Dependency Rule

Một Class

↓

Import tối đa

```
7 modules
```

Nếu nhiều hơn

↓

Refactor.

---

# 22. Logging Rule

Không

```
console.log()
```

Sử dụng

```
Logger.info()

Logger.warn()

Logger.error()
```

---

# 23. Exception Rule

Không

```js
return false;
```

khi có Exception.

↓

Throw Error.

---

# 24. Config Rule

Không Hardcode.

Ví dụ

Sai

```js
burn=30;
```

Đúng

```js
config.effect.burn.damage
```

---

# 25. JSON Rule

Gameplay

↓

JSON

Database

Không

```js
new Skill(

150%

Burn

3 turn
)
```

---

# 26. Event Rule

Gameplay

↓

EventBus

Không gọi trực tiếp.

Ví dụ

Sai

```
FireSpiritRoot

↓

Burn
```

Đúng

```
OnAttack

↓

EventBus

↓

FireSpiritRoot

↓

Burn
```

---

# 27. Repository Rule

Repository

↓

SQL

Không Gameplay.

---

# 28. Service Rule

Service

↓

Business

Không SQL.

---

# 29. Engine Rule

Engine

↓

Gameplay

Không Discord.

Không Database.

---

# 30. AI Instruction

Khi sinh source code

AI phải

✓ Tuân thủ tài liệu này.

✓ Không Hardcode.

✓ Một file một class.

✓ Có JSDoc.

✓ Async/Await.

✓ Không CommonJS.

✓ ES Module.

Nếu có xung đột

↓

Tài liệu này ưu tiên hơn source code.

---

# End of File