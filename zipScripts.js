import {compress} from '@lynxhub/7zip';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const targetFolder = process.argv[2];

if (!targetFolder) {
  console.error('Error: Please specify the output directory (e.g. extension_out or module_out)');
  process.exit(1);
}

const outDir = resolve(targetFolder);
const scriptsDir = resolve(outDir, 'scripts');

// Resolve source folder (e.g. module_out -> module, extension_out -> extension)
const sourceFolder = resolve(targetFolder.replace(/_out\/?$/, ''));

let version = '';

const pkgPaths = [resolve(sourceFolder, 'package.json'), resolve(outDir, 'package.json')];

for (const pkgPath of pkgPaths) {
  if (existsSync(pkgPath)) {
    try {
      const pkgData = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkgData.version) {
        version = String(pkgData.version).trim().replace(/^v/i, '');
        break;
      }
    } catch {
      // Fallback if read or parse fails
    }
  }
}

const archiveName = version ? `${version}.7z` : 'scripts.7z';
const outputArchive = resolve(outDir, archiveName);

if (!existsSync(scriptsDir)) {
  console.error(`Error: Scripts directory not found at ${scriptsDir}`);
  process.exit(1);
}

console.log(`Creating 7z archive (${archiveName}) for ${scriptsDir} with highest compression (ultra / lowest size)...`);

try {
  const result = await compress('scripts', outputArchive, {
    level: 'ultra',
    solid: true,
    overwriteMode: 'overwrite',
    workingDir: outDir,
  });

  if (result.exitCode === 0) {
    console.log(`Successfully created 7z archive at: ${outputArchive}`);
  } else {
    console.error(`Failed to create 7z archive. Exit code: ${result.exitCode}`);
    if (result.stderr) {
      console.error(result.stderr);
    }
    process.exit(result.exitCode || 1);
  }
} catch (error) {
  console.error(`An error occurred while creating 7z archive: ${error.message}`);
  process.exit(1);
}
