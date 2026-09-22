const LATIN_WORD_PAIR = /^[\p{Script=Latin}\p{Mark}]+ [\p{Script=Latin}\p{Mark}]+$/u;

export default class WordChainNormalizer {
    constructor(options = {}) {
        this.rules = options.rules;
        if (!this.rules) throw new Error('WORD_CHAIN_RULES_REQUIRED');
        this.denylist = new Set((this.rules.inputPolicy.denylist || []).map((entry) => (
            this.normalizeText(entry)
        )));
    }

    normalizeText(value) {
        return String(value || '')
            .normalize(this.rules.inputPolicy.unicodeNormalization)
            .trim()
            .replace(/\s+/gu, ' ')
            .toLocaleLowerCase('vi');
    }

    parse(value) {
        const normalizedWord = this.normalizeText(value);
        if (!normalizedWord || normalizedWord.length > this.rules.inputPolicy.maxLength) {
            return null;
        }
        if (!LATIN_WORD_PAIR.test(normalizedWord) || this.denylist.has(normalizedWord)) {
            return null;
        }
        const [firstPart, secondPart] = normalizedWord.split(' ');
        return Object.freeze({ normalizedWord, firstPart, secondPart });
    }
}
