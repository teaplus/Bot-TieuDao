import 'dotenv/config';
import ExtendedClient from './core/ExtendedClient.js';

const client = new ExtendedClient();
client.start(process.env.DISCORD_TOKEN);