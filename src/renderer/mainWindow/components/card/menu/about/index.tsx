import {DropdownItem} from '@heroui/react';
import filesIpc from '@lynx_shared/ipc/files';
import storageIpc from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {
  CopyIcon,
  FolderOpenIcon,
  HomeAngle2Icon,
  InfoSquareIcon,
  SquareTopDownIcon,
} from '@solar-icons/react/bold-duotone';
import {useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

import {duplicateCard, removeDuplicatedCard} from '../../../../plugins/modules';
import {cardsActions, useCardsState} from '../../../../redux/reducers/cards';
import {useHotkeysState} from '../../../../redux/reducers/hotkeys';
import {AppDispatch} from '../../../../redux/store';
import {useInstalledCard} from '../../../../utils/hooks';
import {useCardStore} from '../../store';
import {CommonProps} from './types';

/**
 * Menu item to show card information or open its folder.
 * Displays 'Open Folder' if Ctrl is pressed and directory exists.
 */
export const AboutMenuItem = ({state}: CommonProps) => {
  const id = useCardStore(st => st.id);
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);

  const title = useCardStore(st => st.title);

  const isCtrlPressed = useHotkeysState('isCtrlPressed');
  const webUI = useInstalledCard(id);

  const showOpenFolder = useMemo(() => {
    return !!webUI?.dir && isCtrlPressed;
  }, [webUI?.dir, isCtrlPressed]);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "information" on "${title}"`);
    if (showOpenFolder && webUI?.dir) {
      filesIpc.openPath(webUI.dir);
      setMenuIsOpen(false);
    } else {
      state.open();
      setMenuIsOpen(false);
    }
  }, [showOpenFolder, webUI?.dir, setMenuIsOpen, title]);

  return (
    <DropdownItem key="information" onPress={onPress}>
      {showOpenFolder ? <FolderOpenIcon className="size-4" /> : <InfoSquareIcon className="size-4" />}
      {showOpenFolder ? 'Open Folder' : 'Information'}
    </DropdownItem>
  );
};

/**
 * Menu item to open the card's homepage (repo URL) or readme.
 * Opens in browser if Ctrl is pressed.
 */
export function HomePageMenuItem({state}: CommonProps) {
  const repoUrl = useCardStore(st => st.repoUrl);
  const title = useCardStore(st => st.title);
  const setMenuIsOpen = useCardStore(st => st.setMenuIsOpen);

  const isCtrlPressed = useHotkeysState('isCtrlPressed');

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "homepage" on "${title}"`);
    if (isCtrlPressed) {
      window.open(repoUrl);
      setMenuIsOpen(false);
    } else {
      state.open();
      setMenuIsOpen(false);
    }
  }, [setMenuIsOpen, repoUrl, title, isCtrlPressed]);

  return (
    <DropdownItem key="homepage" onPress={onPress}>
      <HomeAngle2Icon className="size-4" />
      HomePage
      {isCtrlPressed && <SquareTopDownIcon className="size-3.5" />}
    </DropdownItem>
  );
}

/**
 * Menu item to duplicate or remove a duplicate of the card.
 */
export const DuplicateMenuItem = () => {
  const id = useCardStore(state => state.id);

  const duplicates = useCardsState('duplicates');
  const isDuplicated = useMemo(() => duplicates.some(card => card.id === id), [duplicates, id]);

  const dispatch = useDispatch<AppDispatch>();
  const title = useCardStore(state => state.title);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "duplicate" on "${title}"`);
    if (isDuplicated) {
      const removedDuplicate = duplicates.filter(d => d.id !== id);
      storageIpc.update('cards', {duplicated: removedDuplicate});
      dispatch(cardsActions.setDuplicates(removedDuplicate));
      removeDuplicatedCard(id);
    } else {
      const duplicatedCard = duplicateCard(id);
      if (duplicatedCard) {
        const addedDuplicate = [...duplicates, {...duplicatedCard, ogID: id}];
        storageIpc.update('cards', {duplicated: addedDuplicate});
        dispatch(cardsActions.setDuplicates(addedDuplicate));
      }
    }
  }, [dispatch, isDuplicated, duplicates, id, title]);

  return (
    <DropdownItem onPress={onPress} key="duplicate_card">
      <CopyIcon className="size-4" />
      {isDuplicated ? 'Remove Duplicate' : 'Duplicate'}
    </DropdownItem>
  );
};
