#!/usr/bin/env bun
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
process.chdir(root);
type Suite = { name: string; args: string[]; browser?: boolean };
const suites: Suite[] = [
  { name: 'docs', args: ['tools/build-docs.ts', '--check'] },
  { name: 'snapshot', args: ['tools/snapshot.ts', '--check'] },
];
for await (const file of new Bun.Glob('*-check.ts').scan(import.meta.dir)) {
  suites.push({ name: file.replace(/-check\.ts$/, ''), args: [`tools/${file}`], browser: true });
}
for await (const file of new Bun.Glob('*.test.ts').scan(import.meta.dir)) {
  suites.push({ name: file.replace(/\.test\.ts$/, ''), args: ['test', `tools/${file}`] });
}
suites.sort((a, b) => a.name.localeCompare(b.name));
const filters = Bun.argv.slice(2).filter(arg => arg !== '--');
if (filters.includes('--help') || filters.includes('--list')) {
  console.log('Usage: bun run test [-- <suite> ...]\nRuns all suites by default; a name also includes its hyphenated subsuites.\n');
  console.log(suites.map(suite => suite.name).join('\n'));
  process.exit(0);
}
const matches = (name: string, filter: string) => name === filter || name.startsWith(`${filter}-`);
for (const filter of filters) {
  if (!suites.some(suite => matches(suite.name, filter))) {
    console.error(`Unknown test suite: ${filter}. Use bun run test -- --list.`);
    process.exit(2);
  }
}
const selected = suites.filter(suite => !filters.length || filters.some(filter => matches(suite.name, filter)));
let server: ReturnType<typeof Bun.spawn> | undefined;
let child: ReturnType<typeof Bun.spawn> | undefined;
const stop = () => { child?.kill(); server?.kill(); };
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { stop(); process.exit(signal === 'SIGINT' ? 130 : 143); });
}
const run = async (args: string[]) => {
  child = Bun.spawn([process.execPath, ...args], { cwd: root, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
  const code = await child.exited;
  child = undefined;
  return code;
};
const serverState = async () => {
  let response: Response;
  try { response = await fetch('http://localhost:8471/mica.css', { signal: AbortSignal.timeout(1000) }); }
  catch { return false; }
  if (!response.ok || await response.text() !== await Bun.file('mica.css').text()) {
    throw new Error('Port 8471 is serving different content. Stop that server before running browser tests.');
  }
  return true;
};
try {
  const needsBrowser = selected.some(suite => suite.browser);
  if (needsBrowser || selected.some(suite => suite.name === 'docs')) {
    if (await run(['tools/build-docs.ts'])) throw new Error('Documentation build failed.');
  }
  if (needsBrowser && !await serverState()) {
    server = Bun.spawn([process.execPath, 'tools/serve.ts'], {
      cwd: root, env: { ...process.env, PORT: '8471' }, stdout: 'inherit', stderr: 'inherit',
    });
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (server.exitCode !== null) throw new Error('Test server exited before becoming ready.');
      if (await serverState()) { ready = true; break; }
      await Bun.sleep(100);
    }
    if (!ready) throw new Error('Test server did not become ready.');
  }
  const failures: string[] = [];
  for (const suite of selected) {
    console.log(`\nRunning ${suite.name}`);
    if (await run(suite.args)) failures.push(suite.name);
  }
  console.log(`\n${selected.length - failures.length}/${selected.length} suites passed.`);
  if (failures.length) console.error(`Failed: ${failures.join(', ')}`);
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stop();
  if (server) await server.exited;
}
