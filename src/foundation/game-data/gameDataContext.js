let activeGameDataManager = null;

export function setGameDataManager(gameDataManager) {
    activeGameDataManager = gameDataManager;
}

export function getGameDataManager() {
    if (!activeGameDataManager) {
        throw new Error('GameDataManager has not been initialized');
    }

    return activeGameDataManager;
}

