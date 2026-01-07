const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  nim: {
    type: String,
    required: true,
    unique: true, // NIM adalah kunci utama
  },
  fullName: {
    type: String,
    required: true,
  },
  major: {
    type: String,
    required: true, // Jurusan (Misal: S1 Sistem Informasi)
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'GRADUATED', 'DROPOUT', 'LEAVE'],
    default: 'ACTIVE', // Status default aktif
  }
});

module.exports = mongoose.model('Student', StudentSchema);