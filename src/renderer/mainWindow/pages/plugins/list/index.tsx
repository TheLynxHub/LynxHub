import {Button, Card, ProgressBar, ScrollShadow, SearchField, Skeleton, Spinner} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import {pluginsActions, usePluginsState} from '@lynx/redux/reducers/plugins';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import {Circle_Icon, Grid_Icon, List_Icon} from '@lynx_assets/icons';
import {PluginPage_Icon} from '@lynx_assets/icons/pages';
import {PluginFilter} from '@lynx_common/types/plugins';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import {Refresh} from '@solar-icons/react-perf/BoldDuotone';
import Fuse from 'fuse.js';
import {isEmpty} from 'lodash-es';
import {useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import LynxTooltip from '../../../components/LynxTooltip';
import {topToast} from '../../../layouts/ToastProviders';
import {PluginListItem} from './Items';
import {FilterMenu, useFetchExtensions, useFilteredList, useSortedList} from './utils';

/**
 * Main component for the plugin list view.
 * Displays a searchable, filterable list of available extensions and modules.
 * Supports both Default (Card) and Compact (List) view modes.
 */
export default function PluginList() {
  const [selectedFilters, setSelectedFilters] = useState<PluginFilter>('all');
  const [searchValue, setSearchValue] = useState<string>('');

  // Persist the user's preferred layout mode in localStorage
  const [layoutMode, setLayoutMode] = useState<'default' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('lynx_plugin_layout_mode');
      return saved === 'compact' ? 'compact' : 'default';
    } catch {
      return 'default';
    }
  });

  const installed = usePluginsState('installedList');
  const installedID = useMemo(() => installed.map(item => item.id), [installed]);

  const {list, loading, refreshing} = useFetchExtensions();

  const sortedList = useSortedList(list, installedID);
  const filteredList = useFilteredList(sortedList, selectedFilters, installedID);

  const resultList = useMemo(() => {
    if (isEmpty(searchValue)) {
      return filteredList;
    }
    const fuse = new Fuse(filteredList, {
      keys: ['metadata.title', 'metadata.description', 'url'],
      threshold: 0.4,
    });
    return fuse.search(searchValue).map(r => r.item);
  }, [searchValue, filteredList]);

  const handleLayoutChange = (mode: 'default' | 'compact') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('lynx_plugin_layout_mode', mode);
    } catch (e) {
      console.error('Failed to save layout mode preference:', e);
    }
  };

  const emptyText = useMemo(() => {
    return (
      <EmptyStateCard
        icon={
          <div className="rounded-full bg-surface-secondary/80 p-3 text-muted">
            <Circle_Icon className="size-5" />
          </div>
        }
        title={
          isEmpty(searchValue)
            ? 'It looks like there are no plugins available right now.'
            : `Couldn't find any plugins matching your search.`
        }
        description={
          isEmpty(searchValue) ? (
            <p className="text-sm text-muted">
              This could be temporary. Please try again later or check your internet connection.
            </p>
          ) : (
            <p className="text-sm text-muted">Try refining your search terms or checking for typos.</p>
          )
        }
      />
    );
  }, [searchValue]);

  return (
    <Card
      className={
        `absolute inset-y-4 sm:w-76 lg:w-[24rem] 2xl:w-120 px-0 ` +
        ` flex shrink-0 flex-col overflow-hidden transition-[width] duration-500`
      }
      variant="secondary">
      {refreshing && (
        <ProgressBar size="sm" aria-label="Loading list" className="absolute -top-1 inset-x-0" isIndeterminate>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      )}

      <Card.Header className="px-4">
        <div className="flex w-full flex-col gap-y-4">
          <div className="flex w-full flex-row items-center justify-between">
            <div className="flex gap-x-2 items-center">
              <PluginPage_Icon className="size-5" />
              <span>Plugins</span>
            </div>
            <SyncAllButton />
          </div>
          <div className="flex flex-row items-center gap-x-2">
            <SearchField name="search" value={searchValue} onChange={setSearchValue} fullWidth>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search for Plugins..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <FilterMenu selectedKeys={selectedFilters} setSelectedKeys={setSelectedFilters} />

            {/* View Mode Switcher */}
            <div
              className={
                'flex items-center shrink-0 bg-surface rounded-3xl py-0.5 px-1 border border-surface/50 shadow-sm h-10'
              }>
              <LynxTooltip content="Default Card View">
                <Button
                  className={`size-8 min-w-0 transition-colors duration-200 ${
                    layoutMode === 'default' ? 'bg-surface-secondary text-foreground' : 'bg-transparent text-muted'
                  }`}
                  variant="secondary"
                  onPress={() => handleLayoutChange('default')}
                  isIconOnly>
                  <Grid_Icon />
                </Button>
              </LynxTooltip>
              <LynxTooltip content="Compact List View">
                <Button
                  className={`size-8 min-w-0 transition-colors duration-200 ${
                    layoutMode === 'compact' ? 'bg-surface-secondary text-foreground' : 'bg-transparent text-muted'
                  }`}
                  variant="secondary"
                  onPress={() => handleLayoutChange('compact')}
                  isIconOnly>
                  <List_Icon />
                </Button>
              </LynxTooltip>
            </div>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="size-full overflow-hidden px-1">
        <ScrollShadow className="size-full space-y-2 px-3 pt-2">
          {loading ? (
            <div className="flex flex-col">
              {Array(3)
                .fill(null)
                .map((_, index) => (
                  <div key={index} className="h-36 w-full space-y-1 p-2">
                    <Skeleton className="h-10 w-full rounded-xl bg-surface/50" />
                    <Skeleton className="h-20 w-full rounded-xl bg-surface/50" />
                  </div>
                ))}
            </div>
          ) : isEmpty(resultList) ? (
            emptyText
          ) : (
            <div className="flex flex-col gap-y-2 pb-4">
              {resultList.map(item => (
                <PluginListItem
                  item={item}
                  installed={installed}
                  layoutMode={layoutMode}
                  key={`${item.metadata.id}_list_item`}
                />
              ))}
            </div>
          )}
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
}

/**
 * Button component to trigger syncing of all available updates for installed plugins.
 */
function SyncAllButton() {
  const dispatch = useDispatch<AppDispatch>();

  const syncList = usePluginsState('syncList');
  const updatingAll = usePluginsState('updatingAll');

  const syncAll = useCallback(() => {
    dispatch(pluginsActions.manageSet({key: 'updating', id: syncList.map(item => item.id), operation: 'add'}));
    dispatch(pluginsActions.setUpdatingAll(true));

    pluginsIpc
      .syncAll(syncList.map(item => ({id: item.id, version: item.version, commit: item.commit})))
      .then(synced => {
        if (!isEmpty(synced)) {
          topToast.success(`${synced.length} of ${syncList.length} plugins synced successfully!`);
          showRestartModal(dispatch, 'To apply the changes, please restart the app.');

          const updatedList = syncList
            .filter(item => synced.includes(item.id))
            .map(item => ({version: item.version, id: item.id}));

          dispatch(pluginsActions.updateInstalledVersion(updatedList));
        }
      })
      .catch(() => topToast.danger('Failed to sync plugins. Please try again later.'))
      .finally(() => {
        dispatch(pluginsActions.manageSet({key: 'updating', id: syncList.map(item => item.id), operation: 'remove'}));
        dispatch(pluginsActions.setUpdatingAll(false));
      });
  }, [dispatch, syncList]);

  if (isEmpty(syncList)) return null;

  return (
    <Button size="sm" onPress={syncAll} isPending={updatingAll}>
      {updatingAll ? <Spinner size="sm" color="current" /> : <Refresh />}
      {updatingAll ? 'Syncing...' : `Sync All (${syncList.length})`}
    </Button>
  );
}
