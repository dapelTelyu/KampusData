const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const connectDB = require('./config/database');
const Payment = require('./models/Payment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- 1. SETUP UPLOAD (MULTER) ---
// Pastikan folder uploads ada
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Nama file: NIM-Timestamp.jpg
    const ext = path.extname(file.originalname);
    const nim = req.body.nim || 'unknown';
    cb(null, `${nim}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// --- 2. GRAPHQL SCHEMA ---
const typeDefs = gql`
  type Payment {
    id: ID!
    nim: String!
    amount: Float!
    status: String! # UNPAID, PENDING, PAID
    proofFile: String
  }

  type Query {
    # Cek status bayar (Dipakai Academic Service nanti)
    checkTuitionStatus(nim: String!): Payment
    
    # Admin lihat semua transaksi
    allPayments: [Payment]
  }

  type Mutation {
    # Admin memverifikasi pembayaran
    verifyPayment(nim: String!, status: String!): Payment
    createInvoice(nim: String!, amount: Float!): Payment
  }
`;

// --- 3. GRAPHQL RESOLVERS ---
const resolvers = {
  Query: {
    checkTuitionStatus: async (_, { nim }) => {
      let payment = await Payment.findOne({ nim });
      // Kalau belum pernah ada record, anggap UNPAID
      if (!payment) {
        payment = new Payment({ nim, status: 'UNPAID' });
      }
      return payment;
    },
    allPayments: async () => {
      return await Payment.find().sort({ createdAt: -1 });
    }
  },
  Mutation: {
    verifyPayment: async (_, { nim, status }) => {
      const payment = await Payment.findOne({ nim });
      if (!payment) throw new Error("Data pembayaran tidak ditemukan");
      
      payment.status = status;
      return await payment.save();
    },
    createInvoice: async (_, { nim, amount }) => {
        const newPayment = new Payment({ nim, amount, status: 'PAID' }); // Langsung Lunas!
        return await newPayment.save();
    },
  }
};

// --- 4. SERVER SETUP ---
async function startServer() {
  const app = express();
  await connectDB();

  // Endpoint REST Khusus Upload File
  // Cara pakai di Postman: POST http://localhost:4003/upload
  // Body (form-data): nim = "102022...", file = [Pilih Gambar]
  app.post('/upload', upload.single('file'), async (req, res) => {
    const { nim } = req.body;
    const file = req.file;

    if (!nim || !file) {
      return res.status(400).json({ error: 'NIM dan File wajib diisi' });
    }

    try {
      // Cek apakah sudah ada record payment
      let payment = await Payment.findOne({ nim });
      if (!payment) {
        payment = new Payment({ nim });
      }

      // Update data
      payment.status = 'PENDING'; // Menunggu verifikasi admin
      payment.proofFile = file.filename;
      await payment.save();

      res.json({ message: 'Upload berhasil', data: payment });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Folder uploads bisa diakses via browser (misal untuk admin lihat bukti)
  app.use('/uploads', express.static('uploads'));

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`🚀 Finance Service ready at http://localhost:4000${server.graphqlPath}`);
    console.log(`📂 Upload Endpoint ready at http://localhost:4000/upload`);
  });
}

startServer();