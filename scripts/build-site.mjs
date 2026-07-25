import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverRoot = path.join(projectRoot, 'dist', 'server');
const clientRoot = path.join(projectRoot, 'dist', 'client');

async function copyHtmlTree(sourceDirectory, relativeDirectory = '') {
  const entries = await readdir(path.join(sourceDirectory, relativeDirectory), {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyHtmlTree(sourceDirectory, relativePath);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.html') continue;

    const destination = path.join(clientRoot, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(sourceDirectory, relativePath), destination);
  }
}

const routesManifest = JSON.parse(
  await readFile(path.join(serverRoot, '_expo', 'routes.json'), 'utf8'),
);

const htmlRoutes = routesManifest.htmlRoutes
  .map((route) => ({
    asset: `${route.page.replace(/^\//u, '')}.html`,
    page: route.page,
    pattern: route.namedRegex,
  }))
  .sort((left, right) => Number(right.page === '/index') - Number(left.page === '/index'))
  .map(({ asset, pattern }) => ({ asset, pattern }));

await copyHtmlTree(serverRoot);

await build({
  absWorkingDir: projectRoot,
  bundle: true,
  conditions: ['worker', 'browser', 'import', 'default'],
  define: {
    __CYBERPATH_HTML_ROUTES__: JSON.stringify(htmlRoutes),
    'process.env.NODE_ENV': '"production"',
  },
  entryPoints: ['./hosting/worker.ts'],
  format: 'esm',
  logLevel: 'info',
  minify: true,
  outfile: 'dist/server/index.js',
  platform: 'browser',
  target: 'es2022',
  tsconfig: 'tsconfig.json',
});
