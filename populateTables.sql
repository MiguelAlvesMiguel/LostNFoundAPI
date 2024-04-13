-- Inserting a User
INSERT INTO Utilizador (ID, nome, genero, data_nasc, morada, email, telemovel, ativo)
VALUES
('user-12345', 'John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'john.doe@example.com', '+351 912 345 678', TRUE);
('6f5f90c34KUCXNxzd3hEMY6OBSs2', 'John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'test@test.com', '+351 912 345 678', 'No previous history', TRUE);

-- Inserting a Police Station
INSERT INTO PostoPolicia (morada)
VALUES
('987 Secondary St, Lisbon');

-- Inserting a Police Member (not a user)
INSERT INTO MembroPolicia (ID, nome, posto_policia, historico_policia)
VALUES
('police-67890', 'Officer Miguel', (SELECT ID FROM PostoPolicia WHERE morada = '987 Secondary St, Lisbon'), '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}'::jsonb);

-- Example of adding an Admin who is a user
INSERT INTO Admin (nome, utilizador_id)
VALUES
('Admin Geral', 'user-12345');

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