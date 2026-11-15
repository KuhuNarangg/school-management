import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: [
      { find: /^@\/lib\/server\/(.*)$/, replacement: path.resolve(__dirname, 'server/src/utils/$1') },
      { find: /^@\/app\/api\/(.*)$/, replacement: path.resolve(__dirname, 'server/src/routes/$1') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, 'client/src/$1') },
    ],
  },
})
