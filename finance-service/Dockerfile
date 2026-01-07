# Gunakan image Node.js versi ringan (Alpine Linux)
FROM node:18-alpine

# Tentukan folder kerja di dalam container
WORKDIR /app

# Copy file package.json dan package-lock.json terlebih dahulu
# (Agar Docker bisa melakukan caching layer 'npm install')
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy seluruh sisa kode program ke dalam container
COPY . .

# Buka port internal container (sesuai docker-compose.yml kita tadi: 4000)
EXPOSE 4000

# Perintah untuk menjalankan aplikasi
# (Pastikan nanti di package.json ada scripts "start" atau arahkan ke index.js)
CMD ["npm", "start"]