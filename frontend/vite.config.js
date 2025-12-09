import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5175,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    // Chart libraries
                    'charts': ['recharts'],
                    // UI libraries
                    'ui-vendor': ['lucide-react', 'date-fns'],
                },
            },
        },
        chunkSizeWarningLimit: 1000, // Increase limit to 1MB (default is 500KB)
    },
});
