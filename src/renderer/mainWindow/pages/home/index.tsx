import {ScrollShadow} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {useDebounceBreadcrumb} from '@lynx_shared/sentry/Breadcrumbs';
import {AnimatePresence, LayoutGroup} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {memo, useEffect, useMemo, useState} from 'react';

import {AllCardsSection, CardsBySearch, PinnedCars, RecentlyCards} from '../CardsCategory';
import Page from '../Page';
import HomeFilter from './Filter';
import HomeNotificationDrawer from './notification';
import HomeSearchBox from './SearchBox';
import HomeTopBar from './TopBar';

/**
 * The main Home Page component.
 * It renders the search, categories, extension injects, top bars, and cards grid.
 */
const HomePage = memo(() => {
  const homeCategory = useCardsState('homeCategory');
  const [searchValue, setSearchValue] = useState<string>('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>('');

  useEffect(() => {
    if (searchValue === '') {
      setDebouncedSearchValue('');
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 100);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue]);

  useDebounceBreadcrumb('Home search', [debouncedSearchValue]);

  const {
    searchAndFilter: SearchAndFilter,
    categories: Categories,
    searchResult: SearchResult,
  } = useMemo(() => extensionsData.customizePages.home.replace, []);
  const {bottom, scrollBottom, scrollTop, top} = useMemo(() => extensionsData.customizePages.home.add, []);

  return (
    <Page>
      <div className="flex size-full shrink-0 flex-col">
        {SearchAndFilter ? (
          <SearchAndFilter />
        ) : (
          <div className="my-4 flex w-full items-center justify-between space-x-3 px-2">
            <HomeSearchBox searchValue={searchValue} setSearchValue={setSearchValue} />
            <HomeFilter selectedCategories={homeCategory} />
            <HomeNotificationDrawer />
          </div>
        )}

        <HomeTopBar />

        {top && top.map((Top, index) => <Top key={index} />)}

        <ScrollShadow className="scrollbar-hide size-full space-y-8 overflow-y-scroll pb-4 pt-6 px-2">
          {scrollTop && scrollTop.map((Top, index) => <Top key={index} />)}

          {Categories ? (
            <Categories />
          ) : isEmpty(debouncedSearchValue) ? (
            <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {homeCategory.includes('Pin') && <PinnedCars key="pinned-category" />}
                {homeCategory.includes('Recently') && <RecentlyCards key="recently-category" />}
                {homeCategory.includes('All') && <AllCardsSection key="all-category" />}
              </AnimatePresence>
            </LayoutGroup>
          ) : SearchResult ? (
            <SearchResult searchValue={debouncedSearchValue} />
          ) : (
            <CardsBySearch searchValue={debouncedSearchValue} />
          )}

          {scrollBottom && scrollBottom.map((Top, index) => <Top key={index} />)}
        </ScrollShadow>

        {bottom && bottom.map((Top, index) => <Top key={index} />)}
      </div>
    </Page>
  );
});

export default HomePage;
