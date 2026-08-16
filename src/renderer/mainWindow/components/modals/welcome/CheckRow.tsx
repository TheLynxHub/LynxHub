import {Chip, Spinner} from '@heroui/react';
import {CheckCircleIcon, CloseCircleIcon, InfoCircleIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {useMemo} from 'react';

import {CheckResult, RowData} from './types';

function getStatusProps(status: CheckResult): {
  color: 'success' | 'danger' | 'default' | 'warning';
  label: string;
} {
  switch (status) {
    case 'ok':
      return {color: 'success', label: 'Ready'};
    case 'failed':
      return {color: 'danger', label: 'Missing'};
    case 'checking':
      return {color: 'default', label: 'Checking...'};
    case 'installing':
      return {color: 'warning', label: 'Installing...'};
    case 'skipped':
      return {color: 'default', label: 'Skipped'};
    default:
      return {color: 'default', label: 'Pending'};
  }
}

type Props = {
  label: string;
  description?: string;
  status: RowData;
  icon?: React.ReactNode;
};

const rowBaseClass =
  'flex items-center justify-between p-3.5 bg-surface/80 rounded-2xl border ' +
  'border-surface-secondary backdrop-blur-sm transition-all hover:bg-surface hover:border-surface-secondary/80';

export default function CheckRow({label, description, status, icon}: Props) {
  const {color, label: statusLabelText} = useMemo(() => getStatusProps(status.result), [status.result]);
  const isBusy = status.result === 'checking' || status.result === 'installing';
  const labelText = status.result === 'ok' && status.label ? status.label : statusLabelText;

  const iconBg =
    status.result === 'ok'
      ? 'bg-success/10 text-success'
      : status.result === 'failed'
        ? 'bg-danger/10 text-danger'
        : 'bg-foreground/5 text-muted';

  return (
    <motion.div className={rowBaseClass} layout>
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {icon && <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>}
        <div className="min-w-0">
          <div className="font-semibold text-xs md:text-sm text-foreground">{label}</div>
          {description && <div className="text-[11px] text-muted leading-tight mt-0.5">{description}</div>}
        </div>
      </div>

      <div className="shrink-0">
        <Chip
          color={color}
          className="font-mono text-[11px] gap-1 px-2.5 py-1"
          variant={status.result === 'ok' || status.result === 'failed' ? 'soft' : 'secondary'}>
          {isBusy && <Spinner size="sm" color="current" />}
          {status.result === 'ok' && <CheckCircleIcon className="size-3.5 shrink-0" />}
          {status.result === 'failed' && <CloseCircleIcon className="size-3.5 shrink-0" />}
          {status.result === 'skipped' && <InfoCircleIcon className="size-3.5 shrink-0" />}
          <span className="truncate max-w-[130px]">{labelText}</span>
        </Chip>
      </div>
    </motion.div>
  );
}
