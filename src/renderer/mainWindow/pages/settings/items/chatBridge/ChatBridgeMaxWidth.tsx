import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type MaxWidthOption = 'default' | 'wide' | 'full' | 'small';

export default function ChatBridgeMaxWidth() {
  const chatBridgeMaxWidth = useSettingsState('chatBridgeMaxWidth') || 'default';
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;
      const value = key as MaxWidthOption;
      storageIpc.update('app', {chatBridgeMaxWidth: value});
      dispatch(settingsActions.setSettingsState({key: 'chatBridgeMaxWidth', value}));
    },
    [dispatch],
  );

  const titleText = 'Chat Maximum Width';
  const descriptionText = 'Select how wide chat bridge messages and input controls can expand.';

  return (
    <SettingsFilterItem searchTexts={[titleText, descriptionText, 'chat', 'width', 'max', 'size', 'bridge']}>
      <Select onChange={onChange} value={chatBridgeMaxWidth}>
        <Label>
          <SettingsSearchHighlight text={titleText} />
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Description>{descriptionText}</Description>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="small" textValue="Small (Compact)">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Small (Compact)</Label>
                <Description>Narrow centered column for focused reading</Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="default" textValue="Default (Medium)">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Default (Medium)</Label>
                <Description>Standard comfortable width</Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="wide" textValue="Wide">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Wide</Label>
                <Description>Expanded view for wider screens</Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="full" textValue="Full Width">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Full Width</Label>
                <Description>Stretches messages and input to the full container edge</Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
