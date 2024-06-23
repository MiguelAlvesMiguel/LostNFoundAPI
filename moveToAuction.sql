-- Start a transaction to ensure all operations are atomic
BEGIN;

-- Select items eligible for auction and update their active status
WITH EligibleItems AS (
    SELECT ID
    FROM ObjetoAchado
    WHERE data_limite < CURRENT_DATE
      AND ativo = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM Leilao
        WHERE objeto_achado_id = ObjetoAchado.ID
          AND ativo = TRUE
      )
)
UPDATE ObjetoAchado
SET ativo = FALSE
WHERE ID IN (SELECT ID FROM EligibleItems);

-- Insert into Leilao table using the items identified earlier
INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo)
SELECT ID, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 'Online', valor_monetario, TRUE
FROM ObjetoAchado
WHERE ID IN (SELECT ID FROM EligibleItems);

-- Commit the transaction to finalize the changes
COMMIT;
