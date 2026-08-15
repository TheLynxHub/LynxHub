import {useMemo} from 'react';

import {bottomToast, topToast} from '../../../../../layouts/ToastProviders';
import InstallStepper from './Stepper';

export interface UseStepperProps {
  /** The unique identifier of the card being installed. */
  cardId: string;
}

/**
 * Initializes and returns a stable `InstallStepper` instance connected to `useInstallStore`.
 *
 * @param {UseStepperProps} props - Dependencies used by the stepper.
 * @returns {InstallStepper} The configured stepper instance to pass to the module API.
 */
export function useStepper({cardId}: UseStepperProps): InstallStepper {
  return useMemo(() => {
    return new InstallStepper({
      cardId,
      topToast,
      bottomToast,
    });
  }, [cardId]);
}

export default useStepper;
