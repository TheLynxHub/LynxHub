import {Avatar, Button, Chip, Description, Link, Spinner, useOverlayState} from '@heroui/react';
import {extractGitUrl, getFallbackString} from '@lynx_common/utils';
import gitIpc from '@lynx_shared/ipc/git';
import {StarIcon} from '@solar-icons/react/bold';
import {Home2Icon} from '@solar-icons/react/bold-duotone';
import {capitalize} from 'lodash-es';
import {memo, useCallback, useState} from 'react';
import Highlighter from 'react-highlight-words';

import {topToast} from '../../../../../../layouts/ToastProviders';
import {formatNumber} from '../../../../../../utils';
import ReadmeModal from '../../../../../modals/ReadmeModal';
import {ExtensionsInfo} from '../types';

/* eslint-disable perfectionist/sort-jsx-props */

type Props = {
  item: ExtensionsInfo;
  updateTable: () => void;
  dir: string;
  searchValue: string;
};

/** Render available modules to install. */
const RenderItem = memo(({item, updateTable, dir, searchValue}: Props) => {
  const [installing, setInstalling] = useState<boolean>(false);

  const {owner, repo, avatarUrl} = extractGitUrl(item.url);

  const install = useCallback(() => {
    setInstalling(true);
    gitIpc
      .cloneShallowPromise({
        url: item.url || '',
        directory: `${dir}/${repo || ''}`,
        singleBranch: true,
        depth: 1,
      })
      .then(() => {
        topToast.success('Extension installed successfully.');
        updateTable();
      })
      .catch(e => {
        topToast.danger(
          e && e.message
            ? `Error while installing extension: ${e.message.replace(
                "Error invoking remote method 'git:clone-shallow-promise': ",
                '',
              )}`
            : 'Error while installing extension!',
        );
      })
      .finally(() => {
        setInstalling(false);
      });
  }, [item.url, dir, repo, updateTable]);

  const readmeModal = useOverlayState();

  return (
    <>
      <div
        className={
          'flex w-full flex-row items-center justify-between rounded-3xl border-2 bg-surface-secondary p-3 ' +
          'border-transparent transition duration-300 hover:border-default-200 hover:bg-surface-tertiary'
        }>
        <div className="flex min-w-0 flex-1 flex-row items-center gap-4">
          <Avatar>
            <Avatar.Image alt={`${item.title} avatar`} src={avatarUrl} />
            <Avatar.Fallback>{getFallbackString(item.title)}</Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link onPress={() => window.open(item.url)}>
                <Highlighter
                  autoEscape={true}
                  highlightTag="span"
                  className="inline-block"
                  textToHighlight={item.title}
                  searchWords={searchValue.split(' ')}
                  highlightClassName="bg-warning/70 rounded-sm px-0.5"
                />
                <Link.Icon />
              </Link>
              <Chip size="sm" variant="primary" color="default">
                {capitalize(owner)}
              </Chip>
              {item.stars && (
                <Chip size="sm" variant="soft" color="warning">
                  <StarIcon size={10} className={item.stars >= 1000 ? 'text-yellow-400' : 'text-yellow-500'} />
                  {formatNumber(item.stars)}
                </Chip>
              )}
            </div>
            <Description className="truncate text-muted">
              <Highlighter
                autoEscape={true}
                highlightTag="span"
                className="inline-block"
                searchWords={searchValue.split(' ')}
                textToHighlight={item.description || ''}
                highlightClassName="bg-warning/50 rounded-sm px-0.5"
              />
            </Description>
          </div>
        </div>

        <div className="ml-4 flex shrink-0 flex-row items-center gap-2">
          <Button size="sm" onPress={install} isPending={installing} isDisabled={installing}>
            {installing ? <Spinner color="current" size="sm" /> : 'Install'}
          </Button>
          <Button size="sm" variant="secondary" onPress={readmeModal.open} isIconOnly>
            <Home2Icon className="size-4" />
          </Button>
        </div>
      </div>
      <ReadmeModal url={item.url} title={item.title} state={readmeModal} />
    </>
  );
});

export default RenderItem;
