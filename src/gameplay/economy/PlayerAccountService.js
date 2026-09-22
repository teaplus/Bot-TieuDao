import PlayerAccountRepository from '../../repositories/PlayerAccountRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';

export default class PlayerAccountService {
    constructor(options = {}) {
        this.unitOfWork = options.unitOfWork;
        this.repository = options.repository || new PlayerAccountRepository();
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
    }

    async ensureGuest(playerId) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        return this.unitOfWork.execute((client) => this.repository.ensureGuest(client, playerId));
    }

    async getSpiritStoneBalance(playerId) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        return this.unitOfWork.execute(async (client) => {
            const account = await this.repository.ensureGuest(client, playerId);
            const balance = await this.walletRepository.getBalance(
                client,
                playerId,
                'SPIRIT_STONE'
            );
            return {
                playerId,
                accountStatus: account.accountStatus,
                balance
            };
        });
    }
}
