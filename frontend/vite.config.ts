import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The build output goes straight into the Python package, so that the server can serve it
 * without any extra step: `mqtt_compass/static`.
 */
export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: '../mqtt_compass/static',
        emptyOutDir: true,
        chunkSizeWarningLimit: 2000,
        // The manifest tells the Home Assistant integration which files it has to serve.
        manifest: true,
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8088',
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
