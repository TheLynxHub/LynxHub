import {extensionsData} from '@lynx/plugins/extensions/loader';
import {LoadedCardData} from '@lynx_common/types/plugins/modules';
import {validateGitRepoUrl} from '@lynx_common/utils';
import {memo, useEffect, useMemo} from 'react';

import LynxCard from './Card';
import {CardStoreContext, createCardStore, useCardStore} from './store';
import {useCardOverlayState} from './useCardOverlayState';

type WrapperProps = {
  /** The data for the card. */
  cardData: LoadedCardData;
  /** Whether the card is installed. */
  isInstalled: boolean;
  /** Whether the card has arguments. */
  hasArguments: boolean;
};

/**
 * Wrapper component that provides the CardStore context to its children.
 * It also handles the logic for replacing the card component via extensions.
 */
const Wrapper = memo(({cardData, isInstalled, hasArguments}: WrapperProps) => {
  const ReplaceComponent = useMemo(() => extensionsData.cards.replaceComponent, []);

  const storeValue = useMemo(() => createCardStore({...cardData, isInstalled, hasArguments}), [cardData.id]);

  useEffect(() => {
    storeValue.setState({
      ...cardData,
      installed: isInstalled,
      haveArguments: hasArguments,
      repoUrl: cardData.repoUrl ? validateGitRepoUrl(cardData.repoUrl) : '',
    });
  }, [storeValue, cardData, isInstalled, hasArguments]);

  return (
    <CardStoreContext.Provider value={storeValue}>
      {ReplaceComponent ? (
        <ReplaceComponent
          useCardStore={useCardStore}
          key={`${cardData.id}-card-key`}
          useCardOverlayState={useCardOverlayState}
        />
      ) : (
        <LynxCard key={`${cardData.id}-card-key`} />
      )}
    </CardStoreContext.Provider>
  );
});

export default Wrapper;
