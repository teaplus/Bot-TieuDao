export default class RuntimeInventory {
    constructor(payload = {}) {
        this.runtimeItems = Object.freeze([...(payload.runtimeItems || [])]);
        this.runtimeEquipments = Object.freeze([...(payload.runtimeEquipments || [])]);
    }

    getAllEntries() {
        return [...this.runtimeItems, ...this.runtimeEquipments];
    }
}

