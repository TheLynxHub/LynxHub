import {Key, Tabs} from '@heroui/react';
import MarkdownViewer from '@lynx/components/MarkdownViewer';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {usePluginsState} from '@lynx/redux/reducers/plugins';
import {getPluginReadmeUrl} from '@lynx_common/utils/plugins';
import {useDebounceBreadcrumb} from '@lynx_shared/sentry/Breadcrumbs';
import {HomeAngle2Icon} from '@solar-icons/react/bold-duotone';
import {ChecklistIcon} from '@solar-icons/react/line-duotone';
import {AnimatePresence, motion} from 'framer-motion';
import {isNil} from 'lodash-es';
import {useEffect, useMemo, useState} from 'react';

import ChangelogList from './ChangelogList';

/**
 * Props for the {@link PluginPreviewBody} component.
 */
interface PluginPreviewBodyProps {
  /** Indicates if the currently selected plugin is installed. */
  isInstalled: boolean;
}

/**
 * Body content of the plugin preview panel.
 * Includes a tabbed view for "Readme" and "Changelog".
 * Defaults to "Changelog" if the plugin is installed, otherwise defaults to "Readme".
 */
export default function PluginPreviewBody({isInstalled}: PluginPreviewBodyProps) {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const [currentTabKey, setCurrentTabKey] = useState<Key | undefined>('changelog');

  useDebounceBreadcrumb('Plugin tab', [currentTabKey]);

  // Synchronize the default tab based on whether the plugin is installed.
  useEffect(() => {
    setCurrentTabKey(isInstalled ? 'changelog' : 'readme');
  }, [isInstalled]);

  /** Optional replacement component for Markdown rendering, provided by extensions. */
  const ReplacementMarkdownViewer = extensionsData.replaceMarkdownViewer;

  /** Resolves the raw README URL from the selected plugin's repository. */
  const readmeUrl = useMemo(() => {
    const repoUrl = selectedPlugin?.url;
    return getPluginReadmeUrl(repoUrl) || '';
  }, [selectedPlugin?.url]);

  return (
    <div className="w-full flex flex-col overflow-hidden">
      <Tabs className="w-full" selectedKey={currentTabKey} onSelectionChange={setCurrentTabKey}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            <Tabs.Tab id="readme" className="gap-x-1">
              <HomeAngle2Icon />
              Readme
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="changelog" className="gap-x-1">
              <ChecklistIcon />
              Changelog
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <AnimatePresence mode="wait">
        {currentTabKey === 'readme' && (
          <motion.div
            key="readme"
            exit={{opacity: 0, y: -20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
            initial={{opacity: 0, y: 20}}
            className="size-full overflow-hidden">
            {isNil(ReplacementMarkdownViewer) ? (
              <MarkdownViewer urlType="raw" url={readmeUrl} />
            ) : (
              <ReplacementMarkdownViewer repoPath={selectedPlugin?.url || ''} />
            )}
          </motion.div>
        )}

        {currentTabKey === 'changelog' && <ChangelogList />}
      </AnimatePresence>
    </div>
  );
}
