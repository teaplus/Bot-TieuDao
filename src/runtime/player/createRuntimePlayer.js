import RuntimePlayerFactory from './RuntimePlayerFactory.js';

const runtimePlayerFactory = new RuntimePlayerFactory();

export function createRuntimePlayer(record) {
    return runtimePlayerFactory.create(record);
}

