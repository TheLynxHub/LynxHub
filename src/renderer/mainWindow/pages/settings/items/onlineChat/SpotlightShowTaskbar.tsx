import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

export default function SpotlightShowTaskbar() {
  const spotlightShowTaskbar = useSettingsState('spotlightShowTaskbar');
  const dispatch = useDispatch<AppDispatch>();

  const onShowTaskbarChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {spotlightShowTaskbar: selected});
      dispatch(settingsActions.setSettingsState({key: 'spotlightShowTaskbar', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Show Spotlight in Taskbar';
  const descriptionText = 'Show the Spotlight Chat window in the system taskbar when visible.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'spotlight', 'chat', 'taskbar', 'show']}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        enabled={spotlightShowTaskbar}
        onEnabledChange={onShowTaskbarChange}
      />
    </SettingsFilterItem>
  );
}
