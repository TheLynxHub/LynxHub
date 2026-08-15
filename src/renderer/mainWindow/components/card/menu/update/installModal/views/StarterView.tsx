import {capitalize} from 'lodash-es';
import {memo} from 'react';

import {useCardStore} from '../../../../store';
import StepAlerts from '../components/StepAlerts';
import {useInstallStore} from '../store';

/**
 * Renders the introductory starter step explaining the card installation and offering action paths.
 */
function StarterView() {
  const title = useCardStore(st => st.title);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  return (
    <div className="my-6 space-y-6 text-center">
      <p className="text-xl font-semibold">
        {"You're"} about to install <span className="font-bold">{capitalize(title)}</span>
      </p>
      <StepAlerts currentStep={currentStep} />
      <p>Choose an option below to proceed with the installation or locate a pre-existing installation.</p>
    </div>
  );
}

export default memo(StarterView);
