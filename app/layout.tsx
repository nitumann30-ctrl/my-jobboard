import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nitu Mann | Job Search Operating System',
  description: 'Full web app version of Nitu Mann's job board, outreach CRM, and 24/7 job watcher architecture.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
