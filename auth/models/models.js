const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');

const Auth = sequelize.define('Auth', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: sequelize.literal("nextval('AUTH_SEQ')")
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    method: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    secret: { type: DataTypes.STRING, defaultValue: null },
    counter: { type: DataTypes.INTEGER, defaultValue: null }
}, {
    timestamps: false,
    tableName: 'auth'
});


(async () => {
    await sequelize.sync({ alter: true });
    console.log("Database synced.");
})();

module.exports = {
    sequelize,
    Auth
};
