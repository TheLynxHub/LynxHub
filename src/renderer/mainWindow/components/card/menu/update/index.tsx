import {Checkbox, DropdownItem, Spinner} from '@heroui/react';
import {extractGitUrl} from '@lynx_common/utils';
import gitIpc from '@lynx_shared/ipc/git';
import moduleIpc from '@lynx_shared/ipc/plugins/module';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {DownloadMinimalisticIcon, RefreshIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {getCardMethod, useAllCardMethods} from '../../../../plugins/modules';
import {cardsActions} from '../../../../redux/reducers/cards';
import {AppDispatch} from '../../../../redux/store';
import {useInstalledCard, useIsAutoUpdateCard, useUpdateAvailable, useUpdatingCard} from '../../../../utils/hooks';
import {useCardStore} from '../../store';
import {CommonProps} from '../about/types';

/**
 * Menu item to trigger an update for the card.
 */
export const UpdateMenuItem = ({setType, state}: {setType: (type: 'install' | 'update') => void} & CommonProps) => {
  const id = useCardStore(state => state.id);
  const setMenuIsOpen = useCardStore(state => state.setMenuIsOpen);
  const repoUrl = useCardStore(state => state.repoUrl);
  const title = useCardStore(state => state.title);

  const devName = useMemo(() => extractGitUrl(repoUrl).owner, [repoUrl]);
  const updating = useUpdatingCard(id);
  const autoUpdate = useIsAutoUpdateCard(id);
  const webUi = useInstalledCard(id);
  const updateAvailable = useUpdateAvailable(id);
  const allMethods = useAllCardMethods();

  const dispatch = useDispatch<AppDispatch>();

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "update" on "${title}"`);
    if (getCardMethod(allMethods, id, 'manager')?.updater.startUpdate) {
      setType('update');
      state.open();
      setMenuIsOpen(false);
    } else if (webUi && webUi.dir) {
      dispatch(cardsActions.addUpdatingCard({devName, id, title}));
      setMenuIsOpen(false);
      gitIpc.pull(webUi.dir, id);
    }
  }, [dispatch, setMenuIsOpen, webUi, devName, id, title, allMethods]);

  if (!updateAvailable || autoUpdate) return null;

  return (
    <DropdownItem
      key="update"
      onPress={onPress}
      isDisabled={updating}
      className={`${updateAvailable && 'text-success'} justify-between`}>
      <div className="flex items-center gap-x-4">
        <DownloadMinimalisticIcon className="size-4" />
        Update
      </div>
      {updating && <Spinner size="sm" color="success" />}
    </DropdownItem>
  );
};

/**
 * Menu item to check for updates manually.
 */
export const CheckForUpdateMenuItem = () => {
  const id = useCardStore(state => state.id);
  const checkingForUpdate = useCardStore(state => state.checkingForUpdate);
  const setCheckingForUpdate = useCardStore(state => state.setCheckingForUpdate);

  const autoUpdate = useIsAutoUpdateCard(id);
  const card = useInstalledCard(id);
  const updateAvailable = useUpdateAvailable(id);
  const allMethods = useAllCardMethods();

  const dispatch = useDispatch<AppDispatch>();
  const title = useCardStore(state => state.title);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Card Menu Action: Clicked "check-update" on "${title}"`);
    setCheckingForUpdate(true);
    if (card) {
      const updateType = allMethods.find(c => c.id === id)?.methods?.['manager']?.updater.updateType;
      moduleIpc.cardUpdateAvailable(card, updateType).then(isAvailable => {
        if (isAvailable) dispatch(cardsActions.addUpdateAvailable(id));
        setCheckingForUpdate(false);
      });
    }
  }, [dispatch, setCheckingForUpdate, card, id, allMethods, title]);

  if (updateAvailable || autoUpdate) return null;

  return (
    <DropdownItem onPress={onPress} key="check-update" isDisabled={checkingForUpdate}>
      {checkingForUpdate ? <Spinner size="sm" color="current" /> : <RefreshIcon className="size-4" />}
      Check For Updates
    </DropdownItem>
  );
};

/**
 * Menu item to toggle auto-update.
 */
export const AutoUpdateMenuItem = () => {
  const id = useCardStore(state => state.id);
  const repoUrl = useCardStore(state => state.repoUrl);
  const title = useCardStore(state => state.title);

  const [customUpdate, setCustomUpdate] = useState<boolean>(false);

  const devName = useMemo(() => extractGitUrl(repoUrl).owner, [repoUrl]);
  const autoUpdate = useIsAutoUpdateCard(id);
  const updateAvailable = useUpdateAvailable(id);
  const webUi = useInstalledCard(id);
  const allMethods = useAllCardMethods();

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (getCardMethod(allMethods, id, 'manager')?.updater.updateType === 'stepper') {
      setCustomUpdate(true);
    }
  }, [id, allMethods]);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(
      `Card Menu Action: Clicked "auto-update" (to ${!autoUpdate ? 'enable' : 'disable'}) on "${title}"`,
    );
    if (autoUpdate) {
      storageUtilsIpc.send.removeAutoUpdateCard(id);
    } else {
      storageUtilsIpc.send.addAutoUpdateCard(id);
    }
  }, [autoUpdate, id, title]);

  useEffect(() => {
    if (autoUpdate && updateAvailable && webUi && webUi.dir) {
      dispatch(cardsActions.addUpdatingCard({devName, id, title}));
      gitIpc.pull(webUi.dir, id);
    }
  }, [dispatch, autoUpdate, updateAvailable, webUi, devName, id, title]);

  if (customUpdate) return null;

  return (
    <DropdownItem
      onClick={e => {
        e.stopPropagation();
        onPress();
      }}
      key="auto-update"
      textValue="Auto Update">
      <Checkbox variant="secondary" isSelected={autoUpdate}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Auto Update
        </Checkbox.Content>
      </Checkbox>
    </DropdownItem>
  );
};
