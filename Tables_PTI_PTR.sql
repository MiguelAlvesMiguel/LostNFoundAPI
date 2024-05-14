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
CREATE TABLE Utilizador
(
    ID SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    genero VARCHAR(50) NOT NULL,
    data_nasc DATE NOT NULL,
    morada VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telemovel VARCHAR(20) NOT NULL,
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
    ID SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    posto_policia INT NOT NULL REFERENCES PostoPolicia(ID),
    historico_policia JSONB
);

CREATE TABLE Admin
(
    adminId SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    utilizador_id INT NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE
);

CREATE TABLE ObjetoPerdido
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_perdido DATE NOT NULL,
    localizacao_perdido JSONB NOT NULL,
    ativo BOOLEAN NOT NULL,
    utilizador_id INT NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE
);

CREATE TABLE ObjetoAchado
(
    ID SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    data_achado DATE NOT NULL,
    localizacao_achado JSONB NOT NULL,
    data_limite DATE NOT NULL,
    ativo BOOLEAN NOT NULL,
    valor_monetario DECIMAL(10, 2),
    policial_id INT NOT NULL REFERENCES MembroPolicia(ID) ON DELETE CASCADE
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
    utilizador_id INT NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE,
    valor_licitacao DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Notificacao
(
    ID SERIAL PRIMARY KEY,
    utilizador_id INT NOT NULL REFERENCES Utilizador(ID) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    data TIMESTAMP NOT NULL
);