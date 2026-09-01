import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	server: {
		host: '0.0.0.0',
		port: 5173,
		hmr: {
			host: 'localhost',
			clientPort: 8095,
			protocol: 'ws'
		},
		proxy: {
			'/api': {
				target: process.env.BACKEND_INTERNAL_URL || 'http://backend:8080',
				changeOrigin: true,
				// Critical: disable buffering for SSE (Server-Sent Events)
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq) => {
						proxyReq.setHeader('X-Accel-Buffering', 'no');
					});
				}
			},
			'/uploads': {
				target: process.env.BACKEND_INTERNAL_URL || 'http://backend:8080',
				changeOrigin: true
			}
		}
	},

	build: {
		// Use esbuild for minification (built-in, fastest, ~290 KiB savings)
		minify: 'esbuild',
		// Aggressively tree-shake unused code
		target: 'es2020',
		// Reduce report overhead
		reportCompressedSize: false,
		rollupOptions: {
			output: {
				// Split vendor chunks so browsers cache them separately
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('svelte')) return 'svelte-vendor';
						return 'vendor';
					}
				}
			}
		}
	}
});

