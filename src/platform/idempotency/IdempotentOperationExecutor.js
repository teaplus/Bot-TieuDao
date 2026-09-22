const DEFAULT_RESPONSE_RETENTION_DAYS = 30;

export default class IdempotentOperationExecutor {
    constructor(options = {}) {
        this.unitOfWork = options.unitOfWork || null;
        this.idempotencyRepository = options.idempotencyRepository || null;
        this.responseRetentionDays = Number(
            options.responseRetentionDays || DEFAULT_RESPONSE_RETENTION_DAYS
        );
    }

    async execute(operation, work) {
        if (!operation.operationId) {
            return work(null);
        }

        if (!this.unitOfWork || !this.idempotencyRepository) {
            throw new Error('IDEMPOTENCY_DEPENDENCIES_REQUIRED');
        }

        return this.unitOfWork.execute(async (client) => {
            if (operation.playerId && typeof client?.query === 'function') {
                await client.query(
                    'SELECT id FROM players WHERE id = $1 FOR UPDATE',
                    [operation.playerId]
                );
            }
            const reservation = await this.idempotencyRepository.reserve(client, {
                operationId: operation.operationId,
                playerId: operation.playerId,
                operationType: operation.operationType,
                requestHash: operation.requestHash,
                businessKey: operation.businessKey,
                retentionPolicy: operation.retentionPolicy || 'DEFAULT'
            });

            if (reservation.status === 'COMPLETED') {
                return {
                    ...reservation.response,
                    idempotentReplay: true
                };
            }

            if (reservation.status === 'IN_PROGRESS') {
                throw new Error('IDEMPOTENCY_OPERATION_IN_PROGRESS');
            }

            const response = await work(client);
            await this.idempotencyRepository.complete(client, {
                operationId: operation.operationId,
                response,
                responseRetentionDays: this.responseRetentionDays
            });

            return response;
        });
    }
}
