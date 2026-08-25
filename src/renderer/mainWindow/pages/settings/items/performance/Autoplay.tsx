import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type AutoplayPolicy =
  'default' | 'no-user-gesture-required' | 'user-gesture-required' | 'document-user-activation-required';

/**
 * Component to configure the media autoplay policy.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function Autoplay() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedKey, setSelectedKey] = useState('default');

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setSelectedKey(data.autoplayPolicy);
    });
  }, []);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as AutoplayPolicy;
      storageIpc.update('performance', {autoplayPolicy: value});
      setSelectedKey(value);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const labelText = 'Media Autoplay Policy';
  const descriptionText = 'Controls autoplay behavior for audio and video elements in web pages.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'autoplay',
        'media',
        'video',
        'audio',
        'sound',
        'media autoplay policy',
        'gesture',
        'playback',
      ]}>
      <Select value={selectedKey} onChange={onChange}>
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Description>
          <SettingsSearchHighlight text={descriptionText} />
        </Description>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="default" textValue="Default">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Default</Label>
                <Description>
                  <SettingsSearchHighlight text="Use browser default autoplay behavior." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item textValue="Allow Autoplay" id="no-user-gesture-required">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Allow Autoplay</Label>
                <Description>
                  <SettingsSearchHighlight text="Allow autoplay without user interaction." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="user-gesture-required" textValue="Require Gesture">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Require Gesture</Label>
                <Description>
                  <SettingsSearchHighlight text="Require user gesture before playing audio or video." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="document-user-activation-required" textValue="Require user click before playback.">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Require Page Activation</Label>
                <Description>
                  <SettingsSearchHighlight text="Require page interaction before playback." />
                </Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
