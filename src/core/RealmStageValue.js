export function normalizeRealmStage(stage, maxStage = Number.POSITIVE_INFINITY) {
    const normalizedStage = Math.max(1, Math.floor(Number(stage) || 1));
    const normalizedMaxStage = Number.isFinite(Number(maxStage))
        ? Math.max(1, Math.floor(Number(maxStage)))
        : Number.POSITIVE_INFINITY;

    return Math.min(normalizedStage, normalizedMaxStage);
}

export function resolveRealmStageValue(definition, stage = 1) {
    const initial = Number(definition?.initial || 0);
    const growthPerStage = Number(definition?.growthPerStage ?? 1);
    const normalizedStage = normalizeRealmStage(stage);

    return Math.floor(initial * (growthPerStage ** (normalizedStage - 1)));
}

export function resolveRequiredCultivation(realm, stage = 1) {
    const normalizedStage = normalizeRealmStage(stage, realm?.max_stage || realm?.maxStage);

    return resolveRealmStageValue(realm?.cultivation?.required, normalizedStage);
}
