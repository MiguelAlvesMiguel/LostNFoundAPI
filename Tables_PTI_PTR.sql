/** CREATE TABLES **/

DROP TABLE IF EXISTS Notificacao;
DROP TABLE IF EXISTS Licitacao;
DROP TABLE IF EXISTS Leilao;
DROP TABLE IF EXISTS ObjetoAchado;
DROP TABLE IF EXISTS ObjetoPerdido;
DROP TABLE IF EXISTS MembroPolicia;
DROP TABLE IF EXISTS PostoPolicia;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS Utilizador;

CREATE TABLE Utilizador
(
    ID VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    data_nasc DATE NOT NULL,
    morada VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telemovel VARCHAR(20) NOT NULL, -- e.g.: +351 123 456 789
    historico TEXT,
    ativo BOOLEAN NOT NULL
);

CREATE TABLE PostoPolicia
(
    ID SERIAL PRIMARY KEY,
    morada VARCHAR(255)
);

CREATE TABLE MembroPolicia
(
    ID VARCHAR(255) PRIMARY KEY REFERENCES Utilizador(ID) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    posto_policia INT NOT NULL REFERENCES PostoPolicia(ID),
    historico_policia JSONB
);

CREATE TABLE Admin
(
    adminId SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE
);

CREATE TABLE ObjetoPerdido
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_perdido DATE NOT NULL,
    localizacao_perdido JSONB NOT NULL, -- onde foi perdido o objeto
    ativo BOOLEAN NOT NULL, -- se o objeto ainda nao foi encontrado
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE
);

CREATE TABLE ObjetoAchado
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_achado DATE NOT NULL,
    localizacao_achado JSONB NOT NULL, -- onde foi achado o objeto
    data_limite DATE NOT NULL, -- data limite para o objeto ser reclamado
    ativo BOOLEAN NOT NULL, -- se o objeto ainda nao foi reclamado
    policial_id VARCHAR(255) NOT NULL REFERENCES MembroPolicia(ID) ON DELETE CASCADE
);

CREATE TABLE Leilao
(
    ID SERIAL PRIMARY KEY,
    objeto_achado_id INT NOT NULL REFERENCES ObjetoAchado(ID) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    localizacao TEXT NOT NULL,
    ativo BOOLEAN NOT NULL
);

CREATE TABLE Licitacao
(
    ID SERIAL PRIMARY KEY,
    leilao_id INT NOT NULL REFERENCES Leilao(ID) ON DELETE CASCADE,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE,
    valor_licitacao DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Notificacao
(
    ID SERIAL PRIMARY KEY,
    utilizador_id VARCHAR(255) NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    data TIMESTAMP NOT NULL
);
