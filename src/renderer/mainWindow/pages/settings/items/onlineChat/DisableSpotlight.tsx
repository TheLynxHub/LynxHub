import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function DisableSpotlight() {
  const disableSpotlight = useSettingsState('disableSpotlight');
  const dispatch = useDispatch<AppDispatch>();

  const onDisableChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {disableSpotlight: selected});
      dispatch(settingsActions.setSettingsState({key: 'disableSpotlight', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Disable Spotlight completely';
  const descriptionText =
    'Disable the global system hotkey, loading of window, and all related Spotlight Chat functionality.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'spotlight', 'chat', 'disable', 'off']}>
      <LynxSwitch
        title={titleText}
        enabled={disableSpotlight}
        description={descriptionText}
        onEnabledChange={onDisableChange}
      />
    </SettingsFilterItem>
  );
}
