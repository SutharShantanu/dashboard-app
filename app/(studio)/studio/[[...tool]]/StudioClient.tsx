'use client'

import dynamic from 'next/dynamic'

// NextStudio and sanity.config use React.createContext which is client-only.
// ssr: false ensures they are NEVER evaluated during server-side rendering
// or static generation, preventing the "createContext is not a function" error.
const NextStudioNoSSR = dynamic(
  () => import('next-sanity/studio').then((mod) => mod.NextStudio),
  { ssr: false, loading: () => null }
)

export default function StudioClient() {
  // Config is imported inline inside the dynamic callback so it's also
  // excluded from the SSR bundle entirely.
  return <NextStudioNoSSR config={require('../../../../sanity.config').default} />
}
