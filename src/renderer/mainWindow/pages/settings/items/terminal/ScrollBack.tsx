import {Description, Label, NumberField} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that controls the amount of scrollback buffer history retained in the terminal.
 * Updates the 'scrollBack' state in REDUX.
 */
export default function ScrollBack() {
  const scrollBack = useTerminalState('scrollBack');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = (value: number) => {
    dispatch(terminalActions.setTerminalState({key: 'scrollBack', value}));
  };

  const labelText = 'Scrollback (lines)';
  const descriptionText =
    'The maximum number of lines kept in the terminal buffer to scroll back through. ' +
    'Larger values keep more history but consume more memory.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'terminal',
        'scrollback',
        'buffer',
        'history',
        'scroll lines',
        'scrollback lines',
        'terminal buffer size',
      ]}>
      <NumberField
        step={100}
        minValue={100}
        maxValue={999999}
        value={scrollBack}
        onChange={onChange}
        aria-label="Terminal scrollback">
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input />
          <NumberField.IncrementButton />
        </NumberField.Group>
        <Description>
          <SettingsSearchHighlight text={descriptionText} />
        </Description>
      </NumberField>
    </SettingsFilterItem>
  );
}
