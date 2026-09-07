require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log("PostgresDB connected to database: " + process.env.DB_DATABASE + " via Sequelize.");
    } catch (err) {
        console.error("Error connecting to database: " + process.env.DB_DATABASE + ", message: " + err);
    }
})();

module.exports = sequelize;