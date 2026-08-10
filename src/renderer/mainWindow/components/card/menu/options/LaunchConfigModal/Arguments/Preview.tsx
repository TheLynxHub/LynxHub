import {isWin} from '@lynx_common/utils';
import {InboxLineIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {PrismLight as SyntaxHighlighter} from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import batch from 'react-syntax-highlighter/dist/esm/languages/prism/batch';
import {materialDark, materialLight} from 'react-syntax-highlighter/dist/esm/styles/prism';

import {useAppState} from '../../../../../../redux/reducers/app';
import CopyClipboard from '../../../../../CopyClipboard';
import EmptyStateCard from '../../../../../EmptyStateCard';
import LaunchConfigSection from '../LaunchConfigSection';

if (isWin) {
  SyntaxHighlighter.registerLanguage('batch', batch);
} else {
  SyntaxHighlighter.registerLanguage('bash', bash);
}

type Props = {text: string};

/**
 * Show arguments as text for preview and clipboard copying.
 */
export default function ArgumentsPreview({text}: Props) {
  const isDark = useAppState('darkMode');

  return (
    <LaunchConfigSection
      title="Preview"
      description="Preview of the final result to be saved"
      customButton={<CopyClipboard contentToCopy={text} tooltipTitle="Copy Preview to Clipboard" showTooltip />}>
      {isEmpty(text) ? (
        <EmptyStateCard
          className="m-0"
          bodyClassName="py-8"
          icon={<InboxLineIcon size={40} />}
          description="No preview available to display"
        />
      ) : (
        <>
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
            {text}
          </SyntaxHighlighter>
        </>
      )}
    </LaunchConfigSection>
  );
}
