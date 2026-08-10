import federation from '@originjs/vite-plugin-federation';
import {sentryVitePlugin} from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'electron-vite';
import {resolve} from 'path';

export default defineConfig(({mode}) => {
  const isDev = mode === 'development';

  const disableSentrySourceUpload: boolean = false;

  return {
    main: {
      plugins: [
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: 'lynxhub',
          project: 'lynxhub',
          disable: isDev,
          sourcemaps: {
            disable: disableSentrySourceUpload,
            filesToDeleteAfterUpload: '**/*.map',
          },
        }),
      ],
      build: {
        sourcemap: true,
        rollupOptions: {
          external: isDev ? undefined : ['../../../../extension/src/main/lynxExtension', '../../../../module/src/main'],
          output: {
            format: 'cjs',
          },
        },
      },
      resolve: {
        alias: {
          '@lynx_common': resolve(__dirname, 'src/common'),
          '@lynx_main': resolve(__dirname, 'src/main'),
        },
      },
    },

    preload: {
      build: {
        rollupOptions: {
          output: {
            format: 'cjs',
          },
          input: {
            index: resolve(__dirname, 'src/preload/index.js'),
            webview: resolve(__dirname, 'src/preload/webview.js'),
          },
        },
      },
    },

    renderer: {
      plugins: [
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: 'lynxhub',
          project: 'lynxhub',
          disable: isDev,
          sourcemaps: {
            disable: disableSentrySourceUpload,
            filesToDeleteAfterUpload: '**/*.map',
          },
        }),
        tailwindcss(),
        react(),
        federation({
          name: 'host-app',
          remotes: {nothing: 'nothing.js'},
          shared: ['react', 'react-dom', 'react-redux', '@heroui/react', '@heroui/styles', 'react-aria'],
        }),
      ],
      resolve: {
        alias: {
          '@lynx_module': resolve(__dirname, 'module/src'),
          '@lynx_extension': resolve(__dirname, 'extension/src'),
          '@lynx_common': resolve(__dirname, 'src/common'),
          '@lynx': resolve(__dirname, 'src/renderer/mainWindow'),
          '@lynx_shared': resolve(__dirname, 'src/renderer/shared'),
          '@lynx_assets': resolve(__dirname, 'src/renderer/shared/assets'),
        },
      },
      base: '',
      define: {
        'process.env': {},
      },
      build: {
        sourcemap: true,
        rollupOptions: {
          external: isDev
            ? undefined
            : ['../../../../../module/src/renderer', '../../../../../extension/src/renderer/Extension'],
          input: {
            index: resolve(__dirname, 'src/renderer/index.html'),
            loading: resolve(__dirname, 'src/renderer/loading.html'),
            contextMenu: resolve(__dirname, 'src/renderer/contextMenu.html'),
            toast: resolve(__dirname, 'src/renderer/toast.html'),
            shareScreen: resolve(__dirname, 'src/renderer/shareScreen.html'),
            linkPreview: resolve(__dirname, 'src/renderer/linkPreview.html'),
          },
        },
        target: 'esnext',
        minify: false,
        cssCodeSplit: false,
        modulePreload: false,
      },
      publicDir: resolve(__dirname, 'src/renderer/shared/public'),
    },
  };
});
