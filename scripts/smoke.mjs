// FlightGlobe — one-command smoke check: build + tests + data + verify.
// Run: npm run smoke
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const steps = [
  ['npm', ['run', 'build']],
  ['npm', ['test']],
  ['npm', ['run', 'validate-data']],
  ['npm', ['run', 'verify']],
];
for (const [cmd, args] of steps) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const { stdout } = await run(cmd, args, { cwd: new URL('..', import.meta.url).pathname });
  console.log(stdout.trim().split('\n').slice(-3).join('\n'));
}
console.log('\nSMOKE OK — build, tests, data and serve check all passed.');
