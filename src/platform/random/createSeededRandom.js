export default function createSeededRandom(seed = 1) {
    const normalizedSeed = Number(seed);
    if (!Number.isFinite(normalizedSeed)) {
        throw new Error(`SEEDED_RANDOM_SEED_INVALID:${seed}`);
    }

    let state = Math.trunc(normalizedSeed) % 2147483647;
    if (state <= 0) {
        state += 2147483646;
    }

    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}
