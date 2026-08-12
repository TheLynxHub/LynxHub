import {ParsedPreview, ParsedPreviewItem} from '@lynx_common/types/plugins/modules';
import {isWin} from '@lynx_common/utils';
import {InboxLineIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {PrismLight as SyntaxHighlighter} from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import batch from 'react-syntax-highlighter/dist/esm/languages/prism/batch';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import {materialDark, materialLight} from 'react-syntax-highlighter/dist/esm/styles/prism';

import {useAppState} from '../../../../../../redux/reducers/app';
import CopyClipboard from '../../../../../CopyClipboard';
import EmptyStateCard from '../../../../../EmptyStateCard';
import LaunchConfigSection from '../LaunchConfigSection';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('batch', batch);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);

type Props = {
  preview?: ParsedPreview;
  text?: ParsedPreview;
};

function getLanguageForTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('.json')) return 'json';
  if (lower.includes('.yaml') || lower.includes('.yml')) return 'yaml';
  if (lower.includes('.bat') || lower.includes('.cmd')) return 'batch';
  if (lower.includes('.sh') || lower.includes('.bash')) return 'bash';
  return isWin ? 'batch' : 'bash';
}

/**
 * Show arguments as text or separated file cards for preview and clipboard copying.
 */
export default function ArgumentsPreview({preview, text}: Props) {
  const isDark = useAppState('darkMode');
  const data = preview ?? text ?? '';

  const isArray = Array.isArray(data);
  const items: ParsedPreviewItem[] = isArray ? (data as ParsedPreviewItem[]) : [];
  const singleText = typeof data === 'string' ? data : '';

  const hasContent = isArray ? items.some(item => !isEmpty(item.data)) : !isEmpty(singleText);

  const fullTextToCopy = isArray ? items.map(item => `${item.title}:\n${item.data}`).join('\n\n') : singleText;

  return (
    <LaunchConfigSection
      customButton={
        <CopyClipboard contentToCopy={fullTextToCopy} tooltipTitle="Copy Preview to Clipboard" showTooltip />
      }
      title="Preview"
      description="Preview of the final result to be saved">
      {!hasContent ? (
        <EmptyStateCard
          className="m-0"
          bodyClassName="py-8"
          icon={<InboxLineIcon size={40} />}
          description="No preview available to display"
        />
      ) : isArray ? (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-foreground/80">{item.title}</span>
                <CopyClipboard contentToCopy={item.data} tooltipTitle={`Copy ${item.title} to Clipboard`} showTooltip />
              </div>
              <SyntaxHighlighter
                customStyle={{
                  borderRadius: '1rem',
                  fontSize: '0.8rem',
                  padding: '1.1rem',
                  margin: 0,
                }}
                language={getLanguageForTitle(item.title)}
                style={isDark ? materialDark : materialLight}
                codeTagProps={{className: 'text-semi-muted font-JetBrainsMono'}}
                wrapLongLines>
                {item.data}
              </SyntaxHighlighter>
            </div>
          ))}
        </div>
      ) : (
        <SyntaxHighlighter
          customStyle={{
            borderRadius: '1rem',
            fontSize: '0.8rem',
            padding: '1.1rem',
          }}
          language={isWin ? 'batch' : 'bash'}
          style={isDark ? materialDark : materialLight}
          codeTagProps={{className: 'text-semi-muted font-JetBrainsMono'}}
          wrapLongLines>
          {singleText}
        </SyntaxHighlighter>
      )}
    </LaunchConfigSection>
  );
}
