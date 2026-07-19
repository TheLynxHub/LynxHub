import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type DefaultViewOption = 'webview' | 'custom';

export default function BridgeDefaultView() {
  const bridgeDefaultView = useSettingsState('bridgeDefaultView') || 'custom';
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;
      const value = key as DefaultViewOption;
      storageIpc.update('app', {bridgeDefaultView: value});
      dispatch(settingsActions.setSettingsState({key: 'bridgeDefaultView', value}));
    },
    [dispatch],
  );

  const titleText = 'Chat Bridge Default View';

  return (
    <SettingsFilterItem searchTexts={[titleText, 'chat', 'view', 'bridge', 'default', 'webview', 'custom']}>
      <Select onChange={onChange} value={bridgeDefaultView}>
        <Label>
          <SettingsSearchHighlight text={titleText} />
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="custom" textValue="Custom Interface">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Custom Interface</Label>
                <Description>Show our native, premium chat interface</Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="webview" textValue="Direct Webview">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Direct Webview</Label>
                <Description>Show the raw service webpage directly</Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
