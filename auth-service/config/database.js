const { Sequelize } = require('sequelize');

// Mengambil settingan dari docker-compose.yml
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'auth_db',
  process.env.POSTGRES_USER || 'user',
  process.env.POSTGRES_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'db-auth', // Nama service di docker-compose
    dialect: 'postgres',
    logging: false, // Matikan log SQL biar terminal bersih
  }
);

module.exports = sequelize;