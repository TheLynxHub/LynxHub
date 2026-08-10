import {ToastWindowMessageType} from '@lynx_common/types';
import {CheckCircleIcon, DangerCircleIcon, InfoCircleIcon, ShieldCrossIcon} from '@solar-icons/react/bold-duotone';

type ToastHeaderProps = {
  /** The type of the toast message (success, warning, error, info). */
  type: ToastWindowMessageType['type'];
  /** The title of the toast message. */
  title: string;
};

/**
 * Returns the icon component corresponding to the toast type.
 * @param type The toast message type.
 * @returns The icon JSX element.
 */
const getIcon = (type: ToastHeaderProps['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="size-7 text-emerald-500" />;
    case 'warning':
      return <DangerCircleIcon className="size-7 text-amber-500" />;
    case 'error':
      return <ShieldCrossIcon className="size-7 text-red-500" />;
    case 'info':
      return <InfoCircleIcon className="size-7 text-blue-500" />;
    default:
      return <InfoCircleIcon className="size-7 text-foreground" />;
  }
};

/**
 * Component for the header section of the toast notification.
 * Displays the status icon, title, and current time.
 */
export function ToastHeader({type, title}: ToastHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-surface-secondary px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{getIcon(type)}</div>
        <h2 className="text-lg font-semibold text-surface-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted">{new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
}
