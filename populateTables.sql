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

-- Insert data into tables in the correct order

-- First, insert into Utilizador since other tables reference it
INSERT INTO Utilizador (ID, nome, genero, data_nasc, morada, email, telemovel, ativo) VALUES
('user-12345', 'John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'john.doe@example.com', '+351 912 345 678', TRUE),
('6f5f90c34KUCXNxzd3hEMY6OBSs2', 'Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'jane.doe@example.com', '+351 923 456 789', TRUE);

-- Then insert into PostoPolicia since MembroPolicia references it
INSERT INTO PostoPolicia (morada) VALUES ('987 Secondary St, Lisbon');

-- Now, insert into MembroPolicia since ObjetoAchado references it
-- Assuming the posto_policia ID for '987 Secondary St, Lisbon' is 1
INSERT INTO MembroPolicia (ID, nome, posto_policia, historico_policia) VALUES
('police-67890', 'Officer Miguel', 1, '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}');

-- Insert into Admin, which references Utilizador
INSERT INTO Admin (nome, utilizador_id) VALUES ('Admin Geral', 'user-12345');

-- Then we can populate ObjetoPerdido
INSERT INTO ObjetoPerdido (descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id) VALUES
('Lost Wallet', 'Personal Items', '2023-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, 'user-12345'),
('Lost Phone', 'Electronics', '2023-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', TRUE, 'user-12345');

-- Populate ObjetoAchado
INSERT INTO ObjetoAchado (descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, policial_id) VALUES
('Found Keychain', 'Personal Items', '2023-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2023-06-02', TRUE, '10', 'police-67890'),
('Found Laptop', 'Electronics', '2023-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2023-06-06', TRUE, '10', 'police-67890');

-- Assuming the IDs for the ObjetoAchado are 1 and 2 respectively
-- Populate Leilao
INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, ativo) VALUES
(1, '2023-05-10', '2023-05-20', 'Online', '9', TRUE),
(2, '2023-05-15', '2023-05-25', 'Physical Location', '9', TRUE);

-- Now, we can insert into Licitacao since it references Leilao and Utilizador
-- Assuming the IDs for the Leilao are 1 and 2 respectively
INSERT INTO Licitacao (leilao_id, utilizador_id, valor_licitacao) VALUES
(1, 'user-12345', 50.00),
(1, '6f5f90c34KUCXNxzd3hEMY6OBSs2', 75.00),
(2, 'user-12345', 100.00);

-- Finally, insert into Notificacao, which references Utilizador
INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES
('user-12345', 'New auction available', '2023-06-01 10:00:00'),
('6f5f90c34KUCXNxzd3hEMY6OBSs2', 'Item found matching your lost item description', '2023-06-02 15:30:00');
