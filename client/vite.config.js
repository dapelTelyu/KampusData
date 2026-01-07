import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // PENTING: Jangan biarkan Vite memproses Apollo Client
    // Biarkan browser yang menanganinya secara langsung
    exclude: ['@apollo/client', 'graphql']
  },
})