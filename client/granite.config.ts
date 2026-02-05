import { defineConfig } from '@apps-in-toss/web-framework';

export default defineConfig({
  appId: 'one-vs-many-omok',
  appName: '일대다 오목',
  webViewProps: {
    type: 'game',
  },
  build: {
    outDir: 'dist',
  },
});
