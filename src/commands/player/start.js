import { MessageFlags } from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import {
    createCharacterCreationPayload,
    createCharacterCreationSuccessPayload,
    createDaoNameModal,
    getDaoNameErrorMessage
} from '../../application/discord/CharacterCreationPresentation.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class StartCommand extends BaseCommand {
    constructor() {
        super({
            name: 'start',
            description: 'Khai mở đạo đồ, chọn đạo hiệu và thức tỉnh Linh Căn'
        });
    }

    async execute(interaction, client) {
        const service = client.playerStartService;
        const rules = service.getRules();
        if (await service.hasPlayer(interaction.user.id)) {
            return interaction.reply({
                content: 'Đạo hữu đã có nhân vật.',
                flags: MessageFlags.Ephemeral
            });
        }

        const sessionId = interaction.id;
        await interaction.showModal(createDaoNameModal(sessionId, rules));

        let modalSubmit;
        try {
            modalSubmit = await interaction.awaitModalSubmit({
                filter: (submitted) => (
                    submitted.user.id === interaction.user.id
                    && submitted.customId === `start:${sessionId}:dao-name`
                ),
                time: rules.sessionTtlSeconds * 1000
            });
        } catch {
            return null;
        }

        let daoName;
        try {
            daoName = service.validateDaoName(
                modalSubmit.fields.getTextInputValue('dao_name')
            );
        } catch (error) {
            return modalSubmit.reply({
                content: getDaoNameErrorMessage(error, rules)
                    || 'Đạo hiệu không hợp lệ.',
                flags: MessageFlags.Ephemeral
            });
        }

        const state = {
            daoName,
            destiny: service.rollDestiny(),
            rerollsUsed: 0,
            showOdds: false,
            odds: service.getCreationOdds()
        };
        await modalSubmit.deferReply({ flags: MessageFlags.Ephemeral });
        const message = await modalSubmit.editReply(
            createCharacterCreationPayload(state, sessionId, rules)
        );

        await ComponentSession.forMessage({
            interaction: modalSubmit,
            message,
            prefix: `start:${sessionId}:`,
            timeoutMs: rules.sessionTtlSeconds * 1000
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':').at(-1);
                if (action === 'cancel') {
                    await component.update(createCharacterCreationPayload(
                        state,
                        sessionId,
                        rules,
                        { disabled: true, notice: 'Đã hủy. Chưa có nhân vật nào được tạo.' }
                    ));
                    return false;
                }

                if (action === 'rename') {
                    await component.showModal(
                        createDaoNameModal(`${sessionId}:rename`, rules, state.daoName)
                    );
                    let renameSubmit;
                    try {
                        renameSubmit = await component.awaitModalSubmit({
                            filter: (submitted) => (
                                submitted.user.id === interaction.user.id
                                && submitted.customId === `start:${sessionId}:rename:dao-name`
                            ),
                            time: rules.sessionTtlSeconds * 1000
                        });
                    } catch {
                        return true;
                    }
                    try {
                        state.daoName = service.validateDaoName(
                            renameSubmit.fields.getTextInputValue('dao_name')
                        );
                    } catch (error) {
                        await renameSubmit.reply({
                            content: getDaoNameErrorMessage(error, rules)
                                || 'Đạo hiệu không hợp lệ.',
                            flags: MessageFlags.Ephemeral
                        });
                        return true;
                    }
                    await renameSubmit.deferUpdate();
                    await modalSubmit.editReply(
                        createCharacterCreationPayload(state, sessionId, rules)
                    );
                    return true;
                }

                if (action === 'reroll') {
                    if (state.rerollsUsed >= rules.maxRerolls) {
                        await component.update(createCharacterCreationPayload(
                            state,
                            sessionId,
                            rules,
                            { notice: 'Cơ duyên tái tạo đã cạn.' }
                        ));
                        return true;
                    }
                    state.destiny = service.rollDestiny();
                    state.rerollsUsed += 1;
                    await component.update(
                        createCharacterCreationPayload(state, sessionId, rules)
                    );
                    return true;
                }

                if (action === 'odds') {
                    state.showOdds = !state.showOdds;
                    await component.update(
                        createCharacterCreationPayload(state, sessionId, rules)
                    );
                    return true;
                }

                if (action === 'confirm') {
                    await component.deferUpdate();
                    try {
                        const result = await service.startPlayer(
                            interaction.user.id,
                            state.daoName,
                            {
                                destiny: state.destiny,
                                rerollsUsed: state.rerollsUsed
                            }
                        );
                        await modalSubmit.editReply(
                            createCharacterCreationSuccessPayload(
                                state,
                                result,
                                sessionId,
                                rules
                            )
                        );
                    } catch (error) {
                        if (error.code === '23505') {
                            await modalSubmit.editReply({
                                content: 'Đạo hữu đã có nhân vật.',
                                components: []
                            });
                        } else {
                            client.logger?.error('Start command failed', {
                                error: error instanceof Error ? error.message : String(error)
                            });
                            await modalSubmit.editReply({
                                content: 'Thiên cơ nhiễu loạn, chưa thể khai mở đạo đồ lúc này.',
                                components: []
                            });
                        }
                    }
                    return false;
                }

                await component.deferUpdate();
                return true;
            },
            onTimeout: async () => {
                await modalSubmit.editReply(createCharacterCreationPayload(
                    state,
                    sessionId,
                    rules,
                    {
                        disabled: true,
                        notice: 'Cơ duyên đã khép lại vì quá thời hạn. Dùng `/start` để bắt đầu lại.'
                    }
                )).catch(() => null);
            }
        });
        return null;
    }
}
