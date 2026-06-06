import path from 'path';
import { createRequire } from 'module';
import { transform } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const innoplexusRoot = path.dirname(require.resolve('human-body-organs-mapping-library/package.json'));

function innoplexusJsx(): Plugin {
  return {
    name: 'innoplexus-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.includes('human-body-organs-mapping-library') || !id.endsWith('.js')) {
        return null;
      }

      const result = await transform(code, {
        loader: 'jsx',
        jsx: 'automatic',
        format: 'esm',
        sourcemap: true,
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    innoplexusJsx(),
    react({
      include: [/src\/.*\.[jt]sx?$/, /human-body-organs-mapping-library\/.*\.js$/],
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
    include: [
      'human-body-organs-mapping-library/src/SVGs/MaleSVG/index.js',
      'human-body-organs-mapping-library/src/SVGs/OrgansData/data.js',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'human-body-organs-mapping-library': innoplexusRoot,
    },
  },
  server: {
    port: 5174,
    open: true,
  },
});
