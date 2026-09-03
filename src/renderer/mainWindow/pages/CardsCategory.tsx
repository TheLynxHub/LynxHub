import {ScrollShadow} from '@heroui/react';
import RenderCardList from '@lynx/components/card/RenderList';
import Wrapper from '@lynx/components/card/Wrapper';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import NavigateToPluginsButton from '@lynx/components/NavigateToPluginsButton';
import {ToolsCard} from '@lynx/components/ToolsCard';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useAllCardDataWithPath, useHasArguments, useSearchCards} from '@lynx/plugins/modules';
import {toolsCardRegistry} from '@lynx/plugins/modules/toolsRegistry';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {Apps_Color_Icon, History_Color_Icon, Pin_Color_Icon} from '@lynx_assets/icons/Icons_Colorful';
import {InboxIcon, PinCircleIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, LayoutGroup, motion, Variants} from 'framer-motion';
import Fuse from 'fuse.js';
import {isEmpty, isNil} from 'lodash-es';
import {FC, memo, ReactNode, useId, useMemo, useSyncExternalStore} from 'react';

import {CardContainerClasses} from './CardsContainer';
import HomeCategory from './home/Category';

// ─── Private helpers ─────────────────────────────────────────────────────────

const variants: Variants = {
  initial: {opacity: 0, translateY: 20},
  animate: (index: number) => ({
    opacity: 1,
    translateY: 0,
    transition: {delay: index * 0.05},
  }),
};

type CardsByIdsProps = {
  cardIds: string[];
  cat: string;
  children?: ReactNode | ((startIndex: number) => ReactNode);
};

/** Renders a filtered card list by an array of IDs. */
const CardsByIds = ({cardIds, cat, children}: CardsByIdsProps) => {
  const allCards = useAllCardDataWithPath();
  const tools = useSyncExternalStore(toolsCardRegistry.subscribe, toolsCardRegistry.getAll);
  const installedCards = useCardsState('installedCards');
  const hasArguments = useHasArguments();

  const installedCardIds = useMemo(() => new Set(installedCards.map(c => c.id)), [installedCards]);

  const items = useMemo(() => {
    return cardIds
      .map(id => {
        const standardCard = allCards.find(card => card.id === id);
        if (standardCard) return {type: 'standard' as const, data: standardCard, id};
        const toolsCard = tools.find(t => t.id === id);
        if (toolsCard) return {type: 'tools' as const, data: toolsCard, id};
        return null;
      })
      .filter((item): item is {type: 'standard' | 'tools'; data: any; id: string} => item !== null);
  }, [cardIds, allCards, tools]);

  // Extension point: plugins can completely replace the card renderer.
  const ReplaceCards = extensionsData.cards.replace;

  return (
    <LayoutGroup id={`${cat}_cards_category`}>
      <AnimatePresence>
        {isNil(ReplaceCards) ? (
          <>
            {items.map((item, index) => {
              if (item.type === 'standard') {
                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    animate="animate"
                    initial="initial"
                    variants={variants}
                    layout>
                    <Wrapper
                      cardData={item.data}
                      hasArguments={hasArguments.has(item.id)}
                      isInstalled={installedCardIds.has(item.id)}
                    />
                  </motion.div>
                );
              } else {
                const CustomCard = item.data.component;
                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    animate="animate"
                    initial="initial"
                    variants={variants}
                    layout>
                    {CustomCard ? (
                      <CustomCard />
                    ) : (
                      <ToolsCard
                        id={item.data.id}
                        icon={item.data.icon}
                        title={item.data.title}
                        onPress={item.data.onPress}
                        description={item.data.description}
                      />
                    )}
                  </motion.div>
                );
              }
            })}
            {typeof children === 'function' ? children(items.length) : children}
          </>
        ) : (
          <ReplaceCards cards={items.filter(x => x.type === 'standard').map(x => x.data)} />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};

/** Renders every available card, delegating to the plugin replace-slot if present. */
const AllCards = () => {
  const allCards = useAllCardDataWithPath();
  const tools = useSyncExternalStore(toolsCardRegistry.subscribe, toolsCardRegistry.getAll);
  // Extension point: plugins may add custom category content after the main list.
  const allCategory = extensionsData.customizePages.home.add.allCategory;
  // Extension point: plugins can completely replace the card renderer.
  const ReplaceCards = extensionsData.cards.replace;

  if (isEmpty(allCards) && isEmpty(allCategory) && isEmpty(tools)) {
    return (
      <EmptyStateCard
        className="size-full"
        bodyClassName="gap-y-3"
        title="No Card to Display!"
        icon={<InboxIcon size={40} />}
        action={<NavigateToPluginsButton />}
        description="Please install at least one module in plugins page."
      />
    );
  }

  return (
    <LayoutGroup id="all_cards_category">
      <AnimatePresence>
        {isNil(ReplaceCards) ? (
          <>
            <RenderCardList cards={allCards} />
            {tools.map((item, index) => {
              const CustomCard = item.component;
              return (
                <motion.div
                  key={item.id}
                  animate="animate"
                  initial="initial"
                  variants={variants}
                  custom={index + allCards.length}
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
            {allCategory.map((AllComp, index) => {
              const Comp = AllComp as unknown as FC<{startIndex?: number}>;
              return <Comp key={index} startIndex={allCards.length + tools.length} />;
            })}
          </>
        ) : (
          <ReplaceCards cards={allCards} />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};

// ─── Exported category sections ───────────────────────────────────────────────

/** Renders the "PINNED" home page category section. */
export const PinnedCars = memo(() => {
  const pinnedCards = useCardsState('pinnedCards');

  // Extension point: plugins may inject custom items alongside pinned cards.
  const pinCategory = extensionsData.customizePages.home.add.pinCategory;

  const id = useId();

  return (
    <HomeCategory
      title="PINNED"
      subTitle="Quick Access to Your Top AI Tools"
      icon={<Pin_Color_Icon id={'home_category_pin' + id} className={CardContainerClasses} />}>
      <div className="flex w-full flex-wrap gap-5 overflow-visible scrollbar-hide">
        {isEmpty(pinnedCards) && isEmpty(pinCategory) ? (
          <EmptyStateCard
            className="size-full"
            bodyClassName="gap-y-3"
            title="No pinned card!"
            icon={<PinCircleIcon size={45} />}
            description="Pin your favorite cards to easily access them here."
          />
        ) : (
          <CardsByIds cat="pinned" cardIds={pinnedCards}>
            {startIndex =>
              pinCategory.map((Pin, index) => {
                const Comp = Pin as FC<{startIndex?: number}>;
                return <Comp key={index} startIndex={startIndex} />;
              })
            }
          </CardsByIds>
        )}
      </div>
    </HomeCategory>
  );
});

/** Renders the "RECENTLY USED" home page category section. */
export const RecentlyCards = memo(() => {
  const recentlyUsedCards = useCardsState('recentlyUsedCards');

  // Extension point: plugins may inject custom items alongside recently-used cards.
  const recentlyCategory = extensionsData.customizePages.home.add.recentlyCategory;

  const id = useId();

  return (
    <HomeCategory
      title="RECENTLY USED"
      subTitle="Your Most Recent AI Interactions"
      icon={<History_Color_Icon className={CardContainerClasses} id={'home_category_history' + id} />}>
      <div className="flex w-full flex-wrap gap-5 overflow-visible scrollbar-hide">
        {isEmpty(recentlyUsedCards) && isEmpty(recentlyCategory) ? (
          <EmptyStateCard
            className="size-full"
            bodyClassName="gap-y-3"
            icon={<InboxIcon size={40} />}
            description="No Recently Used Card to Display!"
          />
        ) : (
          <CardsByIds cat="recently" cardIds={recentlyUsedCards}>
            {startIndex =>
              recentlyCategory.map((Recent, index) => {
                const Comp = Recent as FC<{startIndex?: number}>;
                return <Comp key={index} startIndex={startIndex} />;
              })
            }
          </CardsByIds>
        )}
      </div>
    </HomeCategory>
  );
});

/** Renders the "All" home page category section showing every available card. */
export const AllCardsSection = memo(() => {
  const id = useId();

  return (
    <HomeCategory
      title="All"
      subTitle="Explore the Complete List of AI Interfaces"
      icon={<Apps_Color_Icon className={CardContainerClasses} id={'home_category_app_color' + id} />}>
      <div className="flex w-full flex-wrap gap-5 overflow-visible scrollbar-hide">
        <AllCards />
      </div>
    </HomeCategory>
  );
});

/** Props for the CardsBySearch component. */
export interface CardsBySearchProps {
  /** The active search string used to filter cards. */
  searchValue: string;
}

/**
 * Renders a filtered list of cards that match the current search query.
 * Delegates to the plugin replace-slot when one is registered.
 */
export function CardsBySearch({searchValue}: CardsBySearchProps) {
  const standardCards = useSearchCards(searchValue);
  const tools = useSyncExternalStore(toolsCardRegistry.subscribe, toolsCardRegistry.getAll);
  const installedCards = useCardsState('installedCards');
  const hasArguments = useHasArguments();

  const installedCardIds = useMemo(() => new Set(installedCards.map(c => c.id)), [installedCards]);

  const items = useMemo(() => {
    let matchedTools = tools;
    if (searchValue) {
      const fuse = new Fuse(tools, {
        keys: ['title', 'description'],
        threshold: 0.4,
      });
      matchedTools = fuse.search(searchValue).map(r => r.item);
    }
    return [
      ...standardCards.map(c => ({type: 'standard' as const, data: c, id: c.id})),
      ...matchedTools.map(t => ({type: 'tools' as const, data: t, id: t.id})),
    ];
  }, [standardCards, tools, searchValue]);

  // Extension point: plugins can completely replace the card renderer.
  const ReplaceCards = extensionsData.cards.replace;

  return (
    <div className="size-full p-5 rounded-3xl bg-surface-secondary pr-1">
      <ScrollShadow className="flex content-start size-full flex-wrap gap-5 overflow-y-scroll pr-2">
        {isEmpty(items) ? (
          <EmptyStateCard bodyClassName="gap-y-3" description="No cards match your search." />
        ) : isNil(ReplaceCards) ? (
          <>
            {items.map((item, index) => {
              if (item.type === 'standard') {
                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    animate="animate"
                    initial="initial"
                    variants={variants}
                    layout>
                    <Wrapper
                      cardData={item.data}
                      hasArguments={hasArguments.has(item.id)}
                      isInstalled={installedCardIds.has(item.id)}
                    />
                  </motion.div>
                );
              } else {
                const CustomCard = item.data.component;
                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    animate="animate"
                    initial="initial"
                    variants={variants}
                    layout>
                    {CustomCard ? (
                      <CustomCard />
                    ) : (
                      <ToolsCard
                        id={item.data.id}
                        icon={item.data.icon}
                        title={item.data.title}
                        onPress={item.data.onPress}
                        description={item.data.description}
                      />
                    )}
                  </motion.div>
                );
              }
            })}
          </>
        ) : (
          <ReplaceCards cards={items.filter(x => x.type === 'standard').map(x => x.data)} />
        )}
      </ScrollShadow>
    </div>
  );
}
