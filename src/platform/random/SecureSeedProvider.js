import crypto from 'node:crypto';

export default class SecureSeedProvider {
    nextSeed() {
        return crypto.randomInt(1, 2147480000);
    }
}
