import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create more granular chunks to reduce individual chunk sizes
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            // Router
            if (id.includes('react-router')) {
              return 'router-vendor'
            }
            // Charts library
            if (id.includes('recharts')) {
              return 'charts-vendor'
            }
            // Utility libraries
            if (id.includes('axios') || id.includes('papaparse') || id.includes('exceljs')) {
              return 'utils-vendor'
            }
            // Styled components
            if (id.includes('styled-components')) {
              return 'styled-vendor'
            }
            // Other vendor libraries
            return 'vendor'
          }
          // Split application code by feature/page
          if (id.includes('src/pages/')) {
            return 'pages'
          }
          if (id.includes('src/components/')) {
            return 'components'
          }
          if (id.includes('src/utils/') || id.includes('src/config/')) {
            return 'app-utils'
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'ws'
    }
  }
})
