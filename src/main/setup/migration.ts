import {setTimeout} from 'node:timers/promises';

import {isWin} from '@lynx_common/utils';
import {PluginManager} from '@lynx_main/plugins';
import StorageManager from '@lynx_main/storageSqlite/storageOperations';
import {app, BrowserWindow, dialog} from 'electron';

/**
 * HTML content for the migration window
 */
const MIGRATION_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #212121;
      color: #f0f0f0;
      text-align: center;
      overflow: hidden;
      border-radius: 8px;
      user-select: none;
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1.5s linear infinite;
      margin-bottom: 20px;
    }
    h2 { margin: 0; }
    #status { 
      color: #aaa;
      margin-top: 8px;
      min-height: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="loader"></div>
  <h2>Applying Updates</h2>
  <p id="status">Initializing migration...</p>
</body>
</html>
`;

/**
 * Handles the migration process for plugins and extensions.
 * Shows a splash screen during migration and restarts the app upon completion.
 *
 * @param storageManager - The storage manager instance
 * @param pluginManager - The plugin manager instance
 */
export function PluginMigrate(storageManager: StorageManager, pluginManager: PluginManager): void {
  app.whenReady().then(async () => {
    const migrationWindow = new BrowserWindow({
      width: 450,
      height: 200,
      resizable: isWin,
      minWidth: isWin ? 450 : undefined,
      maxWidth: isWin ? 450 : undefined,
      minHeight: isWin ? 200 : undefined,
      maxHeight: isWin ? 200 : undefined,
      frame: false,
      show: false,
      alwaysOnTop: true,
      center: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await migrationWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(MIGRATION_HTML)}`);

    migrationWindow.on('ready-to-show', async () => {
      migrationWindow.show();

      /**
       * Updates the status text in the migration window
       */
      const updateStatus = async (message: string) => {
        if (migrationWindow && !migrationWindow.isDestroyed()) {
          const script = `document.getElementById('status').innerText = ${JSON.stringify(message)};`;
          await migrationWindow.webContents.executeJavaScript(script);
        }
      };

      try {
        await setTimeout(500);

        await updateStatus('Migrating extensions and modules...');
        await pluginManager.migrate();

        // Mark as migrated in storage
        storageManager.updateData('plugin', {migrated: true});

        await updateStatus('Done! Restarting the application...');
        await setTimeout(2000);

        // Relaunch the application
        app.relaunch({execPath: process.env.PORTABLE_EXECUTABLE_FILE || process.env.APPIMAGE});
        app.quit();
      } catch (error) {
        console.error('Migration failed:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        await updateStatus(`Error: Migration failed.`);

        // Close migration window before showing dialog
        if (migrationWindow && !migrationWindow.isDestroyed()) {
          migrationWindow.hide();
        }

        const result = await dialog.showMessageBox({
          type: 'error',
          title: 'Migration Failed',
          message: 'Plugin migration failed',
          detail: `${errorMessage}\n\nWould you like to retry or skip migration and continue?`,
          buttons: ['Retry', 'Skip & Continue', 'Quit'],
          defaultId: 0,
          cancelId: 2,
        });

        if (migrationWindow && !migrationWindow.isDestroyed()) {
          migrationWindow.close();
        }

        // Handle user choice
        switch (result.response) {
          case 0: // Retry
            app.relaunch({execPath: process.env.PORTABLE_EXECUTABLE_FILE || process.env.APPIMAGE});
            app.quit();
            break;
          case 1: // Skip & Continue
            storageManager.updateData('plugin', {migrated: true});
            app.relaunch({execPath: process.env.PORTABLE_EXECUTABLE_FILE || process.env.APPIMAGE});
            app.quit();
            break;
          default: // Quit
            app.quit();
            break;
        }
      }
    });
  });
}
