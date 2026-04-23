import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/')

export default {
  plugins: {
    tailwindcss: { config: `${here}/tailwind.config.js` },
    autoprefixer: {},
  },
}
