import {Label, ProgressBar, Skeleton} from '@heroui/react';
import {isNil} from 'lodash-es';
import {memo} from 'react';

import DescriptionGrid, {DescriptionGridItem} from '../../../../../DescriptionGrid';
import StepAlerts from '../components/StepAlerts';
import {useInstallStore} from '../store';

/**
 * Renders custom indeterminate or determinate progress bars triggered dynamically by module installation steps.
 */
function ProgressBarView() {
  const progressBarState = useInstallStore(s => s.progressBarState);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  const hasPercentage = typeof progressBarState.percentage === 'number' && !isNaN(progressBarState.percentage);
  const isIndeterminate = progressBarState.isIndeterminate || !hasPercentage;

  const progressBarItems: DescriptionGridItem[] = (progressBarState.description ?? []).map((desc, index) => {
    const isValueEmpty =
      isNil(desc.value) ||
      desc.value === '' ||
      desc.value.toLowerCase() === 'unknown' ||
      desc.value.toLowerCase() === 'calculating...';

    return {
      key: `${desc.label}_${index}`,
      label: desc.label,
      content: isValueEmpty ? <Skeleton className="h-5 w-20 rounded-lg" /> : desc.value,
    };
  });

  return (
    <div className="mb-8 mt-4 flex flex-col text-center">
      {progressBarState.title && <span className="text-large font-semibold">{progressBarState.title}</span>}
      <ProgressBar
        size="lg"
        isIndeterminate={isIndeterminate}
        value={hasPercentage ? progressBarState.percentage : undefined}>
        <Label>
          {hasPercentage
            ? `${Math.round(progressBarState.percentage!)}%`
            : progressBarState.title
              ? undefined
              : 'Processing...'}
        </Label>
        <ProgressBar.Output />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      {progressBarItems.length > 0 && (
        <DescriptionGrid
          columns={2}
          items={progressBarItems}
          itemClassName="bg-surface"
          className="mt-8 bg-surface-secondary text-start"
        />
      )}

      <StepAlerts currentStep={currentStep} />
    </div>
  );
}

export default memo(ProgressBarView);
