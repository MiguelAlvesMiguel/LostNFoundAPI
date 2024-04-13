-- Populate Utilizador table
INSERT INTO Utilizador (nome, genero, data_nasc, morada, email, telemovel, historico, ativo)
VALUES
    ('John Doe', 'Male', '1990-01-01', '123 Main St', 'john@example.com', '+351 123 456 789', NULL, true),
    ('Jane Smith', 'Female', '1985-05-10', '456 Elm St', 'jane@example.com', '+351 987 654 321', NULL, true);

-- Populate PostoPolicia table
INSERT INTO PostoPolicia (morada)
VALUES
    ('789 Police St'),
    ('321 Law Enforcement Ave');

-- Populate MembroPolicia table
INSERT INTO MembroPolicia (ID, nome, posto_policia, historico_policia)
VALUES
    (1, 'Officer John', 1, '{"cases": ["Theft", "Assault"]}'),
    (2, 'Officer Jane', 2, '{"cases": ["Robbery", "Fraud"]}');

-- Populate Admin table
INSERT INTO Admin (nome)
VALUES
    ('Admin 1'),
    ('Admin 2');

-- Populate ObjetoPerdido table
INSERT INTO ObjetoPerdido (descricao, categoria, data_perdido, localizacao_perdido, ativo)
VALUES
    ('Lost Wallet', 'Personal Items', '2023-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', true),
    ('Lost Phone', 'Electronics', '2023-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', true);

-- Populate ObjetoAchado table
INSERT INTO ObjetoAchado (descricao, categoria, data_achado, localizacao_achado, data_limite, ativo)
VALUES
    ('Found Keychain', 'Personal Items', '2023-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2023-06-02', true),
    ('Found Laptop', 'Electronics', '2023-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2023-06-06', true);

-- Populate Leilao table
INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, ativo)
VALUES
    (1, '2023-05-10', '2023-05-20', 'Online', true),
    (2, '2023-05-15', '2023-05-25', 'Physical', true);

-- Populate Licitacao table
INSERT INTO Licitacao (leilao_id, utilizador_id, valor_licitacao)
VALUES
    (1, 1, 50.00),
    (1, 2, 75.00),
    (2, 1, 100.00);

INSERT INTO Notificacao (utilizador_id, mensagem, data)
VALUES
    (1, 'New auction available', '2023-06-01 10:00:00'),
    (2, 'Item found matching your lost item', '2023-06-02 15:30:00');