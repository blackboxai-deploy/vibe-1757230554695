import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3D Space Shooter',
  description: 'An immersive 3D space shooter game built with Three.js and React',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  )
}