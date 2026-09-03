import {join} from 'node:path';

import {APP_NAME} from '@lynx_common/consts';
import {Get_Default_Hotkeys} from '@lynx_common/consts/hotkeys';
import {CustomRunBehaviorData, FavIcons, LegacyCustomRunBehaviorData} from '@lynx_common/types/ipc';
import AppStorageData from '@lynx_common/types/storage';
import {encryptString, encryptStrings, getUserAgent} from '@lynx_main/utils';
import {app} from 'electron';
import {isEmpty} from 'lodash-es';
import {LowSync} from 'lowdb';

/**
 * Handles storage migration execution and deferred migration steps.
 */
export class StorageMigrationManager {
  private migratedTo = 0;

  private readonly migrations = new Map<number, () => void>([
    [0.4, () => this.migrate_0_4()],
    [0.5, () => this.migrate_0_5()],
    [0.6, () => this.migrate_0_6()],
    [0.7, () => this.migrate_0_7()],
    [0.81, () => this.migrate_0_81()],
    [0.82, () => this.migrate_0_82()],
    [0.83, () => this.migrate_0_83()],
    [0.84, () => this.migrate_0_84()],
    [0.85, () => this.migrate_0_85()],
    [0.86, () => this.migrate_0_86()],
    [0.87, () => this.migrate_0_87()],
    [0.88, () => this.migrate_0_88()],
    [0.89, () => this.migrate_0_89()],
    [0.9, () => this.migrate_0_9()],
    [0.91, () => this.migrate_0_91()],
    [0.92, () => this.migrate_0_92()],
    [0.93, () => this.migrate_0_93()],
    [0.94, () => this.migrate_0_94()],
    [0.95, () => this.migrate_0_95()],
    [0.96, () => this.migrate_0_96()],
    [0.97, () => this.migrate_0_97()],
    [0.98, () => this.migrate_0_98()],
    [0.99, () => this.migrate_0_99()],
    [1.0, () => this.migrate_1_00()],
    [1.01, () => this.migrate_1_01()],
    [1.02, () => this.migrate_1_02()],
    [1.03, () => this.migrate_1_03()],
    [1.04, () => this.migrate_1_04()],
    [1.05, () => this.migrate_1_05()],
    [1.06, () => this.migrate_1_06()],
    [1.07, () => this.migrate_1_07()],
    [1.09, () => this.migrate_1_09()],
    [1.1, () => this.migrate_1_10()],
    [1.2, () => this.migrate_1_20()],
    [1.3, () => this.migrate_1_30()],
  ]);

  constructor(
    private readonly storage: LowSync<AppStorageData>,
    private readonly defaultData: AppStorageData,
    private readonly write: () => void,
  ) {}

  /**
   * Performs deferred migrations that require the app to be fully ready.
   * Example: Encryption which depends on safeStorage availability.
   */
  public completeDeferredMigrations(): void {
    if (this.migratedTo === 0.84) {
      const {recentAddress, favoriteAddress, historyAddress, favIcons} = this.storage.data.browser;

      this.storage.data.browser = {
        ...this.storage.data.browser,
        recentAddress: encryptStrings(recentAddress),
        favoriteAddress: encryptStrings(favoriteAddress),
        historyAddress: encryptStrings(historyAddress),
        favIcons: favIcons.map(item => ({
          url: encryptString(item.url),
          favIcon: encryptString(item.favIcon),
        })),
      };

      this.write();
      this.migratedTo = 0;
    }
  }

  /**
   * Migrates storage data from older versions to current version.
   * Migrations are applied sequentially based on stored version.
   */
  public runStorageMigrations(currentVersion: number): void {
    try {
      const storeVersion = this.storage.data.storage.version;

      if (storeVersion < 0.4) {
        this.storage.data = {...this.defaultData};
        this.write();
        return;
      }

      if (storeVersion >= currentVersion) {
        return;
      }

      for (const [version, migrationFn] of this.migrations.entries()) {
        if (storeVersion < version) {
          console.log(`Applying migration for v${version}...`);
          migrationFn();
        }
      }

      this.storage.data.storage = {
        ...this.storage.data.storage,
        version: currentVersion,
      };
      this.write();
    } catch (e) {
      console.error('Failed to migrate storage', e);
    }
  }

  private migrate_0_4() {
    this.storage.data.terminal = this.defaultData.terminal;
  }

  private migrate_0_5() {
    this.storage.data.cards.duplicated = [];
  }

  private migrate_0_6() {
    this.storage.data.app.openLastSize = false;
    this.storage.data.app.dynamicAppTitle = true;
    this.storage.data.app.lastSize = undefined;
    this.storage.data.cards.checkUpdateInterval = 30;
  }

  private migrate_0_7() {
    // @ts-expect-error: in old versions, there isn't download things
    this.storage.data.browser = {
      favoriteAddress: [],
      historyAddress: [],
      recentAddress: [],
      favIcons: [],
      userAgent: 'lynxhub',
      customUserAgent: getUserAgent('lynxhub'),
    };
    this.storage.data.app.closeTabConfirm = true;
    this.storage.data.app.hotkeys = Get_Default_Hotkeys();
    this.storage.data.app.openLinkExternal = false;
    this.storage.data.cards.zoomFactor = 1;
    this.storage.data.app.hardwareAcceleration = true;
    this.storage.data.app.disableLoadingAnimations = false;
    this.storage.data.notification = {readNotifs: []};
    this.storage.data.app.collectErrors = true;
  }

  private migrate_0_81() {
    this.storage.data.terminal.closeTabOnExit = true;
  }

  private migrate_0_82() {
    const recents = this.storage.data.browser.recentAddress as unknown[] as FavIcons[];
    const urls = recents.map(recent => recent.url);
    this.storage.data.browser.favoriteAddress = [];
    this.storage.data.browser.favIcons = recents;
    this.storage.data.browser.historyAddress = urls;
    this.storage.data.browser.recentAddress = urls;
  }

  private migrate_0_83() {
    this.storage.data.cards.cardTerminalPreCommands = [];
    this.storage.data.app.addBreadcrumbs = true;
    this.migratedTo = 0.84;
  }

  private migrate_0_84() {
    this.storage.data.app.addBreadcrumbs = true;
  }

  private migrate_0_85() {
    this.storage.data.app.inited = false;
  }

  private migrate_0_86() {
    // @ts-expect-error: in old versions, there isn't disable cards
    this.storage.data.plugin = {migrated: false};
  }

  private migrate_0_87() {
    const behavior = this.storage.data.cardsConfig.customRunBehavior;
    if (!isEmpty(behavior)) {
      // @ts-ignore-next-line
      this.storage.data.cardsConfig.customRunBehavior = behavior.map((item: LegacyCustomRunBehaviorData) => {
        return {
          cardID: item.cardID,
          browser: item.browser === 'defaultBrowser' ? 'defaultBrowser' : 'appBrowser',
          terminal: item.terminal as CustomRunBehaviorData['terminal'],
          urlCatch: {
            delay: 10,
            customUrl: undefined,
            type: item.browser === 'doNothing' ? 'nothing' : 'module',
            findLine: undefined,
          },
        };
      });
    }
    this.storage.data.app.startMaximized = false;
    if (this.storage.data.terminal.scrollBack === 10000) {
      this.storage.data.terminal.scrollBack = 1000;
    }
  }

  private migrate_0_88() {
    this.storage.data.terminal.cdHistory = [];
  }

  private migrate_0_89() {
    if (!this.storage.data.terminal.quickCommands) {
      this.storage.data.terminal.quickCommands = [];
    }

    this.normalizeCustomRunBehavior();
    this.mergeDefaultHotkeys();
  }

  private migrate_0_9() {
    this.storage.data.performance = this.defaultData.performance;
  }

  private migrate_0_91() {
    if (!this.storage.data.browser.downloadLocation) {
      this.storage.data.browser.downloadLocation = join(app.getPath('downloads'), APP_NAME);
    }
    if (!this.storage.data.browser.downloadBehavior) {
      this.storage.data.browser.downloadBehavior = 'default';
    }
    if (!this.storage.data.browser.clearedDownloads) {
      this.storage.data.browser.clearedDownloads = [];
    }
  }

  private migrate_0_92() {
    if (!this.storage.data.browser.volumeSettings) {
      this.storage.data.browser.volumeSettings = {
        globalMuted: false,
        tabVolumes: {},
      };
    }
  }

  private migrate_0_93() {
    if (!this.storage.data.plugin.disabledCards) {
      this.storage.data.plugin.disabledCards = [];
    }
  }

  private migrate_0_94() {
    this.mergeDefaultHotkeys();
  }

  private migrate_0_95() {
    if (this.storage.data.terminal.enableLigatures === undefined) {
      this.storage.data.terminal.enableLigatures = true;
    }
  }

  private migrate_0_96() {
    this.storage.data.terminal.sendYWithExit = false;
    this.storage.data.app.exitSignalConfirm = true;
  }

  private migrate_0_97() {
    this.storage.data.cardsConfig.customArgs = {
      global: [],
      perCard: [],
    };
    this.storage.data.terminal.openLinkNewTab = false;
  }

  private migrate_0_98() {
    this.storage.data.app.sentryDsn = '';
  }

  private migrate_0_99() {
    this.storage.data.app.activeDays = [];
    this.storage.data.app.totalUsageTime = 0;
    this.storage.data.app.hasSeenUpgradePromo = false;
  }

  private migrate_1_00() {
    this.storage.data.app.hasSeenStarPromo = false;
    this.storage.data.app.hasStarredRepo = false;
  }

  private migrate_1_01() {
    this.storage.data.app.lastPromoShownActiveDaysCount = undefined;
  }

  private migrate_1_02() {
    this.storage.data.app.imageCacheIntervalDays = 30;
    this.storage.data.app.imageCacheMaxSize = 536870912;
  }

  private migrate_1_03() {
    if (!this.storage.data.browser.historyLimits) {
      this.storage.data.browser.historyLimits = {
        recentAddress: 100,
        historyAddress: 1000,
        favoriteAddress: 500,
        favIcons: 100,
      };
    } else if (this.storage.data.browser.historyLimits.favIcons === undefined) {
      this.storage.data.browser.historyLimits.favIcons = 100;
    }
  }

  private migrate_1_04() {
    if (this.storage.data.browser.userAgent === 'lynxhub') {
      this.storage.data.browser = {
        ...this.storage.data.browser,
        userAgent: 'chrome',
      };
    }
  }

  private migrate_1_05() {
    if (this.storage.data.performance) {
      if (this.storage.data.performance.enableParallelDownloading === undefined) {
        this.storage.data.performance.enableParallelDownloading = false;
      }
      if (this.storage.data.performance.enableSkiaGraphite === undefined) {
        this.storage.data.performance.enableSkiaGraphite = false;
      }
    }
  }

  private migrate_1_06() {
    if (this.storage.data.performance) {
      const oldVal = (this.storage.data.performance as any).ignoreGpuBlacklist;
      if (oldVal !== undefined) {
        this.storage.data.performance.ignoreGpuBlocklist = oldVal;
        delete (this.storage.data.performance as any).ignoreGpuBlacklist;
      } else if (this.storage.data.performance.ignoreGpuBlocklist === undefined) {
        this.storage.data.performance.ignoreGpuBlocklist = false;
      }
    }
  }

  private normalizeCustomRunBehavior() {
    const behavior = this.storage.data.cardsConfig.customRunBehavior as CustomRunBehaviorData[];
    if (!isEmpty(behavior)) {
      this.storage.data.cardsConfig.customRunBehavior = behavior.map(item => {
        const urlCatch = item.urlCatch || ({} as CustomRunBehaviorData['urlCatch']);

        return {
          ...item,
          urlCatch: {
            ...urlCatch,
            moduleDelay: urlCatch.moduleDelay && Number.isFinite(urlCatch.moduleDelay) ? urlCatch.moduleDelay : 0,
          },
        } as CustomRunBehaviorData;
      });
    }
  }

  private mergeDefaultHotkeys() {
    const currentHotkeys = this.storage.data.app.hotkeys || [];
    const defaultHotkeys = Get_Default_Hotkeys();

    const currentNames = new Set(currentHotkeys.map(h => h.name));
    const mergedHotkeys = [...currentHotkeys];

    defaultHotkeys.forEach(def => {
      if (!currentNames.has(def.name)) {
        mergedHotkeys.push(def);
      }
    });

    this.storage.data.app.hotkeys = mergedHotkeys;
  }

  private migrate_1_07() {
    if (this.storage.data.terminal && this.storage.data.terminal.fontLoadTimeout === undefined) {
      this.storage.data.terminal.fontLoadTimeout = 3000;
    }
  }

  private migrate_1_09() {
    this.mergeDefaultHotkeys();
  }

  private migrate_1_10() {
    if (this.storage.data.terminal && this.storage.data.terminal.autoExitSignalBeforeKill === undefined) {
      this.storage.data.terminal.autoExitSignalBeforeKill = false;
    }
  }

  private migrate_1_20() {
    if (this.storage.data.app && this.storage.data.app.forceReloadConfirm === undefined) {
      this.storage.data.app.forceReloadConfirm = true;
    }
  }

  private migrate_1_30() {
    if (
      this.storage.data.browser &&
      (this.storage.data.browser.userAgent === 'chrome' || !this.storage.data.browser.userAgent)
    ) {
      this.storage.data.browser = {
        ...this.storage.data.browser,
        userAgent: 'lynxhub',
      };
    }
  }
}
