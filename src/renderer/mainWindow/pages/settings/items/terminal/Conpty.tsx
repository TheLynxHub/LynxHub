import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {TerminalUseConpty} from '@lynx_common/types/ipc';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that allows the user to select whether to use ConPTY on Windows
 * for terminal sessions (Auto, Yes, or No). Updates the 'useConpty' state in REDUX.
 */
export default function Conpty() {
  const useConpty = useTerminalState('useConpty');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as TerminalUseConpty;
      dispatch(terminalActions.setTerminalState({key: 'useConpty', value}));
    },
    [dispatch],
  );

  const labelText = 'Use Conpty (Windows)';
  const descriptionText = 'Use the ConPTY system on Windows.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'terminal',
        'conpty',
        'windows',
        'pty',
        'pseudo console',
        'winpty',
        'use conpty',
      ]}>
      <Select value={useConpty} onChange={onChange}>
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
            <ListBox.Item id="auto" textValue="Auto">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Auto</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="yes" textValue="Yes">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Yes</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="no" textValue="No">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>No</Label>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
