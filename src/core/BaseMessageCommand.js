export default class BaseMessageCommand {
    constructor(options = {}) {
        this.name = options.name;
        this.aliases = Object.freeze([...(options.aliases || [])]);
        this.description = options.description || '';
        this.availability = options.availability || 'ACTIVE';
    }

    async execute() {
        throw new Error(`Message command ${this.name} has no execute implementation`);
    }
}
