import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TUNES - Music Recording Studio',
  description: 'Record music with beats and effects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

