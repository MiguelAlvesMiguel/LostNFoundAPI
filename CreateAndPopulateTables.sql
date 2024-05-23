-- Drop existing tables
DROP TABLE IF EXISTS Notificacao;
DROP TABLE IF EXISTS Licitacao;
DROP TABLE IF EXISTS Leilao;
DROP TABLE IF EXISTS ObjetoAchado;
DROP TABLE IF EXISTS ObjetoPerdido;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS MembroPolicia;
DROP TABLE IF EXISTS PostoPolicia;
DROP TABLE IF EXISTS Utilizador;

-- Create tables
CREATE TABLE Utilizador (
    firebase_uid VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    data_nasc DATE NOT NULL,
    morada VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telemovel VARCHAR(20) NOT NULL,
    historico TEXT,
    ativo BOOLEAN NOT NULL
);

CREATE TABLE PostoPolicia (
    ID SERIAL PRIMARY KEY,
    morada VARCHAR(255)
);

CREATE TABLE MembroPolicia (
    ID SERIAL PRIMARY KEY,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    posto_policia INT NOT NULL REFERENCES PostoPolicia(ID),
    historico_policia JSONB
);

CREATE TABLE Admin (
    adminId SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE
);

CREATE TABLE ObjetoPerdido (
    ID SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao_curta TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_perdido DATE NOT NULL,
    localizacao_perdido JSONB NOT NULL,
    ativo BOOLEAN NOT NULL,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE
);

CREATE TABLE ObjetoAchado (
    ID SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao_curta TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_achado DATE NOT NULL,
    localizacao_achado JSONB NOT NULL,
    data_limite DATE NOT NULL,
    ativo BOOLEAN NOT NULL,
    valor_monetario DECIMAL(10, 2),
    policial_id INT NOT NULL REFERENCES MembroPolicia(ID) ON DELETE CASCADE,
    imageURL TEXT
);

CREATE TABLE Leilao (
    ID SERIAL PRIMARY KEY,
    objeto_achado_id INT NOT NULL REFERENCES ObjetoAchado(ID) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    localizacao TEXT NOT NULL,
    valor_base DECIMAL(10, 2) NOT NULL,
    ativo BOOLEAN NOT NULL
);

CREATE TABLE Licitacao (
    ID SERIAL PRIMARY KEY,
    leilao_id INT NOT NULL REFERENCES Leilao(ID) ON DELETE CASCADE,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    valor_licitacao DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Notificacao (
    ID SERIAL PRIMARY KEY,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    data TIMESTAMP NOT NULL
);

-- Delete all rows from the tables, respecting the foreign key constraints
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

-- Insert data into tables in the correct order

-- First, insert into Utilizador since other tables reference it
INSERT INTO Utilizador (firebase_uid, nome, genero, data_nasc, morada, email, telemovel, ativo) VALUES
('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 'John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'hmmsm@example.com', '+351 912 345 678', TRUE),
('bofinha1', 'Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon','aa@gmail.com', '+351 923 456 789', TRUE),
('uid2', 'Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'jane.doe@example.com', '+351 923 456 789', TRUE),
('uid3', 'Alice Smith', 'Feminino', '1985-03-30', '7890 Center St, Lisbon', 'alice.smith@example.com', '+351 934 567 890', TRUE),
('uid4', 'Bob Johnson', 'Masculino', '1975-04-25', '1011 Up St, Lisbon', 'bob.johnson@example.com', '+351 945 678 901', TRUE);

-- Then insert into PostoPolicia since MembroPolicia references it
INSERT INTO PostoPolicia (morada) VALUES ('987 Secondary St, Lisbon');

-- Now, insert into MembroPolicia
-- Assuming the posto_policia ID for '987 Secondary St, Lisbon' is 1
INSERT INTO MembroPolicia (utilizador_id, posto_policia, historico_policia) 
VALUES 
('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 1, '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}');

-- Insert into Admin, which references Utilizador
INSERT INTO Admin (nome, utilizador_id) VALUES ('Admin Geral', '1MJlbIhHHMPOMgxzUgjx35Ijq9D3');

-- Then we can populate ObjetoPerdido
INSERT INTO ObjetoPerdido (titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id) VALUES
('Lost Wallet', 'Black leather wallet', 'A black leather wallet containing multiple cards and some cash.', 'Personal Items', '2024-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
('Lost Phone', 'Samsung Galaxy S20', 'A Samsung Galaxy S20 smartphone with a black case.', 'Electronics', '2024-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', TRUE, 'uid2'),
('Lost Watch', 'Black applewatch', 'A black applewatch with a black plastic band.', 'Accessories', '2024-01-15', '{"latitude": 40.730610, "longitude": -73.935242}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
('Lost Backpack', 'Blue backpack', 'A blue backpack with multiple compartments, containing books and a laptop.', 'Bags', '2024-01-20', '{"latitude": 34.052235, "longitude": -118.243683}', TRUE, 'uid2');

-- Populate ObjetoAchado
INSERT INTO ObjetoAchado (titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id, imageURL) VALUES
('Found Keychain', 'Keychain with several keys', 'A keychain with several keys found near a park.', 'Personal Items', '2024-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2024-06-02', TRUE, 10.00, 1, 'https://i.insider.com/602ee9ced3ad27001837f2ac?width=700'),
('Found Laptop', 'Apple MacBook Pro', 'An Apple MacBook Pro found in a coffee shop.', 'Electronics', '2024-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2024-06-06', FALSE, 2000.00, 1, 'https://i.insider.com/602ee9ced3ad27001837f2ac?width=700'),
('Found Watch', 'Black applewatch', 'A black applewatch with a black plastic band found near a park.', 'Accessories', '2024-01-16', '{"latitude": 40.730610, "longitude": -73.935242}', '2024-06-16', TRUE, 50.00, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg/1200px-Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg'),
('Found Backpack', 'Blue backpack', 'A blue backpack with multiple compartments found in a library.', 'Bags', '2024-01-28', '{"latitude": 34.052235, "longitude": -118.243683}', '2024-06-21', TRUE, 100.00, 1, 'https://www.thule.com/-/p/z0NmKpVcbr63LZtQKChfJ_NA3cVhCISBmMx2CArJ2_4/rs:fit/h:991/cb:1.4/w:991/plain/approved/std.lang.all/18/04/1381804.png');

-- Populate Leilao with multiple rows for different statuses
INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo) VALUES
-- Past Auctions
(1, '2023-04-01', '2023-04-10', 'Online', 15.00, FALSE),
(2, '2023-03-01', '2023-03-10', 'Online', 150.00, FALSE),
-- Active Auctions
(3, '2024-05-10', '2024-05-20', 'Online', 50.00, TRUE),
(4, '2024-05-01', '2024-05-15', 'Online', 100.00, TRUE),
-- Future Auctions
(1, '2024-06-01', '2024-06-10', 'Online', 25.00, FALSE),
(2, '2024-06-15', '2024-06-25', 'Online', 300.00, FALSE);

-- Insert more auctions for each type of status
INSERT INTO Leilao (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo) VALUES
-- Additional Past Auctions
(3, '2023-02-01', '2023-02-10', 'Online', 20.00, FALSE),
(4, '2023-01-01', '2023-01-10', 'Online', 75.00, FALSE),
-- Additional Active Auctions
(1, '2024-05-05', '2024-05-15', 'Online', 200.00, TRUE),
(2, '2024-05-01', '2024-05-20', 'Online', 10.00, TRUE),
-- Additional Future Auctions
(3, '2024-07-01', '2024-07-10', 'Online', 150.00, FALSE),
(4, '2024-08-01', '2024-08-10', 'Online', 500.00, FALSE);

-- Now, we can insert into Licitacao since it references Leilao and Utilizador
INSERT INTO Licitacao (leilao_id, utilizador_id, valor_licitacao) VALUES
(1, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 50.00),
(2, 'uid2', 175.00),
(3, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 250.00),
(4, 'uid2', 60.00),
(3, 'uid3', 75.00),
(4, 'uid4', 100.00),
(1, 'uid3', 30.00),
(2, 'uid4', 120.00);

-- Finally, insert into Notificacao, which references Utilizador
INSERT INTO Notificacao (utilizador_id, mensagem, data) VALUES
('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 'New auction available', '2024-05-15 10:00:00'),
('uid2', 'Item found matching your lost item description', '2024-05-16 15:30:00');
