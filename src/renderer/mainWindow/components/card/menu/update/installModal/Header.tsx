import {ModalHeader, ModalHeading} from '@heroui/react';
import {memo, useMemo} from 'react';

import StepProgress from './StepProgress';
import {useInstallStore} from './store';

/**
 * Renders the header of the installation modal, visualizing progress using `useInstallStore`.
 */
const InstallHeader = () => {
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
};

export default memo(InstallHeader);
