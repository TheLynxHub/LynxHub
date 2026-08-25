import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {TerminalCursorInactiveStyle} from '@lynx_common/types/ipc';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that allows the user to select the appearance of the terminal cursor when inactive.
 * Updates the 'cursorInactiveStyle' state in REDUX.
 */
export default function CursorInactiveStyle() {
  const cursorInactiveStyle = useTerminalState('cursorInactiveStyle');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as TerminalCursorInactiveStyle;
      dispatch(terminalActions.setTerminalState({key: 'cursorInactiveStyle', value}));
    },
    [dispatch],
  );
  const labelText = 'Cursor Inactive Style';
  const descriptionText = 'Select the appearance of cursor when inactive.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'cursor',
        'inactive',
        'terminal',
        'cursor inactive style',
        'unfocused cursor',
        'outline',
        'bar',
        'block',
        'underline',
        'none',
      ]}>
      <Select onChange={onChange} value={cursorInactiveStyle}>
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
            <ListBox.Item id="bar" textValue="Bar">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Bar</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="block" textValue="Block">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Block</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="underline" textValue="Underline">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Underline</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="outline" textValue="Outline">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Outline</Label>
              </div>
            </ListBox.Item>
            <ListBox.Item id="none" textValue="None">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>None</Label>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
