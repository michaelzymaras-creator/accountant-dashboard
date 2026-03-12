import { Cinzel, Geist } from 'next/font/google'
import "./globals.css"

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400','600']
})

const geist = Geist({
  subsets: ['latin']
})

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}