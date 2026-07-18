import {memo} from 'react';

import {useRegisterHotkeys} from './hotkeys';
import useHtmlAttributes from './htmlAttributes';
import {useClearOldFaviconCache, useMigrateCardTitles} from './migration';
import {useFilterPinnedCards} from './states';
import useCheckPluginLoadFailures from './useCheckPluginLoadFailures';
import useAppEvents from './useEvents';
import {useOnlineBgManager} from './useOnlineBgManager';
import {useSpotlightSync} from './useSpotlightSync';
import useUsageTracker from './useUsageTracker';
import useVolumeSync from './volume';

const AppHooks = memo(() => {
  useHtmlAttributes();
  useRegisterHotkeys();
  useAppEvents();
  useFilterPinnedCards();
  useMigrateCardTitles();
  useClearOldFaviconCache();
  useVolumeSync();
  useCheckPluginLoadFailures();
  useUsageTracker();
  useOnlineBgManager();
  useSpotlightSync();

  return null;
});

export default AppHooks;
