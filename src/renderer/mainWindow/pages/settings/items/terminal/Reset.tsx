import {Button, Spinner} from '@heroui/react';
import {terminalActions} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {RefreshIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component providing a button to reset all terminal configuration settings back to their defaults.
 */
export default function Reset() {
  const [isSaving, setIsSaving] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  const onApply = useCallback(() => {
    const fakeDelay = 300;
    setIsSaving(true);

    dispatch(terminalActions.resetToDefaults());
    setTimeout(() => {
      setIsSaving(false);
    }, fakeDelay);
  }, [dispatch]);

  return (
    <SettingsFilterItem
      searchTexts={[
        'Reset all terminal settings',
        'reset terminal',
        'defaults',
        'terminal settings',
        'reset quick commands',
      ]}>
      <Button className="mt-2" variant="danger" onPress={onApply} isPending={isSaving} fullWidth>
        {isSaving ? <Spinner size="sm" color="current" /> : <RefreshIcon />}
        Reset All Terminal Settings
      </Button>
    </SettingsFilterItem>
  );
}
