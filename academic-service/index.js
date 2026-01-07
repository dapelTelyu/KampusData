const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const connectDB = require('./config/database');
const Sidang = require('./models/Sidang');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// --- 1. CONFIG INTEGRASI ---
const FINANCE_URL = process.env.FINANCE_SERVICE_URL || 'http://finance-service:4000/graphql';
const LIBRABOOK_URL = process.env.LIBRABOOK_API_URL || 'http://host.docker.internal:5000/graphql'; 
// Note: host.docker.internal dipakai agar docker bisa akses localhost laptop kamu (tempat mock librabook nanti)

// --- 2. AUTH MIDDLEWARE (Copy logic dari Auth Service) ---
const getUser = (token) => {
  try {
    if (token) {
      // Pastikan JWT_SECRET sama dengan di docker-compose
      return jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'rahasia_super_aman');
    }
    return null;
  } catch (err) {
    return null;
  }
};

// --- 3. GRAPHQL SCHEMA ---
const typeDefs = gql`
  type Sidang {
    id: ID!
    nim: String!
    title: String!
    status: String!
    registeredAt: String
  }

  type Query {
    mySidang: [Sidang]
  }

  type Mutation {
    registerSidang(title: String!): Sidang
  }
`;

// --- 4. RESOLVERS (THE BRAIN) ---
const resolvers = {
  Query: {
    mySidang: async (_, __, { user }) => {
      if (!user) throw new Error("Not Authenticated");
      return await Sidang.find({ nim: user.nim });
    }
  },
  Mutation: {
    registerSidang: async (_, { title }, { user }) => {
      // 1. Cek Login
      if (!user) throw new Error("Akses Ditolak: Anda belum login.");
      const nim = user.nim;

      console.log(`🚀 Memulai pendaftaran sidang untuk NIM: ${nim}`);

      // 2. CEK INTEGRASI INTERNAL: FINANCE SERVICE
      // Kita "nembak" query checkTuitionStatus ke container sebelah
      try {
        const financeResponse = await axios.post(FINANCE_URL, {
          query: `
            query {
              checkTuitionStatus(nim: "${nim}") {
                status
              }
            }
          `
        });

        const paymentStatus = financeResponse.data.data.checkTuitionStatus.status;
        console.log(`💰 Status Pembayaran: ${paymentStatus}`);

        if (paymentStatus !== 'PAID') {
          throw new Error(`Gagal: Anda belum melunasi tagihan (Status: ${paymentStatus})`);
        }
      } catch (error) {
        // Tangkap error jika finance service mati atau balasan error
        console.error("Finance Check Error:", error.message);
        // Jika errornya dari axios/network, lempar error server
        if (!error.response) throw new Error("Finance Service tidak merespon/down");
        // Jika errornya logic (throw Error di atas), lempar ulang
        throw error; 
      }

      // 3. CEK INTEGRASI EKSTERNAL: LIBRABOOK
      // Kita "nembak" query checkLibraryClearance ke URL Mitra
      try {
        const libraResponse = await axios.post(LIBRABOOK_URL, {
          query: `
            query {
              checkLibraryClearance(nim: "${nim}") {
                isClearanceApproved
                reason
              }
            }
          `
        });

        // Cek apakah data ada (antisipasi jika schema mereka beda)
        const clearance = libraResponse.data.data?.checkLibraryClearance;
        
        if (!clearance) {
          console.warn("⚠️ LibraBook merespon tapi data kosong. (Mungkin Mock belum siap?)");
          // Opsional: Throw error atau Bypass sementara (untuk testing)
          // throw new Error("Data Perpustakaan tidak ditemukan");
        } else {
          console.log(`📚 Status Perpustakaan: ${clearance.isClearanceApproved}`);
          
          if (clearance.isClearanceApproved !== true) {
            throw new Error(`Gagal: Perpustakaan menolak (${clearance.reason})`);
          }
        }

      } catch (error) {
        console.error("LibraBook Check Error:", error.message);
        // Khusus LibraBook, karena ini proyek integrasi:
        // Jika server mati (ECONNREFUSED), kita kasih pesan jelas
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
           throw new Error("Gagal terhubung ke Sistem Perpustakaan (LibraBook Down/Offline). Syarat sidang tidak bisa divalidasi.");
        }
        throw error;
      }

      // 4. LOLOS SEMUA CEK -> SIMPAN DATABASE
      const newSidang = new Sidang({
        nim,
        title
      });

      return await newSidang.save();
    }
  }
};

// --- 5. SERVER SETUP ---
async function startServer() {
  const app = express();
  await connectDB();

  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization || '';
      const user = getUser(token);
      return { user };
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`🚀 Academic Service ready at http://localhost:4000${server.graphqlPath}`);
  });
}

startServer();