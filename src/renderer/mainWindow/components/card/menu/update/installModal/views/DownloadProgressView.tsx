import {Label, ProgressBar, Skeleton} from '@heroui/react';
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

  const hasPercentage = typeof progressInfo?.percentage === 'number' && !isNaN(progressInfo.percentage);

  const downloadItems: DescriptionGridItem[] = [
    {
      key: 'fileName',
      label: 'File Name',
      content: progressInfo?.fileName ? (
        capitalize(progressInfo.fileName)
      ) : (
        <Skeleton className="h-5 w-28 rounded-lg" />
      ),
    },
    {
      key: 'downloaded',
      label: 'Downloaded So Far',
      content:
        progressInfo?.downloaded !== undefined ? (
          formatSize(progressInfo.downloaded)
        ) : (
          <Skeleton className="h-5 w-20 rounded-lg" />
        ),
    },
    {
      key: 'total',
      label: 'Total File Size',
      content:
        progressInfo?.total !== undefined && progressInfo.total > 0 ? (
          formatSize(progressInfo.total)
        ) : (
          <Skeleton className="h-5 w-20 rounded-lg" />
        ),
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
      <ProgressBar
        size="lg"
        isIndeterminate={!hasPercentage}
        value={hasPercentage ? (progressInfo?.percentage || 0) * 100 : undefined}>
        <Label>{hasPercentage ? `${Math.round((progressInfo?.percentage || 0) * 100)}%` : 'Downloading file...'}</Label>
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
