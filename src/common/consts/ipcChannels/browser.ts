/**
 * IPC channels for browser-related functionality.
 * Handles tab management, navigation, zoom, volume, and other webview interactions.
 */
export const browserChannels = {
  createBrowser: 'browser:create-browser',
  removeBrowser: 'browser:remove-browser',
  loadURL: 'browser:load-url',
  setVisible: 'browser:set-visible',

  openFindInPage: 'browser:openFindInPage',
  openZoom: 'browser:openZoom',
  openVolume: 'browser:openVolume',

  onZoomChanged: 'browser:on-zoom-changed',

  onLinkHover: 'browser:on-link-hover',
  resizeLinkPreview: 'browser:resize-link-preview',
  resizeBrowserView: 'browser:resize-browser-view',

  findInPage: 'browser:findInPage',
  stopFindInPage: 'browser:stopFindInPage',
  onFoundInPage: 'browser:on-found-in-page',
  setZoomFactor: 'browser:setZoomFactor',

  focusWebView: 'browser:focus-webview',

  clearCache: 'browser:clear-cache',
  clearCookies: 'browser:clear-cookies',

  reload: 'browser:reload',
  focus: 'browser:focus',
  stop: 'browser:stop',
  goBack: 'browser:goBack',
  goForward: 'browser:goForward',

  toggleDevTools: 'browser:toggle-devtools',

  onCanGo: 'browser:on-can-go',
  isLoading: 'browser:is-loading',
  onTitleChange: 'browser:on-title-change',
  onFavIconChange: 'browser:on-favicon-change',
  onUrlChange: 'browser:on-url-change',
  onDomReady: 'browser:on-dom-ready',

  getUserAgent: 'browser:get-user-agent',
  updateUserAgent: 'browser:update-user-agent',

  clearHistory: 'browser:clear-history',

  onFailedLoadUrl: 'browser:on-failed-load-url',
  onClearFailed: 'browser:on-clear-failed',

  setVolume: 'volume:set',
  setMuted: 'volume:setMuted',
  getState: 'volume:getState',

  updateTabVolume: 'volume:updateTabVolume',
  updateTabMuted: 'volume:updateTabMuted',
  onTabVolumeUpdate: 'volume:onTabVolumeUpdate',
  onTabMutedUpdate: 'volume:onTabMutedUpdate',

  onAudioStateChange: 'volume:onAudioStateChange',
  executeJavaScript: 'browser:execute-javascript',
} as const;
