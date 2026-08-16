import {Chip} from '@heroui/react';
import {SiGit} from '@icons-pack/react-simple-icons';
import {isWin} from '@lynx_common/utils';
import {BoltIcon, ServerSquareIcon, Widget5Icon} from '@solar-icons/react/bold-duotone';
import {useEffect} from 'react';

import CheckRow from './CheckRow';
import RequirementAlert from './RequirementAlert';
import {RequirementStatus} from './types';
import useRequirementChecks from './useRequirementChecks';

type Props = {
  onStatusChange: (isSatisfied: boolean) => void;
  onReport: (report: RequirementStatus) => void;
};

const containerClass =
  'bg-surface/60 rounded-3xl border border-surface-secondary p-5 ' + 'h-full flex flex-col backdrop-blur-sm';

export default function RequirementsChecker({onStatusChange, onReport}: Props) {
  const {statuses, isSuccess, failureType, skipAppModule, checkAll} = useRequirementChecks();

  useEffect(() => {
    checkAll();
  }, [checkAll]);

  useEffect(() => {
    onStatusChange(isSuccess);
    if (isSuccess) {
      onReport({
        git: statuses.git.label || 'Ready',
        pwsh: isWin ? statuses.pwsh.label || 'Ready' : 'N/A',
        appModule: statuses.appModule.result === 'ok' ? 'Installed' : 'Skipped',
      });
    }
  }, [isSuccess, onStatusChange, onReport, statuses]);

  const chipColor = isSuccess ? 'success' : failureType ? 'danger' : 'default';
  const chipLabel = isSuccess ? 'All Satisfied' : failureType ? 'Attention Needed' : 'Checking...';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-secondary">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <ServerSquareIcon className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Core Requirements</h2>
            <p className="text-[11px] text-muted">Essential runtime tools & environments</p>
          </div>
        </div>

        <Chip variant="soft" color={chipColor} className="text-xs font-semibold">
          {chipLabel}
        </Chip>
      </div>

      {/* Rows */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
        <CheckRow
          status={statuses.git}
          label="Git Version Control"
          description="Required for extensions & modules"
          icon={<SiGit className="size-4 text-orange-600" />}
        />

        {isWin && (
          <CheckRow
            label="PowerShell 7+"
            status={statuses.pwsh}
            description="Required for Windows terminal scripts"
            icon={<BoltIcon className="size-4 text-blue-500" />}
          />
        )}

        <CheckRow
          label="Main AI Module"
          status={statuses.appModule}
          description="Local AI & execution runtime"
          icon={<Widget5Icon className="size-4 text-purple-500" />}
        />
      </div>

      {/* Alert banner if anything is missing */}
      {failureType && (
        <div className="mt-3 pt-3 border-t border-surface-secondary">
          <RequirementAlert failureType={failureType} skipAppModule={skipAppModule} />
        </div>
      )}
    </div>
  );
}
