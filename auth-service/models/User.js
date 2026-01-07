const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nim: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // NIM tidak boleh kembar
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'student', // Default role adalah mahasiswa
  },
});

module.exports = User;