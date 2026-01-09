// academic-service/models/Krs.js
const mongoose = require('mongoose');

const KrsItemSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true },
    courseName: { type: String, default: '' },
    sks: { type: Number, required: true, min: 1, max: 6 },
  },
  { _id: false }
);

const KrsSchema = new mongoose.Schema(
  {
    nim: {
      type: String,
      required: true,
      index: true,
    },
    semester: {
      // Contoh: "2025/2026-Ganjil" atau "2025/2026-Genap"
      type: String,
      required: true,
    },
    items: {
      type: [KrsItemSchema],
      default: [],
    },
    totalSks: {
      type: Number,
      default: 0,
    },
    status: {
      // SUBMITTED -> (ADMIN) APPROVED/REJECTED
      type: String,
      default: 'SUBMITTED',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Satu mahasiswa hanya boleh punya 1 KRS per semester (bisa di-update)
KrsSchema.index({ nim: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Krs', KrsSchema);
