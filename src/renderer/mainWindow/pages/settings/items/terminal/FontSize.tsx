import {Label, NumberField} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that allows the user to adjust the font size of the terminal.
 * Updates the 'fontSize' state in REDUX.
 */
export default function FontSize() {
  const fontSize = useTerminalState('fontSize');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = (value: number) => {
    dispatch(terminalActions.setTerminalState({key: 'fontSize', value}));
  };

  const labelText = 'Font Size';

  return (
    <SettingsFilterItem
      searchTexts={[labelText, 'terminal', 'font size', 'text size', 'font scale', 'character size', 'zoom text']}>
      <NumberField
        step={1}
        minValue={2}
        maxValue={100}
        value={fontSize}
        onChange={onChange}
        aria-label="Terminal font size">
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </SettingsFilterItem>
  );
}
