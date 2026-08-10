import {Label, NumberField} from '@heroui/react';
import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {AppDispatch} from '@lynx/redux/store';
import storageIpc from '@lynx_shared/ipc/storage';
import {StopwatchIcon} from '@solar-icons/react/bold-duotone';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Allows the user to configure the frequency (in minutes) at which
 * the application checks for updates to their dashboard cards.
 */
export default function UpdateInterval() {
  const updateInterval = useCardsState('checkUpdateInterval');
  const dispatch = useDispatch<AppDispatch>();

  const handleIntervalChange = (value: number) => {
    if (value) {
      dispatch(cardsActions.setUpdateInterval(value));
      storageIpc.update('cards', {checkUpdateInterval: value});
    }
  };

  return (
    <SettingsFilterItem
      searchTexts={['Update check frequency:', 'update interval', 'card update', 'check for updates', 'minutes']}>
      <NumberField
        minValue={2}
        value={updateInterval}
        onChange={handleIntervalChange}
        aria-label="Card Update Interval">
        <Label>
          <div className="flex flex-row gap-x-1 items-center justify-start">
            <StopwatchIcon />
            <SettingsSearchHighlight text="Update Check Frequency (Minutes)" />
          </div>
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
