const { Pool } = require("pg");

const pool = new Pool({
  user: "repmgr",
  host: "34.175.217.87",
  database: "repmgr",
  //password: "postgres",
  port: 5432, // default PostgreSQL port
});

module.exports = pool;

//criptografar ficheiro c credenciais da cloud e bd
//criar janela de instalacao a pedir estas credenciais e o user e guardar apenas no momento de configuração na cloud. se a pessoa tem acesso a cloud, tem acesso a isto
//ou fazer ficheiros vazios e depois na configuracao, substituir pelos ficheiros com credenciais. so no momento de deployment e que metemos a info. meter estas infos so num ficheiro (instanciar vms precisamos de credenciais, bd precisamos de credenciais, stripe precisamos de credenciais, firebase precisamos de credenciais). FAZER UM UNICO FICHEIRO CONFIG.JS
