import {DropdownItem} from '@heroui/react';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {useInstalledCard} from '@lynx/utils/hooks';
import {Extensions2_Icon, GitHub_Icon, Terminal_Icon} from '@lynx_assets/icons';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {SettingsMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {useGetInstallType} from '../../../../plugins/modules';
import {useCardStore} from '../../store';
import {CommonProps} from '../about/types';

/**
 * Menu item to open the launch configuration modal.
 */
export const LaunchConfigMenuItem = ({state}: CommonProps) => {
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);
  const title = useCardStore(st => st.title);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "launch-config" on "${title}"`);
    state.open();
    setMenuIsOpen(false);
  }, [setMenuIsOpen, title]);

  return (
    <DropdownItem onPress={onPress} key="launch-config">
      <SettingsMinimalisticIcon className="size-4" />
      Launch Config
    </DropdownItem>
  );
};

/**
 * Menu item to open the extensions modal.
 * Hidden if the card has no extensions directory.
 */
export const ExtensionsMenuItem = ({state}: CommonProps) => {
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);
  const extensionsDir = useCardStore(st => st.extensionsDir);
  const title = useCardStore(st => st.title);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "extensions" on "${title}"`);
    state.open();
    setMenuIsOpen(false);
  }, [setMenuIsOpen, state, title]);

  if (!extensionsDir) return null;

  return (
    <DropdownItem key="extensions" onPress={onPress}>
      <Extensions2_Icon className="size-4" />
      Extensions
    </DropdownItem>
  );
};

/**
 * Menu item to open the repository configuration modal.
 * Hidden if the install type is 'others'.
 */
export const RepoConfigMenuItem = ({state}: CommonProps) => {
  const id = useCardStore(st => st.id);
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);
  const title = useCardStore(st => st.title);

  const installType = useGetInstallType(id);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "repository" on "${title}"`);
    state.open();
    setMenuIsOpen(false);
  }, [setMenuIsOpen, title]);

  if (installType === 'others') return null;

  return (
    <DropdownItem key="repoSetting" onPress={onPress}>
      <GitHub_Icon className="ml-0.5 size-3.5" />
      Repository
    </DropdownItem>
  );
};

/**
 * Menu item to open a session in the card's installation folder.
 * Hidden if the card has no directory.
 */
export const SessionMenuItem = () => {
  const id = useCardStore(st => st.id);
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);
  const title = useCardStore(st => st.title);

  const card = useInstalledCard(id);
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();

  const onPress = useCallback(() => {
    if (!card?.dir) return;
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "session" on "${title}"`);
    dispatch(
      cardsActions.addRunningEmpty({
        tabId: activeTab,
        type: 'both',
        dir: card.dir,
      }),
    );
    setMenuIsOpen(false);
  }, [activeTab, card?.dir, dispatch, setMenuIsOpen, title]);

  if (!card?.dir) return null;

  return (
    <DropdownItem key="session" onPress={onPress}>
      <Terminal_Icon className="size-4" />
      Session
    </DropdownItem>
  );
};
