import SqliteStorageManager from './storageOperations';

/**
 * Handles SQLite storage migration execution.
 * Baseline version starts at current storage version (v1.1).
 */
export class SqliteStorageMigrationManager {
  private readonly migrations = new Map<number, (manager: SqliteStorageManager) => void>([
    [1.2, manager => this.migrate_1_20(manager)],
  ]);

  constructor(private readonly manager: SqliteStorageManager) {}

  /**
   * Migrates storage data in SQLite from older versions to current version.
   * Migrations are applied sequentially based on stored version in meta_storage.
   */
  public runStorageMigrations(currentVersion: number): void {
    try {
      const storageMeta = this.manager.getData('storage');
      const storeVersion = storageMeta?.version ?? currentVersion;

      if (storeVersion >= currentVersion) {
        this.manager.setData('storage', {version: currentVersion});
        return;
      }

      for (const [version, migrationFn] of this.migrations.entries()) {
        if (storeVersion < version && version <= currentVersion) {
          console.log(`[SQLite Storage] Applying migration for v${version}...`);
          migrationFn(this.manager);
        }
      }

      this.manager.setData('storage', {version: currentVersion});
      console.log(`[SQLite Storage] Storage successfully updated to v${currentVersion}`);
    } catch (e) {
      console.error('[SQLite Storage] Failed to migrate storage', e);
    }
  }

  private migrate_1_20(manager: SqliteStorageManager): void {
    const appData = manager.getData('app');
    if (appData && appData.forceReloadConfirm === undefined) {
      manager.updateData('app', {forceReloadConfirm: true});
    }
  }
}

export default SqliteStorageMigrationManager;
