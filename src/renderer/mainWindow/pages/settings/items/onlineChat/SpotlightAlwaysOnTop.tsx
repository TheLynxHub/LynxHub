import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function SpotlightAlwaysOnTop() {
  const spotlightAlwaysOnTop = useSettingsState('spotlightAlwaysOnTop');
  const dispatch = useDispatch<AppDispatch>();

  const onAlwaysOnTopChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {spotlightAlwaysOnTop: selected});
      dispatch(settingsActions.setSettingsState({key: 'spotlightAlwaysOnTop', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Always on Top';
  const descriptionText = 'Keep the Spotlight Chat window float above other windows when visible.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'spotlight', 'chat', 'always on top', 'top']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        enabled={spotlightAlwaysOnTop}
        onEnabledChange={onAlwaysOnTopChange}
      />
    </SettingsFilterItem>
  );
}
