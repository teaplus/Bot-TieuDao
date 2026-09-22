# GAME_DATA_MODEL_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa cấu trúc GameData của toàn bộ trò chơi.

GameData là tập hợp toàn bộ dữ liệu tĩnh sau khi DataLoader hoàn thành.

GameData là Read Only.

GameData được quản lý duy nhất bởi GameDataManager.

---

# Responsibilities

GameData chỉ chứa Template Data.

Không chứa Runtime Data.

Không chứa Database Data.

Không chứa Player Data.

---

# Runtime Flow

JSON

↓

DataLoader

↓

DataValidator

↓

GameData

↓

GameDataManager

↓

Gameplay / Battle

---

# Collections

GameData bao gồm các Collection sau.

## Core Data

- realms
- elements
- attributes
- modifiers
- actionTypes
- currencies

## Item

- itemTemplates
- itemEffects
- rewardTables
- shops
- crafts
- exchanges
- gatherings

## Equipment

- equipmentTemplates
- equipmentTypes
- equipmentGrades
- equipmentAffixes
- equipmentSets

## Skill

- skillTemplates
- skillPools
- skillTriggers

## Monster

- monsterTemplates
- monsterGroups

## Gameplay

- sects
- explorationConfigs
- secretRealmConfigs

---

# Runtime Rules

GameData chỉ Load một lần.

Gameplay không được sửa.

Battle không được sửa.

Discord không được sửa.

---

# Access Rules

Gameplay

↓

GameDataManager

↓

GameData

Không Module nào được truy cập JSON trực tiếp.

---

# Must NOT

Không Runtime State.

Không Inventory.

Không Battle Context.

Không Player.

---

# Related Specification

REFERENCE_RULE_SPEC

---

# End