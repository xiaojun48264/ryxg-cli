import { defineBuildConfig } from 'unbuild'
import { fileURLToPath, URL } from 'node:url'

export default defineBuildConfig({
  entries: ['src/bin/index.ts'],
  outDir: 'dist',
  clean: true,
  alias: {
    '@': fileURLToPath(new URL('src/', import.meta.url)),
  },
  rollup: {
    output: {
      preserveModules: true,
      preserveModulesRoot: 'src',
    },
  },
  failOnWarn: false,
})
