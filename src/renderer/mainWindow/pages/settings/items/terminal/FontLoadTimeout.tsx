import {Description, Label, NumberField} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that configures the timeout (in milliseconds) to wait for the custom terminal font to load.
 * Updates the 'fontLoadTimeout' state in REDUX.
 */
export default function FontLoadTimeout() {
  const fontLoadTimeout = useTerminalState('fontLoadTimeout');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = (value: number) => {
    dispatch(terminalActions.setTerminalState({key: 'fontLoadTimeout', value}));
  };

  const labelText = 'Font Load Timeout (ms)';
  const descriptionText =
    'Timeout in milliseconds to wait for the custom terminal font to load. ' +
    'If you see warnings that the terminal font failed to load on startup, ' +
    'increase this value to allow slow-loading systems more time.';

  return (
    <SettingsFilterItem searchTexts={[labelText, descriptionText, 'terminal', 'font', 'load', 'timeout', 'observer']}>
      <NumberField
        step={100}
        minValue={0}
        maxValue={30000}
        onChange={onChange}
        value={fontLoadTimeout}
        aria-label="Terminal font load timeout">
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
