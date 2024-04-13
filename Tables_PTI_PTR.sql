/** CREATE TABLES **/

DROP TABLE IF EXISTS Utilizador;
CREATE TABLE Utilizador
(
    ID SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    data_nasc DATE NOT NULL,
    morada VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telemovel VARCHAR(20) NOT NULL, -- e.g.: +351 123 456 789
    historico TEXT,
    ativo BOOLEAN NOT NULL
);

DROP TABLE IF EXISTS PostoPolicia;
CREATE TABLE PostoPolicia
(
    ID SERIAL PRIMARY KEY,
    morada VARCHAR(255)
);

DROP TABLE IF EXISTS MembroPolicia;
CREATE TABLE MembroPolicia
(
    ID INT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    posto_policia INT NOT NULL REFERENCES PostoPolicia(ID),
    historico_policia JSONB,
    FOREIGN KEY (ID) REFERENCES Utilizador(ID) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Admin;
CREATE TABLE Admin
(
    adminId SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

DROP TABLE IF EXISTS ObjetoPerdido;
CREATE TABLE ObjetoPerdido
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_perdido DATE NOT NULL,
    localizacao_perdido JSONB NOT NULL, -- onde foi perdido o objeto
    ativo BOOLEAN NOT NULL -- se o objeto ainda nao foi encontrado
);

DROP TABLE IF EXISTS ObjetoAchado;
CREATE TABLE ObjetoAchado
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_achado DATE NOT NULL,
    localizacao_achado JSONB NOT NULL, -- onde foi achado o objeto
    data_limite DATE NOT NULL, -- data limite para o objeto ser reclamado
    ativo BOOLEAN NOT NULL -- se o objeto ainda nao foi reclamado
);

DROP TABLE IF EXISTS Leilao;
CREATE TABLE Leilao
(
    ID SERIAL PRIMARY KEY,
    objeto_achado_id INT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    localizacao TEXT NOT NULL,
    ativo BOOLEAN NOT NULL,
    FOREIGN KEY (objeto_achado_id) REFERENCES ObjetoAchado(ID) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Licitacao;
CREATE TABLE Licitacao
(
    ID SERIAL PRIMARY KEY,
    leilao_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    valor_licitacao DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (leilao_id) REFERENCES Leilao(ID) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES Utilizador(ID) ON DELETE CASCADE
);