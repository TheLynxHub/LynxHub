/**
 * IPC channels for Quick Web floating preview window and preload engine.
 */
export const quickWebChannels = {
  // Window control
  toggleWindow: 'quickWeb:toggleWindow',
  showWindow: 'quickWeb:showWindow',
  hideWindow: 'quickWeb:hideWindow',
  isWindowVisible: 'quickWeb:isWindowVisible',
  setAlwaysOnTop: 'quickWeb:setAlwaysOnTop',
  minimizeWindow: 'quickWeb:minimizeWindow',
  closeWindow: 'quickWeb:closeWindow',

  // Navigation & browser controls
  loadUrl: 'quickWeb:loadUrl',
  selectItem: 'quickWeb:selectItem',
  goBack: 'quickWeb:goBack',
  goForward: 'quickWeb:goForward',
  reload: 'quickWeb:reload',
  stop: 'quickWeb:stop',
  openInMainTab: 'quickWeb:openInMainTab',
  openExternal: 'quickWeb:openExternal',
  toggleDevTools: 'quickWeb:toggleDevTools',

  // Config & state
  getConfig: 'quickWeb:getConfig',
  updateConfig: 'quickWeb:updateConfig',
  addItem: 'quickWeb:addItem',
  updateItem: 'quickWeb:updateItem',
  removeItem: 'quickWeb:removeItem',
  reorderItems: 'quickWeb:reorderItems',

  // Events: Main -> Quick Web Window & MainWindow
  onStateChange: 'quickWeb:onStateChange',
  onCanGo: 'quickWeb:onCanGo',
  onLoading: 'quickWeb:onLoading',
  onTitleChange: 'quickWeb:onTitleChange',
  onFavIconChange: 'quickWeb:onFavIconChange',
  onUrlChange: 'quickWeb:onUrlChange',
  onConfigChange: 'quickWeb:onConfigChange',
  onWindowVisibilityChange: 'quickWeb:onWindowVisibilityChange',
  onPinnedChange: 'quickWeb:onPinnedChange',
} as const;
