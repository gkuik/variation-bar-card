import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
};
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  // HA_WWW_DIR (in .env.local, not versioned) builds straight into the `www/` folder of a
  // development Home Assistant instance, served on /local/. Default: dist/.
  const { HA_WWW_DIR } = loadEnv(mode, root, 'HA_');
  return {
    define: {
      __CARD_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      outDir: HA_WWW_DIR ? resolve(root, HA_WWW_DIR) : resolve(root, 'dist'),
      emptyOutDir: !HA_WWW_DIR, // never wipe the Home Assistant folder
      sourcemap: mode === 'development',
      minify: mode !== 'development',
      target: 'es2022',
      lib: {
        entry: resolve(root, 'src/variation-bar-card.ts'),
        formats: ['es'],
        fileName: () => `${pkg.name}.js`,
      },
    },
  };
});
