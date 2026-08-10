import {readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Get the file path from the command-line arguments.
const filePath = './extension_out/renderer/rendererEntry.mjs';

try {
  // Read the content of the file synchronously.
  let content = readFileSync(filePath, 'utf8');

  // Define the string to find and the string to replace it with.
  const findString = `const base = './';`;
  const replaceString = `const base = '/';`;

  // Use the replace method to update the content.
  const updatedContent = content.replace(findString, replaceString);

  // Write the updated content back to the file.
  writeFileSync(filePath, updatedContent, 'utf8');

  console.log(`Successfully modified: ${filePath}`);
} catch (error) {
  // Handle any errors that occur during file operations.
  console.error(`An error occurred: ${error.message}`);
}

try {
  const rendererDir = './extension_out/renderer';

  // Read all files in the renderer directory
  const files = readdirSync(rendererDir);

  // Filter and remove files matching the patterns
  files.forEach(file => {
    if (file.startsWith('useTableRowGroup-') || file.startsWith('tooltip.styles-') || file.startsWith('useMeter-')) {
      const filePath = join(rendererDir, file);
      rmSync(filePath);
      console.log(`Successfully removed: ${filePath}`);
    }
  });
} catch (e) {
  console.error(`An error occurred: ${e.message}`);
}
