# MAP_SPAWN_SPEC

## Scope

Map là khu vực gameplay logic. Continent chỉ là metadata nhóm và trình bày. MVP không có tọa độ, di chuyển theo ô, pathfinding hoặc current-map persistence.

## Runtime pipeline

```text
activity mapId
-> MapEncounterService
-> unlock condition bằng realm.order
-> monsterSpawnPoolId
-> weighted eligible entry
-> MonsterGeneratorService
-> Battle
-> Monster Reward Table
```

Discord chỉ hiển thị và chuyển `mapId`; không chọn monster, so sánh tên cảnh giới hoặc giữ gameplay state.

## Map contract

- `status`: `ACTIVE`, `CONTENT_PENDING`, `DISABLED`.
- `unlockCondition`: MVP hỗ trợ `MIN_REALM_ORDER`.
- `recommendedRealmRange`: metadata theo `realm.order`.
- `monsterSpawnPoolId`: bắt buộc khi Map `ACTIVE`.
- `activityTypes`: danh sách activity được phép.
- `rewardModifier`: nullable; chỉ được dùng sau khi có typed contract riêng, không thay Monster Reward Table.

## Spawn Pool contract

Mỗi entry khai báo `monsterId`, positive `weight`, `minPlayerRealmOrder`, nullable `maxPlayerRealmOrder` và `spawnType` (`NORMAL`, `ELITE`, `BOSS`). Monster realm/reward vẫn lấy từ Monster Template.

## Activity identity

Theo `Q-MAP-003`, `mapId` là input của từng activity và được lưu trong activity input/result snapshot. MVP không lưu `current_map_id` trên player.
