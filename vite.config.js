import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			name: 'ActivityGrid',
			formats: ['es', 'umd'],
			fileName: (format) => `activity-grid.${format}.js`
		},
		sourcemap: true,
		rollupOptions: {
			output: {
				globals: {}
			}
		}
	}
});