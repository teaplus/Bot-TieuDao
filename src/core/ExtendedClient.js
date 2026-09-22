import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import CommandErrorHandler from '../application/discord/CommandErrorHandler.js';
import { initializeDatabase } from '../database/initDB.js';
import CommandHandler from '../managers/CommandHandler.js';
import MessageCommandHandler from '../managers/MessageCommandHandler.js';
import Logger from '../platform/logger/Logger.js';
import WordChainMessageHandler from '../application/discord/WordChainMessageHandler.js';

export default class ExtendedClient extends Client {
    constructor(options = {}) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        this.logger = options.logger || new Logger();
        this.gameDataManager = options.gameDataManager || null;
        this.cacheService = options.cacheService || null;
        this.playerRuntimeRepository = options.playerRuntimeRepository || null;
        this.playerReadService = options.playerReadService || null;
        this.cultivationService = options.cultivationService || null;
        this.breakthroughService = options.breakthroughService || null;
        this.rebirthService = options.rebirthService || null;
        this.spiritRootRerollService = options.spiritRootRerollService || null;
        this.cultivationArtService = options.cultivationArtService || null;
        this.equipmentService = options.equipmentService || null;
        this.skillService = options.skillService || null;
        this.shopService = options.shopService || null;
        this.mysteryMerchantService = options.mysteryMerchantService || null;
        this.treasureHuntService = options.treasureHuntService || null;
        this.playerMapService = options.playerMapService || null;
        this.explorationService = options.explorationService || null;
        this.secretRealmService = options.secretRealmService || null;
        this.gatheringService = options.gatheringService || null;
        this.sectService = options.sectService || null;
        this.professionService = options.professionService || null;
        this.itemUseService = options.itemUseService || null;
        this.playerStartService = options.playerStartService || null;
        this.cooldowns = new Collection();
        this.cultivationLeaderboardService = options.cultivationLeaderboardService || null;
        this.economyActivityService = options.economyActivityService || null;
        this.playerAccountService = options.playerAccountService || null;
        this.miniGameService = options.miniGameService || null;
        this.wordChainService = options.wordChainService || null;
        this.spiritStoneTransferService = options.spiritStoneTransferService || null;
        this.characterResetService = options.characterResetService || null;
        this.scheduler = options.scheduler || null;
        this.messageCommandPrefix = options.messageCommandPrefix || '!';
        this.slashCommandScope = options.slashCommandScope || 'GLOBAL';
        this.guildId = options.guildId || '';
        this.commands = new Collection();
        this.messageCommands = new Collection();
        this.commandHandler = new CommandHandler(this, {
            scope: this.slashCommandScope,
            guildId: this.guildId
        });
        this.messageCommandHandler = new MessageCommandHandler(this, {
            prefix: this.messageCommandPrefix
        });
        this.wordChainMessageHandler = new WordChainMessageHandler(this);
        this.commandErrorHandler = options.commandErrorHandler || new CommandErrorHandler({
            logger: this.logger
        });
    }

    async start(token) {
        this.logger.info('Starting Discord bot bootstrap');

        await initializeDatabase();
        this.logger.info('Database initialized');

        const wordChainRuntime = await this.wordChainMessageHandler.hydrate();
        this.logger.info('Word Chain runtime hydrated', wordChainRuntime);

        if (this.scheduler) {
            const schedulerResult = await this.scheduler.start();
            this.logger.info('Scheduler started', schedulerResult);
        }

        await this.commandHandler.loadCommands();
        this.logger.info('Commands loaded', { count: this.commands.size });
        const messageCommands = await this.messageCommandHandler.loadCommands();
        this.logger.info('Message commands loaded', {
            ...messageCommands,
            prefix: this.messageCommandPrefix
        });
        if (this.gameDataManager) {
            this.logger.info('Game data ready', this.gameDataManager.getSummary());
        }

        this.once(Events.ClientReady, async () => {
            this.logger.info('Discord client ready', { userTag: this.user.tag });
            try {
                const slashRegistration = await this.commandHandler.registerSlashCommands();
                this.logger.info('Slash commands registered', slashRegistration);
            } catch (error) {
                this.logger.error('Slash command registration failed', {
                    error: error instanceof Error ? error.message : String(error),
                    scope: this.slashCommandScope
                });
            }
        });

                this.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            // --- ANTI-SPAM COOLDOWN LOGIC ---
            const { cooldowns } = this;
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({
                        content: `⏳ Vui lòng đợi! Bạn thao tác quá nhanh. Có thể dùng lại lệnh này lúc <t:${expiredTimestamp}:T> (<t:${expiredTimestamp}:R>).`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            // --------------------------------

            try {
                await command.execute(interaction, this);
            } catch (error) {
                await this.commandErrorHandler.handle(error, {
                    interaction,
                    command
                });
            }
        });

        this.on(Events.MessageCreate, async (message) => {
            const handledCommand = await this.messageCommandHandler.handle(message);
            if (!handledCommand) await this.wordChainMessageHandler.handle(message);
        });

        await this.login(token);
        this.logger.info('Discord login requested');
    }

    destroy() {
        this.scheduler?.stop();
        return super.destroy();
    }
}
