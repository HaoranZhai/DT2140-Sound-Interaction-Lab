/** Compile the four unmodified course sound models with the pinned Faust compiler.
 * npm install --save-dev @grame/faustwasm@0.20.2
 * node tools/build-audio.mjs
 * FAUST_PACKAGE_PATH may point to an unpacked @grame/faustwasm package.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const packageRoot = process.env.FAUST_PACKAGE_PATH
  ? resolve(process.env.FAUST_PACKAGE_PATH)
  : resolve(dirname(require.resolve('@grame/faustwasm')), '../..');
const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler } = await import(pathToFileURL(join(packageRoot, 'dist/esm/index.js')));
const lib = new LibFaust(await instantiateFaustModuleFromFile(join(packageRoot, 'libfaust-wasm/libfaust-wasm.js')));
const compiler = new FaustCompiler(lib);
const sources = {
  bell: 'faust-dsp/Bells/churchBell.dsp',
  wind: 'faust-dsp/Nature/wind.dsp',
  thunder: 'faust-dsp/Nature/thunder.dsp',
  torpedo: 'faust-dsp/Sci-Fi/torpedo.dsp',
};
await mkdir(join(root, 'audio'), { recursive: true });
const manifest = { compilerPackage: '@grame/faustwasm@0.20.2', compilerVersion: compiler.version(), arguments: '-ftz 2', sourceHashNormalization: 'UTF-8 with LF line endings', models: {} };
for (const [name, source] of Object.entries(sources)) {
  const code = (await readFile(join(root, source), 'utf8')).replace(/\r\n/g, '\n');
  const factory = await compiler.createMonoDSPFactory(name, code, '-ftz 2');
  if (!factory) throw new Error(`Compilation failed: ${name}`);
  await writeFile(join(root, 'audio', `${name}.wasm`), factory.code);
  await writeFile(join(root, 'audio', `${name}.json`), JSON.stringify(JSON.parse(factory.json), null, 2) + '\n');
  manifest.models[name] = { source, sourceSHA256: createHash('sha256').update(code).digest('hex'), wasmSHA256: createHash('sha256').update(factory.code).digest('hex'), bytes: factory.code.length };
  console.log(`${name}: compiled ${factory.code.length} bytes`);
}
await writeFile(join(root, 'audio/build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Faust ${compiler.version()}: four course models compiled.`);
