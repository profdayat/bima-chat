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
	}
});
