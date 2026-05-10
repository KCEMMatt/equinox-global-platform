import './globals.css'
export const metadata = {
  title: 'Equinox Capital',
  description: 'Director portfolio dashboard for property acquisitions, leases, loans and valuations.'
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
