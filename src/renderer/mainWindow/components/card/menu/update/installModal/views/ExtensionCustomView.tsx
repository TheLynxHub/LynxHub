import {createElement, memo} from 'react';

import {useInstallStore} from '../store';

/**
 * Renders an external custom React component injected directly by a LynxHub extension.
 */
function ExtensionCustomView() {
  const content = useInstallStore(s => s.extensionCustomContent);

  return content ? createElement(content) : null;
}

export default memo(ExtensionCustomView);
