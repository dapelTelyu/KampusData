// academic-service/models/Wisuda.js
const mongoose = require('mongoose');

const WisudaSchema = new mongoose.Schema({
  nim: {
    type: String,
    required: true,
    index: true,
  },
  period: {
    // Contoh: "2025/2026-Ganjil" atau "2026" atau "2026-01"
    type: String,
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    // REGISTERED -> (ADMIN) APPROVED/REJECTED -> FINISHED
    type: String,
    default: 'REGISTERED',
  },
});

// Satu mahasiswa idealnya hanya punya 1 pendaftaran wisuda per periode
WisudaSchema.index({ nim: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Wisuda', WisudaSchema);
