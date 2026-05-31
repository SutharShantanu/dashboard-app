/**
 * Sanity Studio page — Server Component wrapper.
 * metadata/viewport must stay in a Server Component (Next.js requirement).
 * The actual Studio UI is rendered by a separate Client Component below.
 */

import { metadata as sanityMetadata, viewport as sanityViewport } from 'next-sanity/studio'
import StudioClient from './StudioClient'

export const metadata = sanityMetadata
export const viewport = sanityViewport

export default function StudioPage() {
  return <StudioClient />
}
