import {useCardsState} from '@lynx/redux/reducers/cards';
import {RunningCard} from '@lynx/types';
import {memo, useMemo} from 'react';

import BrowserActionButtons from './BrowserActionButtons';
import BrowserAddressBar from './BrowserAddressBar';
import BrowserSearch from './BrowserSearch';
import BrowserVolume from './BrowserVolume';
import BrowserZoom from './BrowserZoom';

type Props = {
  /**
   * The running card data.
   */
  runningCard: RunningCard;
  /**
   * Optional callback to set custom address.
   */
  setCustomAddress?: (address: string) => void;
  /**
   * The ID of the tab.
   */
  tabID: string;
};

/**
 * Top bar for the browser view, containing navigation, address bar, and tools.
 */
const BrowserTopBar = memo(({runningCard, setCustomAddress, tabID}: Props) => {
  const domReadyIds = useCardsState('browserDomReadyIds');

  const isDomReady = useMemo(() => domReadyIds.includes(runningCard.id), [domReadyIds, runningCard]);

  return (
    <>
      <BrowserActionButtons
        tabID={tabID}
        id={runningCard.id}
        isDomReady={isDomReady}
        webuiAddress={runningCard.webUIAddress}
      />
      <BrowserAddressBar runningCard={runningCard} setCustomAddress={setCustomAddress} />

      {isDomReady && (
        <>
          <BrowserSearch id={runningCard.id} tabID={runningCard.tabId} />
          <BrowserZoom id={runningCard.id} />
          <BrowserVolume id={runningCard.id} tabId={runningCard.tabId} />
        </>
      )}
    </>
  );
});

BrowserTopBar.displayName = 'BrowserTopBar';

export default BrowserTopBar;
