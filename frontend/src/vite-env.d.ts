/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IKUAI_TOKEN: string
  readonly VITE_IKUAI_BASE: string
  readonly VITE_POLL_MS: string
  readonly VITE_ALLOW_MOCK: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
