export default class TargetResolver {

    resolve(skill, action) {

        const target =
            action?.target
            ?? skill?.target
            ?? "ENEMY_SINGLE";

        return this.normalize(target);

    }

    normalize(target) {

        if (!target) {
            return "ENEMY_SINGLE";
        }

        // Legacy format
        if (typeof target === "string") {
            return target.toUpperCase();
        }

        // New object format
        if (typeof target === "object") {

            const team = String(target.team ?? "ENEMY").toUpperCase();
            const scope = String(target.scope ?? "SINGLE").toUpperCase();

            if (team === "SELF") {
                return "SELF";
            }

            if (team === "CASTER") {
                return "CASTER";
            }

            if (team === "OWNER") {
                return "OWNER";
            }

            if (scope === "SELF") {
                return "SELF";
            }

            if (scope === "ALL") {
                return `${team}_ALL`;
            }

            if (scope === "SINGLE") {
                return `${team}_SINGLE`;
            }

            if (scope === "RANDOM") {
                return `${team}_RANDOM`;
            }

            if (scope === "LOWEST_HP") {
                return `${team}_LOWEST_HP`;
            }

            if (scope === "HIGHEST_ATTACK") {
                return `${team}_HIGHEST_ATTACK`;
            }

            if (scope === "DEAD") {
                return `DEAD_${team}`;
            }

            return `${team}_${scope}`;
        }

        return "ENEMY_SINGLE";
    }

}