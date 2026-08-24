/**
 * IPC channels for general application events and commands.
 * Handles state changes, dark mode, system info, updates, and more.
 */
export const appChannels = {
  changeState: 'app:changeState',
  onChangeState: 'app:onChangeState',

  setDarkMode: 'app:setDarkMode',
  getSystemDarkMode: 'app:getSystemDarkMode',
  onDarkMode: 'app:onDarkMode',
  isDarkMode: 'app:isDarkMode',

  setTaskBarStatus: 'app:setTaskBarStatus',

  getSystemInfo: 'app:getSystemInfo',
  openUrlDefaultBrowser: 'app:openUrlDefaultBrowser',

  // Window progress bar (taskbar/dock)
  setProgressBar: 'app:setProgressBar',

  hotkeysChange: 'app:hotkeysChange',
  showToast: 'app:showToast',
  toastBtnPress: 'app:toastBtnPress',

  onNewTab: 'app:new-tab',

  updateError: 'app:updateError',
  updateStatus: 'app:updateStatus',
  updateDownload: 'app:updateDownload',
  updateCancel: 'app:updateCancel',
  updateInstall: 'app:updateInstall',
  updateInstallLater: 'app:updateInstallLater',
  updateChannelChange: 'app:updateChannelChange',

  getCurrentDataPath: 'app:getCurrentDataPath',
  selectAnotherDataPath: 'app:selectAnotherDataPath',
  isValidDataPath: 'app:isValidDataPath',

  checkGitInstalled: 'app:checkGitInstalled',
  checkPwsh7Installed: 'app:checkPwsh7Installed',

  disableLoadingAnimations: 'app:disableLoadingAnimations',
  onOnline: 'app:onOnline',

  getCliArgs: 'app:getCliArgs',
  getProcessMetrics: 'app:getProcessMetrics',
  logProcessMetrics: 'app:logProcessMetrics',
} as const;
