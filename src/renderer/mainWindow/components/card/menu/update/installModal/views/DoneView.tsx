import {CheckCircleIcon, SadCircleIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import EmptyStateCard from '../../../../../EmptyStateCard';
import StepAlerts from '../components/StepAlerts';
import {useInstallStore} from '../store';

/**
 * Renders the final step view showing whether installation/update completed successfully or failed.
 */
function DoneView() {
  const doneAll = useInstallStore(s => s.doneAll);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  return (
    <div className="flex size-full flex-col gap-y-2">
      <EmptyStateCard
        icon={
          doneAll.type === 'success' ? (
            <CheckCircleIcon className="size-14 shrink-0 text-success" />
          ) : (
            <SadCircleIcon className="size-14 shrink-0 text-danger" />
          )
        }
        className="my-6"
        title={doneAll.title}
        description={doneAll.description}
      />
      <StepAlerts currentStep={currentStep} />
    </div>
  );
}

export default memo(DoneView);
