import {RunningCard} from '@lynx/types';
import {memo, useMemo} from 'react';

import BrowserDownloadManager from '../browser/BrowserDownloadManager';
import TerminateProcessButton from './TerminateProcessButton';
import ViewSwitch from './ViewSwitch';

type Props = {
  /**
   * The running card data.
   */
  runningCard: RunningCard;
};

/**
 * Shared top bar components for both browser and terminal views.
 */
const SharedTopBar = memo(({runningCard}: Props) => {
  const {type, currentView, id} = runningCard;

  const showSwitch = useMemo(() => type === 'both', [type]);
  const showTerminate = useMemo(() => type === 'both' || type === 'terminal', [type]);

  return (
    <div className="flex flex-row gap-x-1">
      {showSwitch && <ViewSwitch currentView={currentView} />}
      {showTerminate && <TerminateProcessButton id={id} />}
      <BrowserDownloadManager />
    </div>
  );
});

SharedTopBar.displayName = 'SharedTopBar';

export default SharedTopBar;
