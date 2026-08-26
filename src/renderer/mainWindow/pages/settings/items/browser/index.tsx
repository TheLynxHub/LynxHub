import SettingsSection from '@lynx/components/SettingsSection';
import {EarthIcon} from '@solar-icons/react/bold-duotone';

import AudioControl from './AudioControl';
import BookmarkNewTabSetting from './BookmarkNewTab';
import BookmarksBarSetting from './BookmarksBar';
import ClearBrowserData from './ClearBrowserData';
import Downloads from './Downloads';
import ExternalLinks from './ExternalLinks';
import HistoryLimits from './HistoryLimits';
import LoadingSkeletonSetting from './LoadingSkeleton';
import UserAgent from './UserAgent';

export const SettingsBrowserId = 'settings_browser_elem';

export default function SettingsBrowser() {
  return (
    <SettingsSection title="Browser" id={SettingsBrowserId} icon={<EarthIcon className="size-5" />}>
      <BookmarksBarSetting />
      <BookmarkNewTabSetting />
      <LoadingSkeletonSetting />
      <ExternalLinks />
      <UserAgent />
      <Downloads />
      <AudioControl />
      <HistoryLimits />
      <ClearBrowserData />
    </SettingsSection>
  );
}
