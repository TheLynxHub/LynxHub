import {Description, Label, NumberField} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that configures the latency/delay used during terminal viewport resizing.
 * Updates the 'resizeDelay' state in REDUX.
 */
export default function ResizeDelay() {
  const resizeDelay = useTerminalState('resizeDelay');
  const dispatch = useDispatch<AppDispatch>();

  const onChange = (value: number) => {
    dispatch(terminalActions.setTerminalState({key: 'resizeDelay', value}));
  };

  const labelText = 'Resize Delay (ms)';
  const descriptionText =
    'Debounce delay in milliseconds before the terminal viewport adapts to a window resize. ' +
    'Low values feel snappier, while high values prevent performance lag during dragging.';

  return (
    <SettingsFilterItem searchTexts={[labelText, descriptionText, 'terminal', 'resize delay', 'resize', 'latency']}>
      <NumberField
        step={1}
        minValue={1}
        maxValue={5000}
        value={resizeDelay}
        onChange={onChange}
        aria-label="Terminal resize delay">
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
