-- Delete all rows from the tables, respecting the foreign key constraints
-- Start with the tables that don't reference other tables, or that are only referenced by others.
DELETE FROM Licitacao;
DELETE FROM Notificacao;
DELETE FROM Leilao;
DELETE FROM ObjetoAchado;
DELETE FROM ObjetoPerdido;
DELETE FROM Admin;
DELETE FROM MembroPolicia;
DELETE FROM PostoPolicia;
DELETE FROM Utilizador;

-- Reset sequences for all tables that have SERIAL primary key
ALTER SEQUENCE postopolicia_id_seq RESTART WITH 1;
ALTER SEQUENCE admin_adminid_seq RESTART WITH 1;
ALTER SEQUENCE objetoperdido_id_seq RESTART WITH 1;
ALTER SEQUENCE objetoachado_id_seq RESTART WITH 1;
ALTER SEQUENCE leilao_id_seq RESTART WITH 1;
ALTER SEQUENCE licitacao_id_seq RESTART WITH 1;
ALTER SEQUENCE notificacao_id_seq RESTART WITH 1;
ALTER SEQUENCE membropolicia_id_seq RESTART WITH 1;
-- Assuming this is the correct sequence name


-- Insert data into tables in the correct order

-- First, insert into Utilizador since other tables reference it
-- Insert data into Utilizador
INSERT INTO Utilizador (nome, genero, data_nasc, morada, email, telemovel, ativo) VALUES
('John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'john.doe@example.com', '+351 912 345 678', TRUE),
('Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'jane.doe@example.com', '+351 923 456 789', TRUE);

INSERT INTO PostoPolicia (morada) VALUES
('987 Secondary St, Lisbon');

INSERT INTO MembroPolicia (nome, posto_policia, historico_policia) VALUES
('Officer Miguel', 1, '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}');

INSERT INTO Admin (nome, utilizador_id) VALUES
('Admin Geral', 1);

INSERT INTO ObjetoPerdido (descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id) VALUES
('Lost Wallet', 'Personal Items', '2023-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, 1),
('Lost Phone', 'Electronics', '2023-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', TRUE, 2);

INSERT INTO ObjetoAchado (descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id) VALUES
('Found Keychain', 'Personal Items', '2023-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2023-06-02', TRUE, 10.00, 1),
('Found Laptop', 'Electronics', '2023-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2023-06-06', FALSE, 2000.00, 1);

INSERT INTO Leilao
    (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo)
VALUES
    (1, '2024-02-01', '2024-03-01', 'Auction House, Main Street, Lisbon', 500.00, TRUE);

INSERT INTO Licitacao (leilao_id, utilizador_id, valor_licitacao) VALUES
(1, 1, 50.00), (1, 2, 60.00);

INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES
(1, 'New auction available', '2023-06-01 10:00:00'), (2, 'Item found matching your lost item description', '2023-06-02 15:30:00');