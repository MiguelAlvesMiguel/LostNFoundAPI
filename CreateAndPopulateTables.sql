-- Drop existing tables
DROP TABLE IF EXISTS Notificacao;
DROP TABLE IF EXISTS Pagamento;
DROP TABLE IF EXISTS Licitacao;
DROP TABLE IF EXISTS Leilao;
DROP TABLE IF EXISTS ObjetoAchado;
DROP TABLE IF EXISTS ObjetoPerdido;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS MembroPolicia;
DROP TABLE IF EXISTS PostoPolicia;
DROP TABLE IF EXISTS Utilizador;

-- Create tables
CREATE TABLE Utilizador
(
    firebase_uid VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    data_nasc DATE NOT NULL,
    morada VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telemovel VARCHAR(20) NOT NULL,
    historico TEXT,
    ativo BOOLEAN NOT NULL,
    isCop BOOLEAN NOT NULL DEFAULT FALSE,
    isAdmin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE PostoPolicia
(
    ID SERIAL PRIMARY KEY,
    morada VARCHAR(255)
);

CREATE TABLE MembroPolicia
(
    ID SERIAL PRIMARY KEY,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    posto_policia INT NOT NULL REFERENCES PostoPolicia(ID) ON DELETE CASCADE,
    historico_policia JSONB
);

CREATE TABLE ObjetoPerdido
(
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

CREATE TABLE ObjetoAchado
(
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
    policial_id INT REFERENCES MembroPolicia(ID),
    claimant_id VARCHAR(255) REFERENCES Utilizador(firebase_uid) DEFAULT NULL,
    data_claimed DATE DEFAULT NULL,
    imageURL TEXT
);

CREATE TABLE Leilao
(
    ID SERIAL PRIMARY KEY,
    objeto_achado_id INT NOT NULL REFERENCES ObjetoAchado(ID) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    localizacao TEXT NOT NULL,
    valor_base DECIMAL(10, 2) NOT NULL,
    ativo BOOLEAN NOT NULL
);

CREATE TABLE Licitacao
(
    ID SERIAL PRIMARY KEY,
    leilao_id INT NOT NULL REFERENCES Leilao(ID) ON DELETE CASCADE,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    valor_licitacao DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Notificacao
(
    ID SERIAL PRIMARY KEY,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    data TIMESTAMP NOT NULL
);

CREATE TABLE Pagamento
(
    ID SERIAL PRIMARY KEY,
    licitacao_id INT NOT NULL REFERENCES Licitacao(ID) ON DELETE CASCADE,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(firebase_uid) ON DELETE CASCADE,
    -- User who made the payment
    data_pagamento DATE,
    valor DECIMAL(10, 2) NOT NULL,
    ativo BOOLEAN NOT NULL
    -- true if payment was made, false if it wasnt made yet
);

-- Delete all rows from the tables, respecting the foreign key constraints
DELETE FROM Pagamento;
DELETE FROM Licitacao;
DELETE FROM Notificacao;
DELETE FROM Leilao;
DELETE FROM ObjetoAchado;
DELETE FROM ObjetoPerdido;
DELETE FROM MembroPolicia;
DELETE FROM PostoPolicia;
DELETE FROM Utilizador;

-- Reset sequences for all tables that have SERIAL primary key
ALTER SEQUENCE postopolicia_id_seq RESTART WITH 1;
ALTER SEQUENCE objetoperdido_id_seq RESTART WITH 1;
ALTER SEQUENCE objetoachado_id_seq RESTART WITH 1;
ALTER SEQUENCE leilao_id_seq RESTART WITH 1;
ALTER SEQUENCE licitacao_id_seq RESTART WITH 1;
ALTER SEQUENCE notificacao_id_seq RESTART WITH 1;
ALTER SEQUENCE membropolicia_id_seq RESTART WITH 1;
ALTER SEQUENCE pagamento_id_seq RESTART WITH 1;

-- Insert data into tables in the correct order

-- First, insert into Utilizador since other tables reference it
INSERT INTO Utilizador
    (firebase_uid, nome, genero, data_nasc, morada, email, telemovel, ativo, isCop, isAdmin)
VALUES
    ('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 'John Doe', 'Masculino', '1990-01-15', '1234 Main St, Lisbon', 'hmmsm@example.com', '+351 912 345 678', TRUE, TRUE, TRUE),
    ('bofinha1', 'Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'aa@gmail.com', '+351 923 456 789', TRUE, FALSE, FALSE),
    ('uid2', 'Jane Doe', 'Feminino', '1990-02-20', '5678 Side St, Lisbon', 'jane.doe@example.com', '+351 923 456 789', TRUE, FALSE, FALSE),
    ('uid3', 'Alice Smith', 'Feminino', '1985-03-30', '7890 Center St, Lisbon', 'alice.smith@example.com', '+351 934 567 890', TRUE, FALSE, FALSE),
    ('uid4', 'Bob Johnson', 'Masculino', '1975-04-25', '1011 Up St, Lisbon', 'bob.johnson@example.com', '+351 945 678 901', TRUE, FALSE, FALSE);

-- Then insert into PostoPolicia since MembroPolicia references it
INSERT INTO PostoPolicia
    (morada)
VALUES
    ('987 Secondary St, Lisbon');

-- Now, insert into MembroPolicia
-- Assuming the posto_policia ID for '987 Secondary St, Lisbon' is 1
INSERT INTO MembroPolicia
    (utilizador_id, posto_policia, historico_policia)
VALUES
    ('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 1, '{"yearsService": 10, "commendations": ["Bravery", "Long Service"]}');

-- Then we can populate ObjetoPerdido
INSERT INTO ObjetoPerdido
    (titulo, descricao_curta, descricao, categoria, data_perdido, localizacao_perdido, ativo, utilizador_id)
VALUES
    ('Lost Wallet', 'Black leather wallet', 'A black leather wallet containing multiple cards and some cash.', 'Personal Items', '2024-05-01', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Phone', 'Samsung Galaxy S20', 'A Samsung Galaxy S20 smartphone with a black case.', 'Electronics', '2024-05-05', '{"latitude": 51.5074, "longitude": -0.1278}', TRUE, 'uid2'),
    ('Lost Watch', 'Black applewatch', 'A black applewatch with a black plastic band.', 'Accessories', '2024-01-15', '{"latitude": 40.730610, "longitude": -73.935242}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Backpack', 'Blue backpack', 'A blue backpack with multiple compartments, containing books and a laptop.', 'Bags', '2024-01-20', '{"latitude": 34.052235, "longitude": -118.243683}', TRUE, 'uid2'),
    ('Lost Glasses', 'Prescription glasses', 'A pair of prescription glasses with a black frame.', 'Personal Items', '2024-06-10', '{"latitude": 37.7749, "longitude": -122.4194}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Camera', 'Canon DSLR', 'A Canon DSLR camera lost in a park.', 'Electronics', '2024-05-22', '{"latitude": 34.0522, "longitude": -118.2437}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Tablet', 'iPad Pro', 'An iPad Pro lost in a coffee shop.', 'Electronics', '2024-04-30', '{"latitude": 51.1657, "longitude": 10.4515}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Earrings', 'Gold hoop earrings', 'A pair of gold hoop earrings.', 'Accessories', '2024-03-15', '{"latitude": 40.7128, "longitude": -74.0060}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Laptop', 'Dell XPS 13', 'A Dell XPS 13 laptop with a grey finish.', 'Electronics', '2024-02-28', '{"latitude": 48.8566, "longitude": 2.3522}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3'),
    ('Lost Bracelet', 'Silver charm bracelet', 'A silver charm bracelet with multiple charms.', 'Accessories', '2024-01-10', '{"latitude": 41.9028, "longitude": 12.4964}', TRUE, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3');

-- Populate ObjetoAchado
INSERT INTO ObjetoAchado
    (titulo, descricao_curta, descricao, categoria, data_achado, localizacao_achado, data_limite, ativo, valor_monetario, policial_id,imageURL)
VALUES
    ('Found Keychain', 'Keychain with several keys', 'A keychain with several keys found near a park.', 'Personal Items', '2024-05-02', '{"latitude": 48.8566, "longitude": 2.3522}', '2024-06-02', TRUE, 10.00, 1, 'https://i0.wp.com/www.wynnslocksmiths.com.au/wp-content/uploads/2020/09/howmanykeys.jpg?fit=750%2C500&ssl=1'),
    ('Found Laptop', 'Apple MacBook Pro', 'An Apple MacBook Pro found in a coffee shop.', 'Electronics', '2024-05-06', '{"latitude": 35.6895, "longitude": 139.6917}', '2024-06-06', FALSE, 2000.00, 1, 'https://www.istore.pt/media/catalog/product/m/b/mbp-silver-select-202011_6.jpg'),
    ('Found Watch', 'Black applewatch', 'A black applewatch with a black plastic band found near a park.', 'Accessories', '2024-01-16', '{"latitude": 40.730610, "longitude": -73.935242}', '2024-06-16', TRUE, 50.00, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg/1200px-Apple_Watch_Series_8_Midnight_Aluminium_Case.jpg'),
    ('Found PS Controller', 'DualSense 5' , 'A white Playstation Controller lost near the football stadium', 'Accessories', '2024-01-16', '{"latitude": 40.730610, "longitude": -73.935242}', '2024-06-16', TRUE, 70.00, 1, 'https://gmedia.playstation.com/is/image/SIEPDC/dualsense-controller-product-thumbnail-01-en-14sep21?$facebook$'),
    ('Found Backpack', 'Blue backpack', 'A blue backpack with multiple compartments found in a library.', 'Bags', '2024-01-28', '{"latitude": 34.052235, "longitude": -118.243683}', '2024-06-21', TRUE, 100.00, 1, 'https://www.thule.com/-/p/z0NmKpVcbr63LZtQKChfJ_NA3cVhCISBmMx2CArJ2_4/rs:fit/h:991/cb:1.4/w:991/plain/approved/std.lang.all/18/04/1381804.png'),
    ('Found Sunglasses', 'Ray-Ban sunglasses', 'A pair of Ray-Ban sunglasses with a black frame found on a beach.', 'Accessories', '2024-05-18', '{"latitude": 36.7783, "longitude": -119.4179}', '2024-06-18', TRUE, 150.00, 1, 'https://images2.ray-ban.com//cdn-record-files-pi/33e4b677-cb7e-45c9-ba69-b07c006dad70/fa830050-a23e-41af-b8d3-b07c006db041/0RW4006__601ST3__P21__shad__qt.png?impolicy=RB_Product_clone&width=400&bgc=%23f2f2f2'),
    ('Found Wallet', 'Leather wallet', 'A brown leather wallet with several cards found in a taxi.', 'Personal Items', '2024-04-10', '{"latitude": 51.5074, "longitude": -0.1278}', '2024-05-10', TRUE, 75.00, 1, 'https://m.media-amazon.com/images/I/61FYZfAMdoL._AC_UY1000_.jpg'),
    ('Found Tablet', 'Samsung Galaxy Tab', 'A Samsung Galaxy Tab found in an airport lounge.', 'Electronics', '2024-06-15', '{"latitude": 40.6413, "longitude": -73.7781}', '2024-07-15', TRUE, 300.00, 1, 'https://www.worten.pt/i/6eb461781fea55de6feabee630fe500a01baf25f.jpg'),
    ('Found Camera', 'Nikon DSLR', 'A Nikon DSLR camera found near a tourist spot.', 'Electronics', '2024-03-22', '{"latitude": 48.8584, "longitude": 2.2945}', '2024-04-22', TRUE, 500.00, 1, 'https://static.fnac-static.com/multimedia/Images/PT/NR/63/64/4d/5071971/1541-3.jpg'),
    ('Found Book', 'Mystery novel', 'A mystery novel book found in a train station.', 'Personal Items', '2024-02-27', '{"latitude": 34.0522, "longitude": -118.2437}', '2024-03-27', TRUE, 20.00, 1, 'https://assets.brightspot.abebooks.a2z.com/dims4/default/24dc5fd/2147483647/strip/true/crop/300x451+0+9/resize/253x380!/quality/90/?url=http%3A%2F%2Fabebooks-brightspot.s3.us-west-2.amazonaws.com%2F66%2F88%2F6f3ee717225071ede5ef887c4320%2Farthur-conan-doyle.jpg');

-- Populate Leilao with multiple rows for different statuses
INSERT INTO Leilao
    (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo)
VALUES
    -- Past Auctions
    (1, '2023-04-01', '2023-04-10', 'Online', 15.00, FALSE),
    (2, '2023-03-01', '2023-03-10', 'Online', 150.00, FALSE),
    -- Active Auctions
    (3, '2024-05-10', '2024-07-20', 'Online', 50.00, TRUE),
    (4, '2024-05-01', '2024-07-15', 'Online', 100.00, TRUE),
    -- Future Auctions
    (1, '2024-08-01', '2024-08-10', 'Online', 25.00, FALSE),
    (2, '2024-08-15', '2024-08-25', 'Online', 300.00, FALSE);

-- Insert more auctions for each type of status
INSERT INTO Leilao
    (objeto_achado_id, data_inicio, data_fim, localizacao, valor_base, ativo)
VALUES
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
INSERT INTO Licitacao
    (leilao_id, utilizador_id, valor_licitacao)
VALUES
    (1, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 50.00),
    (2, 'uid2', 175.00),
    (3, '1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 250.00),
    (4, 'uid2', 60.00),
    (3, 'uid3', 75.00),
    (4, 'uid4', 100.00),
    (1, 'uid3', 30.00),
    (2, 'uid4', 120.00);

-- Finally, insert into Notificacao, which references Utilizador
INSERT INTO Notificacao
    (utilizador_id, mensagem, data)
VALUES
    ('1MJlbIhHHMPOMgxzUgjx35Ijq9D3', 'New auction available', '2024-05-15 10:00:00'),
    ('uid2', 'Item found matching your lost item description', '2024-05-16 15:30:00');
