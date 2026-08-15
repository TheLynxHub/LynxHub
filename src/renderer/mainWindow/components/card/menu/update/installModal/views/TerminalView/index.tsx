import {memo, RefObject} from 'react';

import XTermCore, {XTermAPI} from '../../../../../../XTermCore';
import {useCardStore} from '../../../../../store';
import StepAlerts from '../../components/StepAlerts';
import {useInstallStore} from '../../store';

export interface TerminalViewProps {
  xtermRef: RefObject<XTermAPI | null>;
}

/**
 * Renders the integrated XTerm.js terminal inside the modal for running scripts or commands during installation.
 */
function TerminalView({xtermRef}: TerminalViewProps) {
  const cardId = useCardStore(st => st.id);
  const terminalKey = useInstallStore(s => s.terminalKey);
  const currentStep = useInstallStore(s => s.steps[s.currentStep]);

  const onReady = (api: XTermAPI) => {
    xtermRef.current = api;
  };

  return (
    <div className="flex size-full flex-1 min-h-0 flex-col gap-y-2">
      <XTermCore
        id={cardId}
        key={terminalKey}
        onReady={onReady}
        minResizeCols={0}
        minResizeRows={0}
        className="my-2 flex-1 min-h-0 overflow-hidden"
      />
      <StepAlerts currentStep={currentStep} />
    </div>
  );
}

export default memo(TerminalView);
