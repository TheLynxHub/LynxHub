import {compress} from '@lynxhub/7zip';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

const targetFolder = process.argv[2];

if (!targetFolder) {
  console.error('Error: Please specify the output directory (e.g. extension_out or module_out)');
  process.exit(1);
}

const outDir = resolve(targetFolder);
const scriptsDir = resolve(outDir, 'scripts');
const outputArchive = resolve(outDir, 'scripts.7z');

if (!existsSync(scriptsDir)) {
  console.error(`Error: Scripts directory not found at ${scriptsDir}`);
  process.exit(1);
}

console.log(`Creating 7z archive for ${scriptsDir} with highest compression (ultra / lowest size)...`);

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
