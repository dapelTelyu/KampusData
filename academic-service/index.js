const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const connectDB = require('./config/database');
const Sidang = require('./models/Sidang');
const Wisuda = require('./models/Wisuda');
const Krs = require('./models/Krs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// --- 1. CONFIG INTEGRASI ---
const FINANCE_URL = process.env.FINANCE_SERVICE_URL || 'http://finance-service:4000/graphql';
const STUDENT_URL = process.env.STUDENT_SERVICE_URL || 'http://student-service:4000/graphql';
const LIBRABOOK_URL = process.env.LIBRABOOK_API_URL || 'http://host.docker.internal:5000/graphql';

// --- 2. AUTH MIDDLEWARE (Copy logic dari Auth Service) ---
const getUser = (token) => {
  try {
    if (token) {
      return jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'rahasia_super_aman');
    }
    return null;
  } catch (err) {
    return null;
  }
};

// --- 3. HELPERS ---
const requireAuth = (user) => {
  if (!user) throw new Error('Akses Ditolak: Anda belum login.');
};

const requireAdmin = (user) => {
  requireAuth(user);
  if ((user.role || '').toLowerCase() !== 'admin') {
    throw new Error('Akses Ditolak: Hanya admin yang boleh melakukan aksi ini.');
  }
};

const graphqlPost = async (url, query) => {
  // Wrapper kecil biar error handling konsisten
  return await axios.post(url, { query });
};

const getPaymentStatus = async (nim) => {
  try {
    const financeResponse = await graphqlPost(
      FINANCE_URL,
      `
        query {
          checkTuitionStatus(nim: "${nim}") {
            status
          }
        }
      `
    );

    const status = financeResponse?.data?.data?.checkTuitionStatus?.status;
    if (!status) {
      // Kalau schema finance berubah / kosong
      throw new Error('Finance Service merespon tapi data status pembayaran tidak ditemukan.');
    }
    return status;
  } catch (error) {
    console.error('Finance Check Error:', error.message);
    if (!error.response) throw new Error('Finance Service tidak merespon/down');
    // Error GraphQL dari finance
    if (error.response?.data?.errors?.length) {
      throw new Error(error.response.data.errors[0].message);
    }
    throw error;
  }
};

const ensureTuitionPaid = async (nim) => {
  const status = await getPaymentStatus(nim);
  console.log(`💰 Status Pembayaran (${nim}): ${status}`);
  if (status !== 'PAID') {
    throw new Error(`Gagal: Anda belum melunasi tagihan (Status: ${status}).`);
  }
  return status;
};

const getStudent = async (nim) => {
  try {
    const resp = await graphqlPost(
      STUDENT_URL,
      `
        query {
          studentByNim(nim: "${nim}") {
            nim
            fullName
            major
            status
          }
        }
      `
    );

    const student = resp?.data?.data?.studentByNim;
    if (!student) throw new Error('Mahasiswa tidak ditemukan di Student Service.');
    return student;
  } catch (error) {
    console.error('Student Check Error:', error.message);
    if (!error.response) throw new Error('Student Service tidak merespon/down');
    if (error.response?.data?.errors?.length) {
      throw new Error(error.response.data.errors[0].message);
    }
    throw error;
  }
};

const ensureLibraryClearance = async (nim) => {
  try {
    const libraResponse = await graphqlPost(
      LIBRABOOK_URL,
      `
        query {
          checkLibraryClearance(nim: "${nim}") {
            isClearanceApproved
            reason
          }
        }
      `
    );

    const clearance = libraResponse?.data?.data?.checkLibraryClearance;

    if (!clearance) {
      throw new Error('Validasi perpustakaan gagal: data clearance tidak ditemukan dari LibraBook.');
    }

    console.log(`📚 Status Bebas Pustaka (${nim}): ${clearance.isClearanceApproved}`);

    if (clearance.isClearanceApproved !== true) {
      throw new Error(`Gagal: Perpustakaan menolak (${clearance.reason || 'Tidak memenuhi syarat bebas pustaka'}).`);
    }

    return clearance;
  } catch (error) {
    console.error('LibraBook Check Error:', error.message);

    // Jika server mati / DNS gagal
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(
        'Gagal terhubung ke Sistem Perpustakaan (LibraBook Down/Offline). Validasi "Bebas Pustaka" tidak bisa dilakukan.'
      );
    }

    if (error.response?.data?.errors?.length) {
      throw new Error(error.response.data.errors[0].message);
    }

    throw error;
  }
};

const normalizeCourseCode = (code) => String(code || '').trim().toUpperCase();

const calcTotalSks = (items) => items.reduce((sum, item) => sum + (Number(item.sks) || 0), 0);

// --- 4. GRAPHQL SCHEMA ---
const typeDefs = gql`
  type Sidang {
    id: ID!
    nim: String!
    title: String!
    status: String!
    registeredAt: String
  }

  type Wisuda {
    id: ID!
    nim: String!
    period: String!
    status: String!
    registeredAt: String
  }

  type KrsItem {
    courseCode: String!
    courseName: String
    sks: Int!
  }

  type Krs {
    id: ID!
    nim: String!
    semester: String!
    items: [KrsItem!]!
    totalSks: Int!
    status: String!
    submittedAt: String
    createdAt: String
    updatedAt: String
  }

  input KrsItemInput {
    courseCode: String!
    courseName: String
    sks: Int!
  }

  type Query {
    mySidang: [Sidang]
    myWisuda: [Wisuda]

    # Ambil KRS untuk semester tertentu
    myKrs(semester: String!): Krs

    # Riwayat KRS (semua semester)
    myKrsHistory: [Krs]
  }

  type Mutation {
    # Mahasiswa
    registerSidang(title: String!): Sidang
    registerWisuda(period: String!): Wisuda
    submitKrs(semester: String!, items: [KrsItemInput!]!): Krs

    # Admin (opsional, tapi berguna untuk logika kelulusan)
    updateSidangStatus(id: ID!, status: String!): Sidang
    updateWisudaStatus(id: ID!, status: String!): Wisuda
    updateKrsStatus(id: ID!, status: String!): Krs
  }
`;

// --- 5. RESOLVERS (THE BRAIN) ---
const resolvers = {
  Query: {
    mySidang: async (_, __, { user }) => {
      requireAuth(user);
      return await Sidang.find({ nim: user.nim }).sort({ registeredAt: -1 });
    },

    myWisuda: async (_, __, { user }) => {
      requireAuth(user);
      return await Wisuda.find({ nim: user.nim }).sort({ registeredAt: -1 });
    },

    myKrs: async (_, { semester }, { user }) => {
      requireAuth(user);
      return await Krs.findOne({ nim: user.nim, semester });
    },

    myKrsHistory: async (_, __, { user }) => {
      requireAuth(user);
      return await Krs.find({ nim: user.nim }).sort({ createdAt: -1 });
    },
  },

  Mutation: {
    // ---------------------
    // SIDANG
    // ---------------------
    registerSidang: async (_, { title }, { user }) => {
      requireAuth(user);
      const nim = user.nim;

      console.log(`🚀 Memulai pendaftaran sidang untuk NIM: ${nim}`);

      // 1) Cek status keuangan (wajib PAID)
      await ensureTuitionPaid(nim);

      // 2) Cek bebas pustaka (wajib lulus; fail closed kalau LibraBook error)
      await ensureLibraryClearance(nim);

      // 3) Simpan
      const newSidang = new Sidang({ nim, title });
      return await newSidang.save();
    },

    updateSidangStatus: async (_, { id, status }, { user }) => {
      requireAdmin(user);
      const sidang = await Sidang.findById(id);
      if (!sidang) throw new Error('Data sidang tidak ditemukan.');
      sidang.status = status;
      return await sidang.save();
    },

    // ---------------------
    // WISUDA
    // ---------------------
    registerWisuda: async (_, { period }, { user }) => {
      requireAuth(user);
      const nim = user.nim;

      console.log(`🎓 Memulai pendaftaran wisuda untuk NIM: ${nim} (periode: ${period})`);

      // 0) Validasi status akademik mahasiswa
      const student = await getStudent(nim);
      if (student.status !== 'ACTIVE') {
        throw new Error(`Gagal: Status akademik Anda tidak aktif (Status: ${student.status}).`);
      }

      // 1) Cek status keuangan (wajib PAID)
      await ensureTuitionPaid(nim);

      // 2) Cek bebas pustaka (ketergantungan mutlak)
      await ensureLibraryClearance(nim);

      // 3) Pastikan sidang sudah LULUS/APPROVED
      const latestSidang = await Sidang.findOne({ nim }).sort({ registeredAt: -1 });
      if (!latestSidang) {
        throw new Error('Gagal: Anda belum memiliki data sidang. Silakan daftar sidang terlebih dahulu.');
      }

      const sidangOkStatuses = new Set(['PASSED', 'APPROVED', 'LULUS']);
      if (!sidangOkStatuses.has(String(latestSidang.status || '').toUpperCase())) {
        throw new Error(
          `Gagal: Status sidang Anda belum lulus/approved (Status: ${latestSidang.status}). Hubungi admin akademik.`
        );
      }

      // 4) Simpan pendaftaran wisuda
      try {
        const wisuda = new Wisuda({ nim, period });
        return await wisuda.save();
      } catch (err) {
        // Duplicate key error (sudah daftar periode ini)
        if (err && err.code === 11000) {
          throw new Error('Anda sudah terdaftar wisuda untuk periode ini.');
        }
        throw err;
      }
    },

    updateWisudaStatus: async (_, { id, status }, { user }) => {
      requireAdmin(user);
      const wisuda = await Wisuda.findById(id);
      if (!wisuda) throw new Error('Data wisuda tidak ditemukan.');
      wisuda.status = status;
      return await wisuda.save();
    },

    // ---------------------
    // SKS / KRS
    // ---------------------
    submitKrs: async (_, { semester, items }, { user }) => {
      requireAuth(user);
      const nim = user.nim;

      console.log(`📝 Submit KRS NIM: ${nim} (semester: ${semester})`);

      // 0) Validasi status mahasiswa
      const student = await getStudent(nim);
      if (student.status !== 'ACTIVE') {
        throw new Error(`Gagal: Anda tidak bisa mengambil SKS (Status akademik: ${student.status}).`);
      }

      // 1) Ketergantungan status keuangan (wajib PAID)
      await ensureTuitionPaid(nim);

      // 2) Validasi items KRS
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('KRS kosong. Isi minimal 1 mata kuliah.');
      }

      const normalized = items.map((it) => ({
        courseCode: normalizeCourseCode(it.courseCode),
        courseName: it.courseName || '',
        sks: Number(it.sks),
      }));

      const seen = new Set();
      for (const it of normalized) {
        if (!it.courseCode) throw new Error('courseCode tidak boleh kosong.');
        if (seen.has(it.courseCode)) {
          throw new Error(`Mata kuliah duplikat di KRS: ${it.courseCode}`);
        }
        seen.add(it.courseCode);

        if (!Number.isInteger(it.sks) || it.sks <= 0) {
          throw new Error(`SKS tidak valid untuk ${it.courseCode}.`);
        }
      }

      const totalSks = calcTotalSks(normalized);
      const maxSks = Number.isInteger(parseInt(process.env.MAX_SKS || '24', 10))
        ? parseInt(process.env.MAX_SKS || '24', 10)
        : 24;

      if (totalSks > maxSks) {
        throw new Error(`Gagal: Total SKS (${totalSks}) melebihi batas maksimum (${maxSks}).`);
      }

      // 3) Upsert KRS (satu KRS per semester)
      const existing = await Krs.findOne({ nim, semester });
      if (existing) {
        existing.items = normalized;
        existing.totalSks = totalSks;
        existing.status = 'SUBMITTED';
        existing.submittedAt = new Date();
        return await existing.save();
      }

      try {
        const krs = new Krs({ nim, semester, items: normalized, totalSks });
        return await krs.save();
      } catch (err) {
        if (err && err.code === 11000) {
          // Edge case: race condition
          throw new Error('KRS untuk semester ini sudah ada. Coba ulangi beberapa saat lagi.');
        }
        throw err;
      }
    },

    updateKrsStatus: async (_, { id, status }, { user }) => {
      requireAdmin(user);
      const krs = await Krs.findById(id);
      if (!krs) throw new Error('Data KRS tidak ditemukan.');
      krs.status = status;
      return await krs.save();
    },
  },
};

// --- 6. SERVER SETUP ---
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
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 Academic Service ready at http://localhost:${port}${server.graphqlPath}`);
  });
}

startServer();
