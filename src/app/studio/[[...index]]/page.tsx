'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../sanity/sanity.config'
import Head from 'next/head'

export default function StudioPage() {
    return (
        <>
            <Head>
                {/* Next.js requires this to hide search engine crawlers from the Studio */}
                <meta name="robots" content="noindex" />
            </Head>
            <div className="absolute inset-0 z-[9999] bg-white">
                {/* Studio controls full Viewport */}
                <NextStudio config={config} />
            </div>
        </>
    )
}
