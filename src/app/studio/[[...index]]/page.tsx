'use client'

import dynamic from 'next/dynamic'
import config from '../../../sanity/sanity.config'

const NextStudioDynamic = dynamic(
    () => import('next-sanity/studio').then((mod) => mod.NextStudio),
    { ssr: false }
)

export default function StudioPage() {
    return (
        <div className="absolute inset-0 z-[9999] bg-white">
            {/* Sanity Studio Render */}
            <NextStudioDynamic config={config} />
        </div>
    )
}
