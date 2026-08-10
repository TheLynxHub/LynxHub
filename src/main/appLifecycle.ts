import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

import {APP_BUILD_NUMBER, APP_VERSION} from '@lynx_common/consts';
import {isMac, isWin} from '@lynx_common/utils';
import {app, net, protocol} from 'electron';

import ShareScreenManager from './childWindows/shareScreen';
import classHolder from './managers/classHolder';
import {getAppDirectory} from './managers/dataFolder';
import {getImageCacheManager, registerImageCacheScheme} from './managers/imageCache';
import {getUserImagesManager, registerUserImagesScheme} from './managers/userImages';
import {initSentry} from './monitoring/sentry';

/**
 * Configures application settings, command line switches, and protocols before the app is ready.
 * Initializes Sentry, sets hardware acceleration, and registers custom schemes.
 */
export function configureAppBeforeReady(): void {
  const {storageManager, appStartTime} = classHolder;

  const {hardwareAcceleration, collectErrors, sentryDsn} = storageManager.getData('app');
  const performanceSettings = storageManager.getData('performance');

  if (!hardwareAcceleration) app.disableHardwareAcceleration();

  // Apply performance settings as command-line switches
  if (performanceSettings.forceColorProfile !== 'default') {
    app.commandLine.appendSwitch('force-color-profile', performanceSettings.forceColorProfile);
  }
  if (performanceSettings.highDpiSupport) {
    app.commandLine.appendSwitch('high-dpi-support', '1');
  }
  if (performanceSettings.autoplayPolicy !== 'default') {
    app.commandLine.appendSwitch('autoplay-policy', performanceSettings.autoplayPolicy);
  }
  if (performanceSettings.enableAcceleratedVideoDecode) {
    app.commandLine.appendSwitch('enable-accelerated-video-decode');
  }
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${performanceSettings.jsMaxOldSpaceSize}`);
  if (performanceSettings.ignoreGpuBlocklist) {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
  }
  if (performanceSettings.diskCacheSize > 0) {
    app.commandLine.appendSwitch('disk-cache-size', String(performanceSettings.diskCacheSize));
  }
  const enabledFeatures: string[] = [];
  if (performanceSettings.enableWebAssemblySimd) {
    enabledFeatures.push('WebAssemblySimd');
  }
  if (performanceSettings.enableParallelDownloading) {
    enabledFeatures.push('ParallelDownloading');
  }
  if (performanceSettings.enableSkiaGraphite) {
    enabledFeatures.push('SkiaGraphite');
  }
  if (enabledFeatures.length > 0) {
    app.commandLine.appendSwitch('enable-features', enabledFeatures.join(','));
  }
  if (performanceSettings.forceHighPerformanceGpu) {
    app.commandLine.appendSwitch('force_high_performance_gpu');
  }
  if (performanceSettings.disableGpuVsync) {
    app.commandLine.appendSwitch('disable-gpu-vsync');
  }
  if (performanceSettings.disableFrameRateLimit) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
  }
  if (performanceSettings.enableGpuRasterization) {
    app.commandLine.appendSwitch('enable-gpu-rasterization');
  }
  if (performanceSettings.enableZeroCopy) {
    app.commandLine.appendSwitch('enable-zero-copy');
  }

  // Register plugin protocol scheme
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'lynxplugin',
      privileges: {
        standard: true,
        secure: true,
        corsEnabled: true,
        supportFetchAPI: true,
      },
    },
  ]);

  // Register image cache protocol scheme
  registerImageCacheScheme();

  // Register user local images protocol scheme
  registerUserImagesScheme();

  if (collectErrors) {
    initSentry(
      appStartTime,
      `Version:${APP_VERSION}, Build:${APP_BUILD_NUMBER}`,
      getAppDirectory('Plugins'),
      sentryDsn,
    );
  }
}

/**
 * Registers handlers for custom protocols like 'lynxplugin'.
 * Initializes the image cache manager.
 */
export async function registerCustomProtocols(): Promise<void> {
  // Initialize image cache manager
  await getImageCacheManager().initialize();

  // Initialize user images manager
  await getUserImagesManager().initialize();

  protocol.handle('lynxplugin', request => {
    try {
      const url = new URL(request.url);
      const pluginId = url.hostname;
      const relativePath = url.pathname || '/';

      const pluginDir = classHolder.pluginManager?.getDirById(pluginId) || join(getAppDirectory('Plugins'), pluginId);
      const filePath = join(pluginDir, relativePath);
      const fileUrl = pathToFileURL(filePath).toString();

      return net.fetch(fileUrl);
    } catch (error) {
      console.error('Failed to resolve lynxplugin protocol URL:', error);
      return new Response('Not Found', {status: 404});
    }
  });
}

/**
 * Handles application initialization tasks when the app is ready to show UI.
 * Sets up extensions, taskbar/dock state, startup behavior, login items, and background services.
 */
export function handleAppReadyToShow(): void {
  const {extensionManager, cardsValidator} = classHolder;
  extensionManager?.onReadyToShow();
  handleTaskbarStatus();
  handleStartupBehavior();
  if (isWin) setLoginItemSettings();
  cardsValidator?.checkAndWatch();

  classHolder.shareScreenManager = new ShareScreenManager();
  classHolder.shareScreenManager.start();
}

/**
 * Configures the taskbar/dock visibility and tray icon based on settings.
 */
function handleTaskbarStatus(): void {
  const {storageManager, appManager, trayManager} = classHolder;

  const {taskbarStatus} = storageManager.getData('app');
  const mainWindow = appManager?.getMainWindow();

  switch (taskbarStatus) {
    case 'taskbar-tray':
      trayManager?.createTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
      break;
    case 'tray-minimized':
    case 'taskbar':
      trayManager?.destroyTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
      break;
    case 'tray':
      trayManager?.createTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(true);
      } else if (isMac && app.dock?.isVisible()) {
        app.dock?.hide();
      }
      break;
  }
}

/**
 * Handles the initial window state (minimized/maximized/bounds) based on startup settings.
 */
function handleStartupBehavior(): void {
  const {storageManager, appManager} = classHolder;

  const {startMinimized, startMaximized, lastSize, openLastSize} = storageManager.getData('app');
  const mainWindow = appManager?.getMainWindow();

  if (!mainWindow) return;

  if (openLastSize && lastSize) {
    const {bounds, maximized} = lastSize;

    if (bounds) mainWindow.setBounds(bounds, false);
    if (maximized) mainWindow.maximize();
  }

  if (startMaximized) {
    mainWindow.maximize();
  }

  if (startMinimized) {
    mainWindow.minimize();
  } else {
    mainWindow.show();
  }
}

/**
 * Configures the app to open at login if enabled in settings.
 */
function setLoginItemSettings(): void {
  const {storageManager} = classHolder;

  const {systemStartup} = storageManager.getData('app');
  app.setLoginItemSettings({openAtLogin: systemStartup});
}
