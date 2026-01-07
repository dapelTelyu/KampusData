const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/database');
const User = require('./models/User');

// --- 1. DEFINISI TYPE (SCHEMA) ---
const typeDefs = gql`
  type User {
    id: ID!
    nim: String!
    role: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User 
  }

  type Mutation {
    register(nim: String!, password: String!): User
    login(nim: String!, password: String!): AuthPayload
  }
`;

// --- 2. RESOLVER (LOGIKA) ---
const resolvers = {
  Query: {
    // Cek user berdasarkan token (Header Authorization)
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
  },
  Mutation: {
    // REGISTER: Buat user baru
    register: async (_, { nim, password }) => {
      // 1. Hash password biar aman
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 2. Simpan ke database
      try {
        const user = await User.create({
          nim,
          password: hashedPassword
        });
        return user;
      } catch (err) {
        throw new Error('Gagal register. NIM mungkin sudah ada.');
      }
    },

    // LOGIN: Cek password & bikin Token
    login: async (_, { nim, password }) => {
      // 1. Cari user di DB
      const user = await User.findOne({ where: { nim } });
      if (!user) throw new Error('User tidak ditemukan');

      // 2. Cek password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Password salah');

      // 3. Bikin JWT Token
      const token = jwt.sign(
        { id: user.id, nim: user.nim, role: user.role },
        process.env.JWT_SECRET || 'rahasia_super_aman',
        { expiresIn: '30m' } // Token expired 30 menit
      );

      return { token, user };
    },
  },
};

// --- 3. SERVER SETUP ---
async function startServer() {
  const app = express();

  // Middleware untuk baca Token dari Header
  const context = ({ req }) => {
    const token = req.headers.authorization || '';
    try {
      if (token) {
        const user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'rahasia_super_aman');
        return { user };
      }
    } catch (e) {
      // Token invalid, biarkan user null
    }
    return { user: null };
  };

  const server = new ApolloServer({ typeDefs, resolvers, context });
  await server.start();
  server.applyMiddleware({ app });

  // Sinkronisasi Database (Bikin tabel otomatis jika belum ada)
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');
    await sequelize.sync(); // Hati-hati, di production jangan pakai sync() polos
    console.log('✅ Database Synced');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }

  app.listen(4000, () => {
    console.log(`🚀 Auth Service ready at http://localhost:4000${server.graphqlPath}`);
  });
}

startServer();