/**
 * IPC channels for context menu actions.
 * Handles right-click menus, text editing operations, and specific context actions.
 */
export const contextMenuChannels = {
  rightClick: 'context:rightClick',
  onFind: 'context:find-in-page',
  onTerminateAI: 'context:on-terminate-ai',
  onSendExitProcess: 'context:on-send-exit-process',
  onTerminateTab: 'context:on-terminate-tab',
  onCloseApp: 'context:on-close-app',
  onZoom: 'context:zoom-page',
  onPrompt: 'context:prompt',
  onVolume: 'context:volume-control',
  onDownloads: 'context:downloads',

  relaunchAI: 'context:relaunch-ai',
  onRelaunchAI: 'context:on-relaunch-ai',
  stopAI: 'context:stop-ai',
  onStopAI: 'context:on-stop-ai',

  removeTab: 'context:remove-tab',
  onRemoveTab: 'context:on-remove-tab',

  resizeWindow: 'context:resize-window',
  hideWindow: 'context:hide-window',
  requestShow: 'context:request-show',
  showReady: 'context:show-ready',
  copy: 'context:copy',
  cut: 'context:cut',
  paste: 'context:paste',
  replaceMisspelling: 'context:replaceMisspelling',
  selectAll: 'context:selectAll',
  undo: 'context:undo',
  redo: 'context:redo',

  newTab: 'context:newTab',

  downloadImage: 'context:download-image',
  copyImage: 'context:copy-image',
  searchWithGoogle: 'context:search-google',
  inspectElement: 'context:inspect-element',
  navigate: 'context:navigate',

  openTerminateAI: 'context:open-terminate-ai',
  openSendExitSignal: 'context:open-send-exit-signal',
  openTerminateTab: 'context:open-terminate-tab',
  openCloseApp: 'context:open-close-app',
} as const;
