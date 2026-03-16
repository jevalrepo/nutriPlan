import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { ToastContainer } from '../ui/ToastContainer'
import { Modal } from '../ui/Modal'

interface AppLayoutProps {
  children: ReactNode
  showNavbar?: boolean
}

export function AppLayout({ children, showNavbar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      <ToastContainer />
      <Modal />
    </div>
  )
}
