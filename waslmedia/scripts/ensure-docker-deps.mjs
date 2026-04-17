import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { spawnSync } from 'child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const packageLockPath = resolve(projectRoot, 'package-lock.json');
const nodeModulesPath = resolve(projectRoot, 'node_modules');
const markerPath = resolve(nodeModulesPath, '.waslmedia-package-lock-hash');
const mysql2Path = resolve(nodeModulesPath, 'mysql2');

function getFileHash(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function installDependencies() {
  const result = spawnSync('npm', ['ci'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const currentHash = getFileHash(packageLockPath);
const savedHash = existsSync(markerPath) ? readFileSync(markerPath, 'utf8').trim() : '';
const needsInstall = !existsSync(mysql2Path) || currentHash !== savedHash;

if (needsInstall) {
  console.log('Syncing Docker dependencies...');
  installDependencies();
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, currentHash);
} else {
  console.log('Docker dependencies are up to date.');
}
