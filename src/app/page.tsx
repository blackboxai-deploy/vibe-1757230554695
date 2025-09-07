'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import the 3D game component to avoid SSR issues
const Game3D = dynamic(() => import('@/components/Game3D'), { ssr: false })

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Loading Screen */}
      <Suspense fallback={
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-b from-purple-900 via-blue-900 to-black">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
              SPACE SHOOTER
            </div>
            <div className="text-xl text-blue-300">Loading 3D Universe...</div>
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      }>
        <Game3D />
      </Suspense>
    </main>
  )
}