export function calculateRequiredInventorySlots(existingRows, rewards) {
    const stackableItemIds = new Set(
        (existingRows || [])
            .filter((row) => row.equipped_slot == null)
            .map((row) => row.item_id)
    );
    let requiredNewSlots = 0;

    for (const reward of rewards || []) {
        if (reward.type === 'EQUIPMENT') {
            requiredNewSlots += 1;
            continue;
        }

        if (reward.type === 'ITEM' && !stackableItemIds.has(reward.itemId)) {
            requiredNewSlots += 1;
            stackableItemIds.add(reward.itemId);
        }
    }

    return requiredNewSlots;
}

export function assertInventoryCapacity(existingRows, rewards, capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
        return;
    }

    const requiredNewSlots = calculateRequiredInventorySlots(existingRows, rewards);
    if ((existingRows || []).length + requiredNewSlots > capacity) {
        const error = new Error('INVENTORY_FULL');
        error.retryable = true;
        throw error;
    }
}
