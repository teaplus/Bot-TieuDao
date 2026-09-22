import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import PlayerMapStateRepository from '../../repositories/PlayerMapStateRepository.js';
import MapNavigationService from './MapNavigationService.js';

export default class PlayerMapService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.mapStateRepository = options.mapStateRepository || new PlayerMapStateRepository();
        this.gameDataManager = options.gameDataManager;
        this.unitOfWork = options.unitOfWork;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.navigation = options.navigation || new MapNavigationService({
            gameDataManager: this.gameDataManager
        });
    }

    async resolveCurrentMap(client, runtimePlayer) {
        let state = await this.mapStateRepository.get(client, runtimePlayer.playerId, { forUpdate: true });
        if (!state) {
            const startingMap = this.navigation.requireAccessible(
                this.navigation.getStartingMap(),
                runtimePlayer.realmId
            );
            const movedAt = new Date();
            state = await this.mapStateRepository.setCurrentMap(client, {
                playerId: runtimePlayer.playerId,
                mapId: startingMap.id,
                movedAt
            });
            await this.mapStateRepository.recordMovement(client, {
                playerId: runtimePlayer.playerId,
                operationId: `MAP_INIT:${runtimePlayer.playerId}`,
                fromMapId: null,
                toMapId: startingMap.id,
                direction: 'INITIALIZE',
                movedAt
            });
        }
        const map = this.gameDataManager.requireRecord('maps', state.currentMapId);
        return { state, map };
    }

    createLocationView(runtimePlayer, resolved) {
        const lowerMap = this.navigation.getAdjacent(resolved.map.id, 'LOWER');
        const higherMap = this.navigation.getAdjacent(resolved.map.id, 'HIGHER');
        const currentRealm = Object.values(this.gameDataManager.getCollection('realms') || {})
            .find((realm) => realm.code === resolved.map.realmCode);
        return {
            playerId: runtimePlayer.playerId,
            realmId: runtimePlayer.realmId,
            current: resolved.map,
            currentRealmName: currentRealm?.displayName || resolved.map.realmCode,
            movementVersion: resolved.state.movementVersion,
            lower: {
                map: lowerMap,
                access: this.navigation.getAccess(lowerMap, runtimePlayer.realmId)
            },
            higher: {
                map: higherMap,
                access: this.navigation.getAccess(higherMap, runtimePlayer.realmId)
            }
        };
    }

    async getCurrentLocation(playerId) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: true
            });
            if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
            const resolved = await this.resolveCurrentMap(client, runtimePlayer);
            return this.createLocationView(runtimePlayer, resolved);
        });
    }

    async move(playerId, direction, options = {}) {
        if (!options.operationId) throw new Error('MAP_MOVE_OPERATION_ID_REQUIRED');
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MAP_MOVE',
            requestHash: createRequestHash({ operationType: 'MAP_MOVE', playerId, direction })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: true
            });
            if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
            const resolved = await this.resolveCurrentMap(client, runtimePlayer);
            const targetMap = this.navigation.getAdjacent(resolved.map.id, direction);
            if (!targetMap) throw new Error(`MAP_ROUTE_BOUNDARY:${direction}`);
            this.navigation.requireAccessible(targetMap, runtimePlayer.realmId);

            const movedAt = options.movedAt || new Date();
            const state = await this.mapStateRepository.setCurrentMap(client, {
                playerId,
                mapId: targetMap.id,
                movedAt
            });
            await this.mapStateRepository.recordMovement(client, {
                playerId,
                operationId: options.operationId,
                fromMapId: resolved.map.id,
                toMapId: targetMap.id,
                direction,
                movedAt
            });
            return this.createLocationView(runtimePlayer, { state, map: targetMap });
        });
    }
}
