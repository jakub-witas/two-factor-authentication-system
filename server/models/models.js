const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');

const Users = sequelize.define('Users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: sequelize.literal("nextval('USERS_SEQ')")
    },
    email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING(60),
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }    
}, {
    timestamps: false,
    tableName: 'users'
});

(async () => {
    await sequelize.sync({ alter: true });
    console.log("Database synced.");
})();

module.exports = {
    sequelize,
    Users
};
