import {Label, ProgressBar} from '@heroui/react';
import {formatSize} from '@lynx_common/utils';
import {ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {capitalize} from 'lodash-es';
import {memo} from 'react';

import DescriptionGrid, {DescriptionGridItem} from '../../../../../DescriptionGrid';
import EmptyStateCard from '../../../../../EmptyStateCard';
import StepAlerts from '../components/StepAlerts';
import {useInstallStore} from '../store';

/**
 * Renders single file download progress with file metrics and error fallback.
 */
function DownloadProgressView() {
  const progressInfo = useInstallStore(s => s.progressInfo);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  const downloadItems: DescriptionGridItem[] = [
    {
      key: 'fileName',
      label: 'File Name',
      content: progressInfo?.fileName ? capitalize(progressInfo.fileName) : 'Unknown',
    },
    {
      key: 'downloaded',
      label: 'Downloaded So Far',
      content: progressInfo?.downloaded ? formatSize(progressInfo.downloaded) : 'Calculating...',
    },
    {
      key: 'total',
      label: 'Total File Size',
      content: progressInfo?.total ? formatSize(progressInfo.total) : 'Calculating...',
    },
  ];

  if (progressInfo?.stage === 'failed') {
    return (
      <EmptyStateCard
        className="my-6"
        title="Download Failed"
        icon={<ShieldCrossIcon className="size-12 text-danger" />}
        description="Please check your internet connection and try again."
      />
    );
  }

  return (
    <div className="my-6">
      <ProgressBar size="lg" value={(progressInfo?.percentage || 0) * 100}>
        <Label>
          {progressInfo?.percentage !== undefined ? `${Math.round(progressInfo.percentage * 100)}%` : undefined}
        </Label>
        <ProgressBar.Output />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      <DescriptionGrid
        columns={2}
        items={downloadItems}
        itemClassName="bg-surface"
        className="mt-6 bg-surface-secondary"
      />
      <StepAlerts currentStep={currentStep} />
    </div>
  );
}

export default memo(DownloadProgressView);
