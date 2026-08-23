import CrashRestoreBanner from '@lynx/components/session/CrashRestoreBanner';
import {useAppState} from '@lynx/redux/reducers/app';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {PageID} from '@lynx_common/consts';
import {memo} from 'react';

import AppPages from './AppPages';
import NavBar from './navBar';
import StatusBar from './statusBar';
import TabWrapper from './TabWrapper';

/**
 * Main layout component for the application content area.
 * Renders the Navigation Bar, the main content area (AppPages), and the Status Bar.
 */
const MainContents = memo(() => {
  const tabs = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');

  const navBar = useAppState('navBar');
  const activePage = useTabsState('activePage');

  const isSettingsOrDashboard = activePage === PageID.settings || activePage === PageID.dashboard;
  const paddingClass = isSettingsOrDashboard && navBar ? 'pl-0' : '';

  return (
    <div className="absolute inset-0 top-10! flex flex-col transition duration-300">
      <CrashRestoreBanner />
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;

        return (
          <TabWrapper tabID={tab.id} isActive={isActive} key={`${tab.id}_wrapper`}>
            <NavBar tabID={tab.id} pageID={tab.pageID} />
            <div className={`size-full p-3 pt-1.5 ${paddingClass} transition-all duration-300 overflow-hidden`}>
              <AppPages tabID={tab.id} pageID={tab.pageID} />
            </div>
          </TabWrapper>
        );
      })}

      <StatusBar />
    </div>
  );
});

export default MainContents;
