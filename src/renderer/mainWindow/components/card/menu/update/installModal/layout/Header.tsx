import {ModalHeader, ModalHeading, Skeleton} from '@heroui/react';
import {memo, useMemo} from 'react';

import StepProgress from '../components/StepProgress';
import {useInstallStore} from '../store';

/**
 * Renders the modal header displaying step-by-step progress visually.
 */
function InstallHeader() {
  const steps = useInstallStore(s => s.steps);
  const currentStep = useInstallStore(s => s.currentStep);
  const body = useInstallStore(s => s.body);
  const doneAll = useInstallStore(s => s.doneAll);

  const maxTitleWidth = useMemo(() => (steps.length > 5 ? 'max-w-16' : 'max-w-24'), [steps.length]);

  return (
    <ModalHeader>
      <ModalHeading>
        <div className="flex w-full justify-center">
          {steps.length === 0 ? (
            <div className="flex items-center justify-center py-1">
              <Skeleton className="h-6 w-48 rounded-lg" />
            </div>
          ) : (
            <StepProgress
              steps={steps}
              current={currentStep}
              className="max-w-full"
              doneType={doneAll.type}
              isDone={body === 'done'}
              orientation="horizontal"
              titleClassName={maxTitleWidth}
            />
          )}
        </div>
      </ModalHeading>
    </ModalHeader>
  );
}

export default memo(InstallHeader);
