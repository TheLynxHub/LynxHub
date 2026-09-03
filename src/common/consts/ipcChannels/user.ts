/**
 * IPC channels for user-related operations.
 * Handles user authentication and Patreon integration.
 */
export const userChannels = {
  account: {
    getInfo: 'account:getInfo',
    login: 'account:login',
    logout: 'account:logout',
    updateChannel: 'account:updateChannel',
    checkGitHubStar: 'account:checkGitHubStar',
    starGitHubRepo: 'account:starGitHubRepo',
    submitFeedback: 'account:submitFeedback',

    onReleaseChannel: 'account:onReleaseChannel',
    onUserDataChange: 'account:onUserDataChange',
  },
} as const;
