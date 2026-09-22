ALTER TABLE word_chain_moves
    DROP CONSTRAINT IF EXISTS word_chain_moves_failure_consistent;

ALTER TABLE word_chain_moves
    ALTER COLUMN word_id DROP NOT NULL;

ALTER TABLE word_chain_moves
    ADD CONSTRAINT word_chain_moves_failure_consistent CHECK (
        (outcome = 'VALID' AND failure_reason IS NULL AND word_id IS NOT NULL)
        OR (
            outcome = 'QUALIFIED_FAILURE'
            AND (
                (failure_reason IN ('WRONG_LINK', 'WORD_ALREADY_USED') AND word_id IS NOT NULL)
                OR (failure_reason = 'NOT_IN_DICTIONARY' AND word_id IS NULL)
            )
        )
    );
