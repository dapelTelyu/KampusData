const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const connectDB = require('./config/database');
const Student = require('./models/Student');

// --- 1. TYPE DEFINITIONS ---
const typeDefs = gql`
  type Student {
    id: ID!
    nim: String!
    fullName: String!
    major: String!
    status: String!
  }

  type Query {
    # Ambil semua mahasiswa (untuk Admin)
    students: [Student]
    
    # Endpoint PENTING untuk Integrasi LibraBook & Auth
    studentByNim(nim: String!): Student
  }

  type Mutation {
    # Input data profil mahasiswa
    createStudent(nim: String!, fullName: String!, major: String!): Student
    
    # Update status (misal jadi Lulus/DO)
    updateStatus(nim: String!, status: String!): Student
  }
`;

// --- 2. RESOLVERS ---
const resolvers = {
  Query: {
    students: async () => {
      return await Student.find();
    },
    studentByNim: async (_, { nim }) => {
      return await Student.findOne({ nim });
    },
  },
  Mutation: {
    createStudent: async (_, { nim, fullName, major }) => {
      try {
        const newStudent = new Student({ nim, fullName, major });
        return await newStudent.save();
      } catch (err) {
        throw new Error("Gagal membuat data. NIM mungkin sudah ada.");
      }
    },
    updateStatus: async (_, { nim, status }) => {
      const student = await Student.findOne({ nim });
      if (!student) throw new Error("Mahasiswa tidak ditemukan");
      
      student.status = status;
      return await student.save();
    }
  },
};

// --- 3. SERVER SETUP ---
async function startServer() {
  const app = express();
  
  // Hubungkan ke Database dulu
  await connectDB();

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`🚀 Student Service ready at http://localhost:4000${server.graphqlPath}`);
  });
}

startServer();