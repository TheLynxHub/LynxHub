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

  return (
    <div className="absolute inset-0 top-10! flex flex-col transition duration-300">
      <CrashRestoreBanner />
      <div className="relative size-full flex-1 min-w-0 overflow-hidden">
        <div className="absolute inset-y-0 left-0 h-full z-0">
          <NavBar />
        </div>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          const isSettingsOrDashboard = tab.pageID === PageID.settings || tab.pageID === PageID.dashboard;
          const paddingClass = isSettingsOrDashboard && navBar ? 'pl-0' : '';
          const contentClass =
            `size-full flex-1 min-w-0 pointer-events-auto p-3 pt-1.5 ${paddingClass} ` +
            'transition-all duration-300 overflow-hidden';

          return (
            <TabWrapper tabID={tab.id} isActive={isActive} key={`${tab.id}_wrapper`}>
              {navBar && <div aria-hidden="true" className="w-[5.5rem] shrink-0 pointer-events-none" />}
              <div className={contentClass}>
                <AppPages tabID={tab.id} pageID={tab.pageID} />
              </div>
            </TabWrapper>
          );
        })}
      </div>

      <StatusBar />
    </div>
  );
});

export default MainContents;
