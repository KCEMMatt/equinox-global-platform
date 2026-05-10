import './globals.css'

export const metadata = {
  title: 'Equinox Global Platform',
  description: 'Acquisition intelligence and operating platform for Equinox Global.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
