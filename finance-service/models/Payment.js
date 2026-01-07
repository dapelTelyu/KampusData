// finance-service/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  nim: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 1500000 // Misal SPP tetap
  },
  status: {
    type: String,
    enum: ['UNPAID', 'PENDING', 'PAID', 'REJECTED'],
    default: 'UNPAID'
  },
  proofFile: {
    type: String, // Menyimpan nama file/path
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);