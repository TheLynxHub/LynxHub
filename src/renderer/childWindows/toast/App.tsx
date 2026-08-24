import {ToastWindowMessageType} from '@lynx_common/types';

import {ToastBody} from './ToastBody';
import {ToastFooter} from './ToastFooter';
import {ToastHeader} from './ToastHeader';
import {useToastMessage} from './useToastMessage';

/**
 * Returns the CSS classes for the toast border based on the type.
 * @param type The toast message type.
 * @returns The CSS class string.
 */
const getTypeStyles = (type: ToastWindowMessageType['type']) => {
  switch (type) {
    case 'success':
      return 'border-l-emerald-500';
    case 'warning':
      return 'border-l-amber-500';
    case 'error':
      return 'border-l-red-500';
    case 'info':
      return 'border-l-blue-500';
    default:
      return 'border-l-gray-500';
  }
};

/**
 * Main application component for the Toast Window.
 * Displays a toast notification with optional buttons.
 */
export default function ToastContent() {
  const {toastMessage, handlers} = useToastMessage();

  if (!toastMessage) return null;

  return (
    <div
      className={
        `${getTypeStyles(toastMessage.type)} size-full overflow-hidden scrollbar-hide draggable ` +
        'flex flex-col border border-border border-l-8 bg-surface text-foreground rounded-2xl ' +
        'transition-all duration-300 ease-out'
      }>
      <ToastHeader type={toastMessage.type} title={toastMessage.title} />

      <ToastBody message={toastMessage.message} />

      <ToastFooter
        buttons={toastMessage.buttons}
        onClose={handlers.handleClose}
        onExit={handlers.handleExitApp}
        onRestart={handlers.handleRestart}
        customButtons={toastMessage.customButtons}
        onCustomClick={handlers.handleCustomBtnClick}
      />
    </div>
  );
}
