import {ModalHeader, ModalHeading} from '@heroui/react';
import {memo, useMemo} from 'react';

import StepProgress from '../components/StepProgress';
import {useInstallStore} from '../store';

/**
 * Renders the modal header displaying step-by-step progress visually.
 */
function InstallHeader() {
  const steps = useInstallStore(s => s.steps);
  const currentStep = useInstallStore(s => s.currentStep);

  const maxTitleWidth = useMemo(() => (steps.length > 5 ? 'max-w-16' : 'max-w-24'), [steps.length]);

  return (
    <ModalHeader>
      <ModalHeading>
        <div className="flex w-full justify-center">
          <StepProgress
            steps={steps}
            current={currentStep}
            className="max-w-full"
            orientation="horizontal"
            titleClassName={maxTitleWidth}
          />
        </div>
      </ModalHeading>
    </ModalHeader>
  );
}

export default memo(InstallHeader);
