import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import DesktopNav from './DesktopNav'
import CommandPalette from './CommandPalette'

export default function AppShell() {
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenCommand={() => setCmdOpen(true)} />
      <DesktopNav />
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  )
}
