import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom Vite plugin to handle /api/track requests
function trackingProxyPlugin() {
  let apiKey: string;
  
  return {
    name: 'tracking-proxy',
    configResolved(config: any) {
      // Load environment variables (without prefix for Node.js side)
      const env = loadEnv(config.command, process.cwd(), '');
      // Try both VITE_ prefixed and non-prefixed versions
      apiKey = env.VITE_AFTERSHIP_API_KEY || env.AFTERSHIP_API_KEY || '';
    },
    configureServer(server: any) {
      return () => {
        server.middlewares.use('/api/track', async (req: any, res: any, next: any) => {
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const { trackingNumber } = JSON.parse(body);

              if (!apiKey) {
                console.error('❌ AFTERSHIP_API_KEY not found in .env.local');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'AFTERSHIP_API_KEY not configured in server' }));
                return;
              }

              console.log(`🔍 [Vite Proxy] Fetching AfterShip for: ${trackingNumber}`);

              const response = await fetch('https://api.aftership.com/tracking/2026-01/trackings', {
                headers: {
                  'as-api-key': apiKey,
                  'Content-Type': 'application/json',
                },
              });

              const data = await response.json();
              res.writeHead(response.status, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(data));
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('❌ [Vite Proxy] Error:', errorMessage);
              res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: errorMessage }));
            }
          });
        });
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), trackingProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimize chunk sizes
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
          'icons': ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react', 'zustand'],
  },
  server: {
    port: 5173,
    host: true, // Enable network access for mobile testing
  },
})
