import NavigateToPluginsButton from '@lynx/components/NavigateToPluginsButton';
import {ToolsCard} from '@lynx/components/ToolsCard';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useGetCardsByPath} from '@lynx/plugins/modules';
import {toolsCardRegistry} from '@lynx/plugins/modules/toolsRegistry';
import {AvailablePageIDs} from '@lynx_common/consts';
import {LayoutGroup, motion, Variants} from 'framer-motion';
import {isEmpty, isNil} from 'lodash-es';
import {FC, memo, useMemo, useSyncExternalStore} from 'react';

import EmptyStateCard from '../EmptyStateCard';
import RenderCardList from './RenderList';

type GetComponentsByPathProps = {
  /** The route path ID to fetch cards for. */
  routePath: AvailablePageIDs;
  /** Optional additional elements from extensions. */
  extensionsElements?: FC[];
};

const variants: Variants = {
  initial: {opacity: 0, translateY: 20},
  animate: (index: number) => ({
    opacity: 1,
    translateY: 0,
    transition: {delay: index * 0.05},
  }),
};

/**
 * Component that renders the grid of cards for a given route path.
 * It handles fetching cards, rendering empty states, and extension replacements.
 */
export const GetComponentsByPath = memo(({routePath, extensionsElements}: GetComponentsByPathProps) => {
  const cards = useGetCardsByPath(routePath);
  const tools = useSyncExternalStore(toolsCardRegistry.subscribe, toolsCardRegistry.getAll);

  const matchedTools = useMemo(() => {
    return tools.filter(t => t.where === routePath);
  }, [tools, routePath]);

  const ReplaceCards = useMemo(() => extensionsData.cards.replace, []);

  const renderEmptyState = () => (
    <div className="size-full flex items-center justify-center">
      <EmptyStateCard
        title="Oops! No cards to display right now"
        action={<NavigateToPluginsButton className="mt-2" />}
        description="Please install related modules to see cards"
      />
    </div>
  );

  const hasNoContent = isEmpty(cards) && isEmpty(extensionsElements) && isEmpty(matchedTools);

  return (
    <div className="flex size-full flex-row flex-wrap gap-7 overflow-visible">
      {hasNoContent ? (
        renderEmptyState()
      ) : (
        <>
          <LayoutGroup id={`${routePath}_cards`}>
            {isNil(ReplaceCards) ? (
              <>
                <RenderCardList cards={cards} />
                {matchedTools.map((item, index) => {
                  const CustomCard = item.component;
                  return (
                    <motion.div
                      key={item.id}
                      animate="animate"
                      initial="initial"
                      variants={variants}
                      custom={index + cards.length}
                      layout>
                      {CustomCard ? (
                        <CustomCard />
                      ) : (
                        <ToolsCard
                          id={item.id}
                          icon={item.icon}
                          title={item.title}
                          onPress={item.onPress}
                          description={item.description}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </>
            ) : (
              <ReplaceCards cards={cards} />
            )}
          </LayoutGroup>
          {extensionsElements?.map((Comp, index) => {
            const ElementComp = Comp as FC<{startIndex?: number}>;
            return (
              <div className="contents" key={`extension_card_${index}`}>
                <ElementComp key={index} startIndex={cards.length + matchedTools.length} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});
