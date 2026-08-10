import {Button, Link, Spinner} from '@heroui/react';
import {CardInfoDescriptions, CardInfoDescriptions_Items} from '@lynx_common/types/plugins/modules';
import {isValidURL} from '@lynx_common/utils';
import filesIpc from '@lynx_shared/ipc/files';
import {FolderOpenIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty, isNil} from 'lodash-es';
import {memo, useCallback} from 'react';

import DescriptionGrid, {DescriptionGridItem} from '../../../../DescriptionGrid';

interface CardInfoDescriptionProps {
  folders: string[] | undefined;
  descriptions: CardInfoDescriptions;
}

function CardInfoDescription({folders, descriptions}: CardInfoDescriptionProps) {
  const getItems = useCallback((items: CardInfoDescriptions_Items): DescriptionGridItem[] => {
    return items
      .map((item, index) => {
        if (isNil(item.result)) return null;

        if (item.result === 'loading') {
          return {key: index, label: item.label, content: <Spinner className="flex" />};
        }

        if (isValidURL(item.result)) {
          return {
            key: index,
            label: item.label,
            content: (
              <Link
                onPress={() => {
                  if (item.result) window.open(item.result);
                }}
                className="no-underline hover:underline w-full">
                <span className="text-wrap w-full overflow-hidden">{item.result}</span>
                <Link.Icon />
              </Link>
            ),
          };
        }

        return {key: index, label: item.label, content: item.result};
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, []);

  const openDir = useCallback((dir: string) => {
    filesIpc.openPath(dir);
  }, []);

  if (isEmpty(descriptions) && isEmpty(folders)) return null;

  return (
    <div className="flex flex-col gap-y-4">
      {descriptions?.map((desc, index) => {
        const items = getItems(desc.items);
        if (isEmpty(items)) return null;

        return (
          <DescriptionGrid
            columns={2}
            items={items}
            title={desc.title}
            key={`desc_${index}`}
            itemClassName="bg-surface"
            className="bg-surface-secondary"
          />
        );
      })}

      {folders?.map((folder, index) => (
        <Button size="lg" variant="secondary" key={`openFolder_${index}`} onPress={() => openDir(folder)} fullWidth>
          <FolderOpenIcon />
          <span className="truncate text-sm font-medium">{folder}</span>
        </Button>
      ))}
    </div>
  );
}

export default memo(CardInfoDescription);
