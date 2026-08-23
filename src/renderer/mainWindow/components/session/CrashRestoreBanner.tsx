import {Button} from '@heroui/react';
import {sessionActions, useSessionState} from '@lynx/redux/reducers/session';
import {AppDispatch} from '@lynx/redux/store';
import {restoreSessionSnapshot} from '@lynx/utils/sessionRestoreHelper';
import {HistoryIcon, RefreshIcon} from '@solar-icons/react/bold-duotone';
import {CloseCircleIcon} from '@solar-icons/react/linear';
import {AnimatePresence, motion} from 'framer-motion';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Interactive banner displayed when an unexpected app crash/termination is detected on startup.
 */
const CrashRestoreBanner = memo(() => {
  const showCrashBanner = useSessionState('showCrashBanner');
  const crashedSession = useSessionState('crashedSession');
  const config = useSessionState('config');
  const dispatch = useDispatch<AppDispatch>();

  const handleRestore = useCallback(() => {
    if (crashedSession) {
      restoreSessionSnapshot(crashedSession, config, dispatch);
      dispatch(sessionActions.dismissCrashBanner());
    }
  }, [crashedSession, config, dispatch]);

  const handleDismiss = useCallback(() => {
    dispatch(sessionActions.dismissCrashBanner());
  }, [dispatch]);

  if (!showCrashBanner || !crashedSession || !crashedSession.tabs || crashedSession.tabs.length === 0) {
    return null;
  }

  const tabCount = crashedSession.tabs.length;

  return (
    <AnimatePresence>
      <motion.div
        animate={{opacity: 1, y: 0, scale: 1}}
        exit={{opacity: 0, y: -20, scale: 0.98}}
        initial={{opacity: 0, y: -20, scale: 0.98}}
        className="px-4 py-2.5 z-40 w-full shrink-0"
        transition={{duration: 0.25, ease: 'easeOut'}}>
        <div
          className={
            'w-full flex items-center justify-between gap-x-4 px-4 py-3 ' +
            'rounded-2xl border border-warning-200/50 dark:border-warning-900/40 ' +
            'bg-warning-50/90 dark:bg-warning-950/40 backdrop-blur-md shadow-md'
          }>
          <div className="flex items-center gap-x-3 min-w-0">
            <div className="size-9 rounded-xl bg-warning-500/15 flex items-center justify-center shrink-0">
              <HistoryIcon className="size-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">Restore Previous Session</span>
              <span className="text-xs text-foreground/70 truncate">
                {`LynxHub closed unexpectedly. Would you like to restore your ${tabCount} ` +
                  `previous tab${tabCount > 1 ? 's' : ''}?`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-x-2 shrink-0">
            <Button size="sm" variant="primary" onPress={handleRestore}>
              <RefreshIcon className="size-4" />
              <span>Restore Tabs</span>
            </Button>
            <Button size="sm" variant="ghost" onPress={handleDismiss}>
              <CloseCircleIcon className="size-4 text-foreground/60" />
              <span>Dismiss</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default CrashRestoreBanner;
