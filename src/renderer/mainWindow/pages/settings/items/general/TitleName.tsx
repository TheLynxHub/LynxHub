import LynxSwitch from '@lynx/components/LynxSwitch';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Component to toggle dynamic application title and taskbar name.
 * When enabled, the app title updates based on the active AI task or tool.
 */
export default function TitleName() {
  const dispatch = useDispatch<AppDispatch>();
  const dynamicAppTitle = useSettingsState('dynamicAppTitle');

  const onAppTitleChange = useCallback(
    (selected: boolean) => {
      storageIpc.update('app', {dynamicAppTitle: selected});
      dispatch(settingsActions.setSettingsState({key: 'dynamicAppTitle', value: selected}));
    },
    [dispatch],
  );

  const titleText = 'Dynamic App Title';
  const descriptionText = "Automatically update the app's title and taskbar name based on the active AI or tool.";

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'title',
        'window title',
        'taskbar name',
        'active ai',
        'dynamic name',
        'dynamic app title',
        'process name',
      ]}>
      <LynxSwitch
        title={titleText}
        enabled={dynamicAppTitle}
        description={descriptionText}
        onEnabledChange={onAppTitleChange}
      />
    </SettingsFilterItem>
  );
}
