import {Description, Pagination, SearchField, Spinner} from '@heroui/react';
import {validateGitRepoUrl} from '@lynx_common/utils';
import {InboxIcon} from '@solar-icons/react/bold-duotone';
import Fuse from 'fuse.js';
import {useEffect, useMemo, useState} from 'react';

import {getCardMethod, useAllCardMethods} from '../../../../../../plugins/modules';
import EmptyStateCard from '../../../../../EmptyStateCard';
import {ExtensionsInfo} from '../types';
import RenderItem from './RenderItem';

type Props = {
  visible: boolean;
  updateTable: () => void;
  installedExtensions: string[];
  id: string;
  dir: string;
};

const useAvailableExtensions = ({visible, updateTable, installedExtensions, id, dir}: Props) => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [data, setData] = useState<ExtensionsInfo[]>([]);
  const [list, setList] = useState<ExtensionsInfo[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const allMethods = useAllCardMethods();

  const searchedData = useMemo(() => {
    if (!searchValue) return data;
    const fuse = new Fuse(data, {
      keys: ['title', 'description', 'url'],
      threshold: 0.4,
    });
    return fuse.search(searchValue).map(r => r.item);
  }, [searchValue, data]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searchedData.slice(start, start + pageSize);
  }, [page, pageSize, searchedData]);

  useEffect(() => {
    // Remove installed extensions from the list
    const filterInstalled = list.filter(ext => !installedExtensions.includes(ext.url));
    setData(filterInstalled);
  }, [installedExtensions, list]);

  useEffect(() => {
    async function fetchModules() {
      setIsLoading(true);
      try {
        const fetchExtensionList = getCardMethod(allMethods, id, 'fetchExtensionList');
        if (fetchExtensionList) {
          const extensions: ExtensionsInfo[] = await fetchExtensionList();
          const filterData = extensions.filter(ext => !!validateGitRepoUrl(ext.url));
          setList(filterData.map(ext => ({...ext, url: validateGitRepoUrl(ext.url)})));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    if (visible) fetchModules();
  }, [visible, allMethods, id]);

  const totalPages = useMemo(() => {
    return Math.ceil(searchedData.length / pageSize);
  }, [searchedData, pageSize]);

  if (!visible) return {Body: null, Footer: null};

  return {
    Body: (
      <div className="flex h-full flex-col">
        <div className="mb-4 p-1 flex w-full justify-center">
          <SearchField className="w-full" variant="secondary" value={searchValue} onChange={setSearchValue} autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search by title, description or url..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {isLoading ? (
          <div className="flex flex-col size-full items-center justify-center text-center gap-y-2">
            <Spinner size="lg" />
            <Description className="text-sm">Loading extensions list...</Description>
          </div>
        ) : searchedData.length === 0 ? (
          <EmptyStateCard
            icon={<InboxIcon size={40} />}
            className="bg-surface-secondary"
            description="There are no extensions available at the moment!"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            {paginatedData.map(item => (
              <RenderItem dir={dir} item={item} key={item.url} updateTable={updateTable} searchValue={searchValue} />
            ))}
          </div>
        )}
      </div>
    ),
    Footer:
      searchedData.length > pageSize ? (
        <Pagination className="w-full justify-center">
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous isDisabled={page === 1} onPress={() => setPage(p => p - 1)}>
                <Pagination.PreviousIcon />
                <span>Previous</span>
              </Pagination.Previous>
            </Pagination.Item>
            {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
              <Pagination.Item key={p}>
                <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                  {p}
                </Pagination.Link>
              </Pagination.Item>
            ))}
            <Pagination.Item>
              <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage(p => p + 1)}>
                <span>Next</span>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      ) : null,
  };
};

export default useAvailableExtensions;
