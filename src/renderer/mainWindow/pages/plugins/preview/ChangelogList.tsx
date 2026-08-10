import {Chip, ScrollShadow} from '@heroui/react';
import {usePluginsState} from '@lynx/redux/reducers/plugins';
import {SubscribeStages} from '@lynx_common/types';
import {ChangelogItem, ChangelogSubItem, PluginChangelog} from '@lynx_common/types/plugins';
import {motion} from 'framer-motion';
import {Bug, ChevronRight, HelpCircle, Sparkles, Zap} from 'lucide-react';
import {memo} from 'react';

import {getStageColor, getStageDisplayName} from './utils';

/**
 * Sanitizes category strings by removing any leading emojis/icons coming from the backend data.
 */
function sanitizeCategoryName(category: string): string {
  return category
    .replace(
      // eslint-disable-next-line max-len
      /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
      '',
    )
    .trim();
}

/**
 * Maps cleaned categories to clean, micro-sized icons.
 */
function getCategoryIcon(cleanCategory: string) {
  const norm = cleanCategory.toLowerCase();
  if (norm.includes('new') || norm.includes('add')) {
    return <Sparkles className="size-3.5 text-amber-500" />;
  }
  if (norm.includes('improve') || norm.includes('update') || norm.includes('change')) {
    return <Zap className="size-3.5 text-blue-500" />;
  }
  if (norm.includes('fix') || norm.includes('bug')) {
    return <Bug className="size-3.5 text-emerald-500" />;
  }
  return <HelpCircle className="size-3.5 text-zinc-400 dark:text-zinc-500" />;
}

interface ChangelogEntryProps {
  item: ChangelogSubItem;
  depth?: number;
  id: string | number;
}

/**
 * Renders individual changelog rows using safe Tailwind v3/v4 responsive theme text.
 */
function ChangelogEntry({item, depth = 0, id}: ChangelogEntryProps) {
  if (typeof item === 'string') {
    return (
      <motion.div
        key={id}
        animate={{opacity: 1, x: 0}}
        initial={{opacity: 0, x: -4}}
        className={`${depth > 0 ? 'ml-4' : ''} py-0.5`}
        transition={{duration: 0.15, delay: depth * 0.01}}>
        <div className="flex items-start gap-2.5 group">
          {/* Micro bullet, styled to match native desktop lists in both themes */}
          <div className="flex items-center justify-center h-4.5 shrink-0 mt-0.5">
            <span
              className={`rounded-full transition-all duration-150 ${
                depth > 0 ? 'size-1 bg-zinc-400 dark:bg-zinc-600' : 'size-1.5 bg-blue-500 group-hover:bg-blue-400'
              }`}
            />
          </div>
          <span
            className={
              'text-xs md:text-sm font-medium leading-normal text-zinc-600 dark:text-zinc-300' +
              ' group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-100'
            }>
            {item}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={id}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.2}}
      initial={{opacity: 0, y: -4}}
      className={`${depth > 0 ? 'ml-4' : ''} mt-0.5`}>
      {Object.entries(item).map(([label, subItems]) => (
        <div key={label} className="mt-1">
          <div className="flex items-start gap-1.5 group mb-1">
            <ChevronRight
              className={
                'size-3 text-zinc-400 dark:text-zinc-500 mt-0.5 group-hover:text-blue-500 transition-colors shrink-0'
              }
            />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-normal">{label}</span>
          </div>
          {/* Theme-safe nested timeline connector */}
          <div className="space-y-0.5 border-l border-border ml-1.5 pl-3">
            {subItems.map((subItem, index) => (
              <ChangelogEntry id={index} item={subItem} depth={depth + 1} key={`${label}_${index}`} />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Clean, compact category bands.
 */
function CategoryGroup({category, entries}: {category: string; entries: ChangelogSubItem[]}) {
  const cleanName = sanitizeCategoryName(category);

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={
            'flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 border border-border px-2 py-1 rounded-lg'
          }>
          {getCategoryIcon(cleanName)}
          <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-700 dark:text-zinc-300">
            {cleanName}
          </span>
        </div>
        <div className="h-px grow bg-zinc-200/60 dark:bg-zinc-800/60" />
      </div>
      <div className="space-y-0.5 pl-0.5">
        {entries.map((entry, index) => (
          <ChangelogEntry depth={0} id={index} item={entry} key={`${category}_${index}`} />
        ))}
      </div>
    </div>
  );
}

function ChangelogSection({item}: {item: ChangelogItem}) {
  return (
    <div className="space-y-3">
      {Object.entries(item).map(([category, entries], idx) => (
        <motion.div
          key={category}
          animate={{opacity: 1, y: 0}}
          initial={{opacity: 0, y: 6}}
          transition={{duration: 0.2, delay: idx * 0.03}}>
          <CategoryGroup entries={entries} category={category} />
        </motion.div>
      ))}
    </div>
  );
}

interface VersionHistoryCardProps {
  versionData: PluginChangelog;
  index: number;
  isInstalledVersion: boolean;
  stage: SubscribeStages | undefined;
}

/**
 * Micro-density Version Card utilizing core Tailwind variables to support Light and Dark mode flawlessly.
 */
function VersionHistoryCard({versionData, index, isInstalledVersion, stage}: VersionHistoryCardProps) {
  const isLatest = index === 0;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl border p-4.5 transition-all duration-150 ${
        isLatest
          ? 'bg-white/80 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 shadow-xs'
          : 'bg-white/40 dark:bg-zinc-950/20 border-zinc-200/40 dark:border-zinc-900/60'
      }`}
      key={versionData.version}
      animate={{opacity: 1, y: 0}}
      initial={{opacity: 0, y: 10}}
      transition={{duration: 0.3, delay: index * 0.04}}>
      <div
        className={
          'absolute left-0 top-0 bottom-0 w-0.5 bg-linear-to-b from-border/50 ' +
          (isLatest ? 'via-purple-500' : 'via-zinc-400/80 dark:via-zinc-600/80') +
          ' from-border/50 pointer-events-none'
        }
      />
      {/* Header Panel */}
      <div className={'flex items-center justify-between gap-3 border-b border-border pb-3 mb-4'}>
        <div className="flex items-center gap-2">
          {/* Native theme-responsive text title */}
          <h3 className="text-base font-bold tracking-tight text-zinc-950 dark:text-white">{versionData.version}</h3>

          <div className="flex items-center gap-1">
            {isLatest && (
              <Chip
                size="sm"
                variant="secondary"
                className="font-bold text-[9px] uppercase tracking-wider h-4 px-1.5 min-w-0">
                Latest Release
              </Chip>
            )}

            {isInstalledVersion && (
              <Chip
                size="sm"
                variant="soft"
                color="success"
                className="font-bold text-[9px] uppercase tracking-wider h-4 px-1.5 min-w-0">
                Installed
              </Chip>
            )}
          </div>
        </div>

        {stage && (
          <Chip
            size="sm"
            variant="secondary"
            color={getStageColor(stage)}
            className="font-bold text-[9px] uppercase tracking-wider h-5">
            {getStageDisplayName(stage)}
          </Chip>
        )}
      </div>

      {/* Changes list body */}
      <div className="relative z-10">
        {versionData.items.map((changelogItem, itemIndex) => (
          <ChangelogSection item={changelogItem} key={`${versionData.version}_v_${itemIndex}`} />
        ))}
      </div>
    </motion.div>
  );
}

const PluginChangelogList = memo(() => {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const installedList = usePluginsState('installedList');

  const selectedPluginId = selectedPlugin?.metadata.id;
  const installedVersion = installedList.find(item => item.id === selectedPluginId)?.version;

  return (
    <motion.div
      key="changelog"
      exit={{opacity: 0}}
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.15}}
      className="size-full overflow-hidden">
      <ScrollShadow className="gap-y-4 px-4 py-4 size-full">
        <div className="max-w-4xl mx-auto space-y-4 pb-6">
          {selectedPlugin?.changes.map((version, index) => {
            const stage = selectedPlugin?.versions.find(v => v.version === version.version)?.stage;
            return (
              <VersionHistoryCard
                index={index}
                stage={stage}
                key={version.version}
                versionData={version}
                isInstalledVersion={version.version === installedVersion}
              />
            );
          })}
        </div>
      </ScrollShadow>
    </motion.div>
  );
});

PluginChangelogList.displayName = 'PluginChangelogList';

export default PluginChangelogList;
