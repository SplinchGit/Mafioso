import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Increase the warning limit to avoid warnings for larger chunks
    chunkSizeWarningLimit: 800, // in kB, default is 500

    // Implement code splitting with rollup options
    rollupOptions: {
      output: {
        // Split chunks based on module type
        manualChunks: {
          // Vendor chunk for node_modules
          vendor: [
            // Core dependencies
            'react', 
            'react-dom', 
            'react-router-dom',
            'zustand',
          ],
          // Game engine/mechanics
          game: [
            // Specific game mechanics modules
            // Add your main game logic imports here
          ],
          // UI components
          ui: [
            // UI component libraries
            // Add your UI component imports here
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})