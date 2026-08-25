import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {TerminalCursorStyle} from '@lynx_common/types/ipc';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that allows the user to select the appearance of the terminal cursor.
 * Updates the 'cursorStyle' state in REDUX.
 */
export default function CursorStyle() {
  const cursorStyle = useTerminalState('cursorStyle');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as TerminalCursorStyle;
      dispatch(terminalActions.setTerminalState({key: 'cursorStyle', value}));
    },
    [dispatch],
  );

  const labelText = 'Cursor Style';
  const descriptionText = 'Select the appearance of cursor.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'cursor',
        'style',
        'terminal',
        'cursor style',
        'caret',
        'bar',
        'block',
        'underline',
      ]}>
      <Select value={cursorStyle} onChange={onChange}>
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
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
