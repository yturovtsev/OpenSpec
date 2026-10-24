import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { selectBuiltInSchemasDir } from '../../../src/core/artifact-graph/standalone-schemas.js';

describe('artifact-graph/standalone-schemas', () => {
  let tempDir: string;
  let packagedDir: string;

  function createExecutable(installRoot: string): string {
    const appDir = path.join(installRoot, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const executablePath = path.join(
      appDir,
      process.platform === 'win32' ? 'openspec.exe' : 'openspec'
    );
    fs.writeFileSync(executablePath, '');
    return executablePath;
  }

  beforeEach(() => {
    // Canonical root: macOS tmpdir is a symlink and Windows can hand out 8.3 short names.
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-standalone-schemas-test-'))
    );
    packagedDir = path.join(tempDir, 'pkg', 'schemas');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should use the packaged location when it exists, even with schemas next to the executable', () => {
    const executablePath = createExecutable(tempDir);
    fs.mkdirSync(packagedDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'app', 'schemas'));

    expect(selectBuiltInSchemasDir(packagedDir, executablePath)).toBe(packagedDir);
  });

  it('should fall back to schemas next to the executable when the packaged location is missing', () => {
    const executablePath = createExecutable(tempDir);
    const besideExecutable = path.join(tempDir, 'app', 'schemas');
    fs.mkdirSync(besideExecutable);

    expect(selectBuiltInSchemasDir(packagedDir, executablePath)).toBe(besideExecutable);
  });

  it('should use schemas next to the executable when the packaged location is unknown', () => {
    const executablePath = createExecutable(tempDir);
    const besideExecutable = path.join(tempDir, 'app', 'schemas');
    fs.mkdirSync(besideExecutable);

    expect(selectBuiltInSchemasDir(null, executablePath)).toBe(besideExecutable);
  });

  it('should return the packaged location unchanged when neither location exists', () => {
    const executablePath = createExecutable(tempDir);

    expect(selectBuiltInSchemasDir(packagedDir, executablePath)).toBe(packagedDir);
  });

  it('should return the location next to the executable when neither exists and the packaged location is unknown', () => {
    const executablePath = createExecutable(tempDir);

    expect(selectBuiltInSchemasDir(null, executablePath)).toBe(
      path.join(tempDir, 'app', 'schemas')
    );
  });

  it('should ignore a file named schemas next to the executable', () => {
    const executablePath = createExecutable(tempDir);
    fs.writeFileSync(path.join(tempDir, 'app', 'schemas'), '');

    expect(selectBuiltInSchemasDir(packagedDir, executablePath)).toBe(packagedDir);
  });

  it('should resolve a symlinked launcher to the real install directory', () => {
    if (process.platform === 'win32') return;

    const executablePath = createExecutable(tempDir);
    const besideExecutable = path.join(tempDir, 'app', 'schemas');
    fs.mkdirSync(besideExecutable);
    const binDir = path.join(tempDir, 'bin');
    fs.mkdirSync(path.join(binDir, 'schemas'), { recursive: true });
    const launcher = path.join(binDir, 'openspec');
    fs.symlinkSync(executablePath, launcher, 'file');

    expect(selectBuiltInSchemasDir(packagedDir, launcher)).toBe(besideExecutable);
  });

  it('should handle an install root containing a space', () => {
    const installRoot = path.join(tempDir, 'Ivan Petrov', 'OpenSpec');
    const executablePath = createExecutable(installRoot);
    const besideExecutable = path.join(installRoot, 'app', 'schemas');
    fs.mkdirSync(besideExecutable);

    expect(selectBuiltInSchemasDir(packagedDir, executablePath)).toBe(besideExecutable);
  });
});
