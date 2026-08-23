import {__federation_method_getRemote, __federation_method_setRemote} from '__federation__';
import {isDev} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import {captureException} from '@sentry/electron/renderer';
import {compact} from 'lodash-es';

import {addRendererFailure} from '../failures';
import initializeExtensions from './loader';
import {ExtensionImport_Renderer} from './types';

// ─── Module Federation type wrappers ─────────────────────────────────────────
// These cast the untyped federation globals to their correct signatures so the
// rest of this module can remain fully typed.

/** Configuration required by `__federation_method_setRemote`. */
type RemotesConfig = {
  format?: 'esm' | 'systemjs' | 'var';
  from?: 'vite' | 'webpack';
  url: string;
};

/** Registers a remote entry so it can later be retrieved by name. */
type SetRemoteModule = (remotesName: string, remotesConfig: RemotesConfig) => void;

/**
 * Dynamically imports and returns a named export from a registered remote.
 * Returns a promise that resolves to the typed extension entry point.
 */
type GetRemoteModule = (remoteName: string, componentName: string) => Promise<ExtensionImport_Renderer>;

const setRemote: SetRemoteModule = __federation_method_setRemote;
const getRemote: GetRemoteModule = __federation_method_getRemote;

// ─── Extension Loader ─────────────────────────────────────────────────────────

/**
 * Discovers, imports, and initializes all renderer-side extensions.
 *
 * **Dev mode**: Attempts a single hot-import of the local `@lynx_extension`
 * alias. If the alias is not configured (i.e. no extension is being developed),
 * it silently skips loading.
 *
 * **Production mode**: Fetches the list of plugin server addresses via IPC,
 * filters to `extension` type, constructs the remote entry URL for each one,
 * registers them with Module Federation (`setRemote`), then bulk-imports them
 * (`getRemote`). Individual failures are captured to Sentry and skipped so
 * that a single broken extension cannot block the others.
 *
 * After all imports are resolved, `initializeExtensions` is called to run each
 * extension's `InitialExtensions` entry point against the renderer API.
 */
export async function loadExtensions() {
  const cliArgs = await applicationIpc.invoke.getCliArgs();
  if (cliArgs?.unloadPlugins) {
    return;
  }

  let importedExtensions: (ExtensionImport_Renderer | null)[];
  let extensionIds: string[];

  if (isDev()) {
    // ── Development shortcut ─────────────────────────────────────────────────
    // Import the local dev extension directly via the Vite alias so developers
    // get instant feedback without a running plugin server.
    try {
      const extension = await import(/* @vite-ignore */ '@lynx_extension/renderer/Extension');
      importedExtensions = [extension];
      extensionIds = ['dev-extension'];
    } catch {
      console.log('No dev extension found, skipping...');
      importedExtensions = [];
      extensionIds = [];
    }
  } else {
    // ── Production: load from live plugin servers ────────────────────────────
    const pluginAddresses = await pluginsIpc.getAddresses();

    const extensionEntryUrls = pluginAddresses
      .filter(item => item.type === 'extension')
      .map(({address}) => `${address}/scripts/renderer/rendererEntry.mjs`);

    // Derive a stable, unique ID from each entry URL by extracting the host
    // segment that sits between the protocol and the `/scripts` path.
    // e.g. "http://127.0.0.1:5001/scripts/..." → "127.0.0.1:5001"
    extensionIds = compact(
      extensionEntryUrls.map(url => {
        const withoutProtocol = url.replace(/^[^:]+:\/\//, '');
        const match = withoutProtocol.match(/^([^/]+)\/scripts/);
        return match ? match[1] : null;
      }),
    );

    // Register remotes before importing so Module Federation can resolve them.
    extensionEntryUrls.forEach((url, index) => setRemote(extensionIds[index], {format: 'esm', from: 'vite', url}));

    // Import all remotes concurrently; null-out any that fail so `compact`
    // below can filter them before passing to the initializer.
    importedExtensions = await Promise.all(
      extensionIds.map(async folderName => {
        try {
          return await getRemote(folderName, 'Extension');
        } catch (error: any) {
          console.error('Failed to load extension renderer entry:', folderName, error);
          captureException(error);
          addRendererFailure(folderName, `Renderer load error: ${error?.message || error}`);
          return null;
        }
      }),
    );
  }

  // Pair each successfully-loaded module with its ID before initialization.
  const validExtensions = compact(importedExtensions).map((module, index) => ({
    id: extensionIds[index],
    module,
  }));

  initializeExtensions(validExtensions);
}
