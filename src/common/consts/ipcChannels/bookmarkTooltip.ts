/**
 * IPC channels for Bookmark hover preview tooltip window.
 */
export const bookmarkTooltipChannels = {
  showTooltip: 'bookmarkTooltip:show',
  hideTooltip: 'bookmarkTooltip:hide',
  resizeTooltip: 'bookmarkTooltip:resize',
  onTooltipData: 'bookmarkTooltip:onData',
} as const;
