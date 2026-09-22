CREATE INDEX IF NOT EXISTS words_dictionary_revision_id_idx
ON words (lang_code, dictionary_revision, id);

CREATE INDEX IF NOT EXISTS words_dictionary_revision_first_part_idx
ON words (lang_code, dictionary_revision, first_part, id);
