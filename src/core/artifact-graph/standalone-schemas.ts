import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileSystemUtils } from '../../utils/file-system.js';

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Chooses the directory that holds the package's built-in schemas.
 *
 * A standalone executable (Node SEA, Bun --compile, pkg, ...) resolves the
 * module URL into the packager's virtual filesystem, where the packaged
 * schemas directory does not exist. Such installs ship their schemas in a
 * `schemas/` directory next to the real executable instead.
 *
 * The packaged location wins whenever it exists, so npm, pnpm and source
 * installs never consult the directory next to the Node.js binary.
 *
 * @param packagedDir - `<package>/schemas` derived from the module URL, or null
 *   when the module URL could not be turned into a file path
 * @param executablePath - Path of the running executable (`process.execPath`)
 * @returns The directory to treat as the package built-in schemas location
 */
export function selectBuiltInSchemasDir(
  packagedDir: string | null,
  executablePath: string
): string {
  if (packagedDir !== null && isDirectory(packagedDir)) {
    return packagedDir;
  }

  // Canonicalize so a symlinked launcher resolves to the real install directory.
  const executableDir = path.dirname(FileSystemUtils.canonicalizeExistingPath(executablePath));
  const besideExecutable = path.join(executableDir, 'schemas');
  if (packagedDir === null || isDirectory(besideExecutable)) {
    return besideExecutable;
  }

  return packagedDir;
}
