DROP INDEX IF EXISTS word_chain_sessions_one_active_channel;

CREATE UNIQUE INDEX IF NOT EXISTS word_chain_sessions_one_active_guild
ON word_chain_sessions (guild_id)
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS word_chain_sessions_active_channel_lookup
ON word_chain_sessions (guild_id, channel_id)
WHERE status = 'ACTIVE';
