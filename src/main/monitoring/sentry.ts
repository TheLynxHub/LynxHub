import {normalize} from 'node:path';

import {LYNXHUB_WEBSITE} from '@lynx_common/consts';
import {formatTime, isDev} from '@lynx_common/utils';
import StorageManager from '@lynx_main/storageSqlite/storageOperations';
import {Event, extraErrorDataIntegration, init as sentryInit} from '@sentry/electron/main';
import axios from 'axios';
import {app} from 'electron';

import {getAnonymousId, getSessionId} from '../utils/actionLogger';

/** Patterns for errors that should not be reported to Sentry */
const IGNORED_ERROR_PATTERNS = [
  // GPU process crashes - Chromium internal issues
  /crash_reporter::DumpWithoutCrashing/i,
  /GPU.*process.*exited/i,
  /abnormal-exit/i,
  /GpuWatchdogThread/i,
  // Windows loader/native crashes - Chromium/OS internal issues
  /LdrpInitializeInternal/i,
  /EXCEPTION_BREAKPOINT/i,
  // Git not installed - user environment issue
  /spawn git ENOENT/i,
  /spawn.*ENOENT/i,
  /git.*not found/i,
  /Git is not available/i,
  // Port already in use - user environment issue
  /EADDRINUSE/i,
  /address already in use/i,
  // Git clone destination exists - user action needed, not a bug
  /already exists and is not an empty directory/i,
  /destination path.*already exists/i,
  // Git clone interrupted mid-transfer by network issue - not a code bug
  // These errors contain git progress output (Receiving objects / Resolving deltas)
  // followed by a network or connection error
  /error.*RPC failed/i,
  /error.*early EOF/i,
  /fatal.*the remote end hung up unexpectedly/i,
  /fatal.*unable to access/i,
  /Connection reset by peer/i,
  /Recv failure.*Connection was reset/i,
];

/**
 * Checks if the error event should be ignored based on known patterns.
 * @param event - The Sentry event to check.
 * @returns boolean - True if the error should be ignored.
 */
function shouldIgnoreError(event: Event): boolean {
  const message = event.message || event.exception?.values?.[0]?.value || '';
  return IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Sends a Sentry error event (with exception stacktrace and breadcrumbs) immediately to the website.
 */
async function sendErrorToWebsite(event: Event): Promise<void> {
  const sessionId = getSessionId();
  const anonymousId = getAnonymousId();

  if (!sessionId || !anonymousId) {
    return;
  }

  const exception = event.exception?.values?.[0];
  const message = exception
    ? `${exception.type || 'Error'}: ${exception.value || 'Unknown error'}`
    : event.message || 'Unknown error';

  const errorAction = {
    category: 'error',
    message,
    level: 'error',
    timestamp: new Date(),
    payload: {
      event_id: event.event_id,
      exception: event.exception,
      breadcrumbs: event.breadcrumbs || [],
    },
  };

  const payload = {
    anonymousId,
    sessionId,
    appVersion: app.getVersion(),
    platform: process.platform,
    actions: [errorAction],
  };

  try {
    await axios.post(`${LYNXHUB_WEBSITE}/api/actions/collect`, payload, {timeout: 5000});
  } catch (err) {
    console.error('Failed to send error event to website:', err instanceof Error ? err.message : err);
  }
}

/**
 * Initializes Sentry for error tracking in the main process.
 * @param appStartTime - The timestamp when the app started.
 * @param release - The current app release version.
 * @param pluginsRootPath - The root path for plugins to filter out extension errors.
 * @param cachedDsn - The Sentry DSN loaded from cache.
 */
export function initSentry(appStartTime: number, release: string, pluginsRootPath: string, cachedDsn?: string) {
  if (isDev()) return;

  if (!cachedDsn) {
    console.warn('Sentry DSN not cached. Sentry will not be initialized this run.');
    return;
  }

  try {
    sentryInit({
      dsn: cachedDsn,
      release,
      integrations: [extraErrorDataIntegration()],
      beforeSend: event => {
        // Filter out known non-actionable errors
        if (shouldIgnoreError(event)) {
          return null;
        }

        const exception = event.exception?.values?.[0];
        let isFromExtension = false;

        if (exception?.stacktrace?.frames) {
          // Filter out errors originating from extensions/plugins
          isFromExtension = exception.stacktrace.frames.some(frame => {
            if (!frame.filename) {
              return false;
            }
            return normalize(frame.filename).startsWith(normalize(pluginsRootPath));
          });
        }

        if (isFromExtension) {
          console.log('Sentry event from an extension detected. Dropping.');
          return null;
        }

        // Add uptime to the event data
        event.extra = {
          ...event.extra,
          uptime: formatTime(Math.floor((Date.now() - appStartTime) / 1000)),
        };

        // Send Sentry error event to website immediately
        sendErrorToWebsite(event).catch(err => {
          console.error('Failed to send error event to website:', err);
        });

        return event;
      },
    });
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Fetches the latest Sentry DSN from the website and caches it in storage.
 * @param storageManager - The storage manager instance.
 */
export async function fetchAndCacheSentryDsn(storageManager: StorageManager): Promise<void> {
  try {
    const response = await axios.get(`${LYNXHUB_WEBSITE}/api/monitoring/sentry`, {
      timeout: 5000,
    });
    const dsn = response.data?.dsn;
    if (dsn) {
      const currentDsn = storageManager.getData('app').sentryDsn;
      if (currentDsn !== dsn) {
        storageManager.updateData('app', {sentryDsn: dsn});
        console.log('Sentry DSN updated and cached.');
      }
    } else {
      console.warn('Sentry DSN not found in website response.');
    }
  } catch (error) {
    console.error('Failed to fetch Sentry DSN from website:', axios.isAxiosError(error) ? error.message : error);
  }
}
