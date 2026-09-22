import fs from 'fs';
import path from 'path';
import AppError from '../../shared/errors/AppError.js';
import GameDataNormalizer from './GameDataNormalizer.js';
import { GAME_DATA_SOURCES } from './gameDataRegistry.js';

export default class GameDataLoader {
    constructor(options = {}) {
        this.dataDirectory = options.dataDirectory || path.resolve(process.cwd(), 'src/data');
        this.normalizer = options.normalizer || new GameDataNormalizer();
    }

    loadAll() {
        const rawData = {};
        const metadata = {};

        for (const [sourceName, relativePath] of Object.entries(GAME_DATA_SOURCES)) {
            const loadedFile = this.loadFile(relativePath);
            rawData[sourceName] = loadedFile.data;
            metadata[sourceName] = {
                relativePath,
                fullPath: loadedFile.fullPath
            };
        }

        return {
            gameData: this.normalizer.normalize(rawData),
            metadata
        };
    }

    loadFile(relativePath) {
        const fullPath = path.join(this.dataDirectory, relativePath);

        if (!fs.existsSync(fullPath)) {
            throw new AppError(`Missing game data file: ${relativePath}`, {
                code: 'GAME_DATA_FILE_MISSING',
                details: { relativePath, fullPath }
            });
        }

        const fileContent = fs.readFileSync(fullPath, 'utf-8');

        try {
            return {
                data: JSON.parse(fileContent),
                fullPath
            };
        } catch (error) {
            throw new AppError(`Invalid JSON in game data file: ${relativePath}`, {
                code: 'GAME_DATA_JSON_INVALID',
                details: {
                    relativePath,
                    fullPath,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }
}
