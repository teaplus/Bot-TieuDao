const DEFAULT_TIMEOUT_MS = 60_000;

export default class ComponentSession {
    constructor(options = {}) {
        this.interaction = options.interaction;
        this.message = options.message;
        this.prefix = options.prefix || null;
        this.customId = options.customId || null;
        this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
        this.timeProvider = options.timeProvider || { now: () => Date.now() };
        this.startedAt = Number(this.timeProvider.now());
    }

    static forMessage(options) {
        return new ComponentSession(options);
    }

    async next() {
        const elapsedMs = Math.max(0, Number(this.timeProvider.now()) - this.startedAt);
        const remainingMs = Math.max(0, this.timeoutMs - elapsedMs);
        if (remainingMs <= 0) throw new Error('COMPONENT_SESSION_EXPIRED');
        return this.message.awaitMessageComponent({
            filter: (component) => this.matches(component),
            time: remainingMs
        });
    }

    async run({ onCollect, onTimeout }) {
        while (true) {
            try {
                const component = await this.next();
                const shouldContinue = await onCollect(component);
                if (shouldContinue === false) {
                    break;
                }
            } catch {
                if (onTimeout) {
                    await onTimeout();
                }
                break;
            }
        }
    }

    matches(component) {
        if (component.user.id !== this.interaction.user.id) {
            return false;
        }

        if (this.customId) {
            return component.customId === this.customId;
        }

        if (this.prefix) {
            return component.customId.startsWith(this.prefix);
        }

        return true;
    }
}
