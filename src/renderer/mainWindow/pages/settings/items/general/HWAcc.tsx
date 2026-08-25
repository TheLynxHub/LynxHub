import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle hardware acceleration.
 * Synchronizes state with Redux and persists to storage via IPC.
 */
export default function HWAcc() {
  const dispatch = useDispatch<AppDispatch>();
  const hardwareAcceleration = useSettingsState('hardwareAcceleration');

  const onEnabledChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {hardwareAcceleration: selected});
      dispatch(settingsActions.setSettingsState({key: 'hardwareAcceleration', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Use Hardware Acceleration';
  const descriptionText =
    'Enables hardware acceleration to potentially improve performance.' +
    ' If you experience lagging or freezing, try disabling this option.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'hardware acceleration',
        'gpu',
        'performance',
        'lag',
        'freeze',
        'hardware',
        'graphics acceleration',
      ]}>
      <LynxSwitch
        description={
          <>
            Enables hardware acceleration to potentially improve performance.
            <br />
            If you experience lagging or freezing, try disabling this option.
          </>
        }
        title={titleText}
        enabled={hardwareAcceleration}
        onEnabledChange={onEnabledChange}
      />
    </SettingsFilterItem>
  );
}
