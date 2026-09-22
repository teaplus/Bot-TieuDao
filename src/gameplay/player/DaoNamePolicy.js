export default class DaoNamePolicy {
    constructor(rules = {}) {
        this.minimumLength = Number(rules.minLength);
        this.maximumLength = Number(rules.maxLength);
    }

    normalize(value) {
        return String(value ?? '')
            .normalize('NFC')
            .trim()
            .replace(/ +/g, ' ');
    }

    validate(value) {
        const rawValue = String(value ?? '');
        if (/[\p{C}\r\n\t]/u.test(rawValue)) {
            throw new Error('DAO_NAME_INVALID_CHARACTERS');
        }

        const normalized = this.normalize(rawValue);
        if (!normalized) throw new Error('DAO_NAME_REQUIRED');

        const length = Array.from(normalized).length;
        if (length < this.minimumLength) throw new Error('DAO_NAME_TOO_SHORT');
        if (length > this.maximumLength) throw new Error('DAO_NAME_TOO_LONG');
        if (!/^[\p{L}\p{N} ]+$/u.test(normalized)) {
            throw new Error('DAO_NAME_INVALID_CHARACTERS');
        }

        return normalized;
    }
}
