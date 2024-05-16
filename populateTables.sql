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
ALTER SEQUENCE utilizador_id_seq RESTART WITH 1;
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
INSERT INTO Utilizador
    (nome, genero, data_nasc, morada, email, telemovel, ativo)
VALUES
    ('John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'john.doe@example.com', '+351 912 345 678', TRUE),
    ('Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'jane.doe@example.com', '+351 923 456 789', TRUE);

-- Then insert into PostoPolicia since MembroPolicia references it
INSERT INTO PostoPolicia
    (morada)
VALUES
    ('987 Secondary St, Lisbon');

-- Now, insert into MembroPolicia since ObjetoAchado references it
-- Assuming the posto_policia ID for '987 Secondary St, Lisbon' is 1
INSERT INTO MembroPolicia
    (nome, posto_policia, historico_policia)
VALUES
    ('Officer Miguel', 1, '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}');

-- Insert into Admin, which references Utilizador
INSERT INTO Admin
    (nome, utilizador_id)
VALUES
    ('Admin Geral', 1);

-- Then we can populate ObjetoPerdido
INSERT INTO ObjetoPerdido
    (titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id)
VALUES
    ('Lost Wallet', 'Black leather wallet', 'A black leather wallet containing multiple cards and some cash.', 'Personal Items', '2024-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, 1),
    ('Lost Phone', 'Samsung Galaxy S20', 'A Samsung Galaxy S20 smartphone with a black case.', 'Electronics', '2024-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', TRUE, 2),
    ('Lost Watch', 'Black applewatch', 'A black applewatch with a black plastic band.', 'Accessories', '2024-01-15', '{"latitude": 40.730610, "longitude": -73.935242}', TRUE, 1),
    ('Lost Backpack', 'Blue backpack', 'A blue backpack with multiple compartments, containing books and a laptop.', 'Bags', '2024-01-20', '{"latitude": 34.052235, "longitude": -118.243683}', TRUE, 2);


--populate ObjetoAchado
INSERT INTO ObjetoAchado
    (titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id, imageURL)
VALUES
    ('Found Keychain', 'Keychain with several keys', 'A keychain with several keys found near a park.', 'Personal Items', '2024-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2024-06-02', TRUE, 10.00, 1, 'https://i.insider.com/602ee9ced3ad27001837f2ac?width=700'),
    ('Found Laptop', 'Apple MacBook Pro', 'An Apple MacBook Pro found in a coffee shop.', 'Electronics', '2024-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2024-06-06', FALSE, 2000.00, 1, 'https://i.insider.com/602ee9ced3ad27001837f2ac?width=700'),
    ('Found Watch', 'Black applewatch', 'A black applewatch with a black plastic band found near a park.', 'Accessories', '2024-01-16', '{"latitude": 40.730610, "longitude": -73.935242}', '2024-06-16', TRUE, 50.00, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg/1200px-Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg'),
    ('Found Backpack', 'Blue backpack', 'A blue backpack with multiple compartments found in a library.', 'Bags', '2024-01-28', '{"latitude": 34.052235, "longitude": -118.243683}', '2024-06-21', TRUE, 100.00, 1, 'https://www.thule.com/-/p/z0NmKpVcbr63LZtQKChfJ_NA3cVhCISBmMx2CArJ2_4/rs:fit/h:991/cb:1.4/w:991/plain/approved/std.lang.all/18/04/1381804.png');


-- Assuming the IDs for the ObjetoAchado are 1 and 2 respectively
-- Populate Leilao
INSERT INTO Leilao
    (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo)
VALUES
    (2, '2024-06-07', '2024-06-20', 'Online', 10.00, TRUE);

-- Now, we can insert into Licitacao since it references Leilao and Utilizador
-- Assuming the IDs for the Leilao are 1 and 2 respectively
INSERT INTO Licitacao
    (leilao_id, utilizador_id, valor_licitacao)
VALUES
    (1, 1, 50.00);

-- Finally, insert into Notificacao, which references Utilizador
INSERT INTO Notificacao
    (utilizador_id, mensagem, data)
VALUES
    (1, 'New auction available', '2023-06-01 10:00:00'),
    (2, 'Item found matching your lost item description', '2023-06-02 15:30:00');