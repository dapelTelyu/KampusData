// academic-service/models/Sidang.js
const mongoose = require('mongoose');

const SidangSchema = new mongoose.Schema({
  nim: {
    type: String,
    required: true,
  },
  title: { // Judul Skripsi
    type: String,
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'REGISTERED'
  }
});

module.exports = mongoose.model('Sidang', SidangSchema);