import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useAppState} from '@lynx/redux/reducers/app';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {isEmpty} from 'lodash-es';
import {memo, useMemo} from 'react';

import {ContentsNav, SettingsNav} from './Buttons';

const CONTAINER_WIDTH = 'w-[5.5rem]';

type Props = {tabID?: string; pageID?: string};

/**
 * Navigation bar containing two sections: Contents and Settings.
 * Supports extension replacements for container, content bar, and settings bar.
 */
const NavBar = memo(({pageID: propPageID}: Props = {}) => {
  const navBar = useAppState('navBar');
  const activePage = useTabsState('activePage');

  const pageID = propPageID ?? activePage;
  const {
    container: Container,
    contentBar: ContentBar,
    settingsBar: SettingsBar,
  } = useMemo(() => extensionsData.navBar.replace, []);

  if (!navBar) return null;

  if (Container) {
    return <Container />;
  }

  return (
    <div className={`flex h-full ${CONTAINER_WIDTH} shrink-0 flex-col items-center justify-between pb-4 pt-3`}>
      {isEmpty(ContentBar) ? (
        <div className="flex items-center justify-center">
          <ContentsNav pageID={pageID} />
        </div>
      ) : (
        <ContentBar />
      )}
      {isEmpty(SettingsBar) ? (
        <div className="flex items-center justify-center">
          <SettingsNav pageID={pageID} />
        </div>
      ) : (
        <SettingsBar />
      )}
    </div>
  );
});

export default NavBar;
