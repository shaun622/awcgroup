import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  Home, CalendarDays, Users, Briefcase, Receipt, Settings,
  Sun, Moon, Monitor, ArrowRight,
} from 'lucide-react'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useDivision } from '../../contexts/DivisionContext'
import { useTheme } from '../../contexts/ThemeContext'
import { getDivision } from '../../lib/divisionRegistry'
import { cn } from '../../lib/utils'

export default function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const { available, setActive } = useDivision()
  const { setMode } = useTheme()

  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    setOpen(o => !o)
  }, [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const go = (path) => () => { navigate(path); setOpen(false) }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-elevated border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
        <Command value={value} onValueChange={setValue} label="Command palette" className="flex flex-col">
          <div className="px-4 border-b border-gray-100 dark:border-gray-800">
            <Command.Input
              placeholder="Search or type a command…"
              className="w-full py-4 bg-transparent outline-none text-base placeholder:text-gray-400 dark:text-gray-100"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-4 py-6 text-sm text-gray-500 text-center">No matches.</Command.Empty>

            <Command.Group heading="Switch division">
              {available.map(div => {
                const Icon = div.icon
                return (
                  <Command.Item
                    key={div.slug}
                    value={`switch ${div.name} ${div.slug}`}
                    onSelect={() => { setActive(div.slug); setOpen(false) }}
                    className={itemCls}
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">Switch to {div.name}</span>
                    <span className="text-xs text-gray-400">{div.abbrev}</span>
                  </Command.Item>
                )
              })}
              <Command.Item
                value="switch group view awc all"
                onSelect={() => { setActive('awc'); setOpen(false) }}
                className={itemCls}
              >
                {(() => {
                  const Icon = getDivision('awc').icon
                  return <Icon className="w-4 h-4 text-gray-400" />
                })()}
                <span className="flex-1">Switch to Group view</span>
                <span className="text-xs text-gray-400">All divisions</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Go to">
              <Item icon={Home}        label="Dashboard"  onSelect={go('/')} />
              <Item icon={CalendarDays} label="Schedule"   onSelect={go('/schedule')} />
              <Item icon={Users}       label="Clients"    onSelect={go('/clients')} />
              <Item icon={Briefcase}   label="Jobs"       onSelect={go('/jobs')} />
              <Item icon={Receipt}     label="Quotes"     onSelect={go('/quotes')} />
              <Item icon={Settings}    label="Settings"   onSelect={go('/settings')} />
            </Command.Group>

            <Command.Group heading="Theme">
              <Item icon={Sun}     label="Light mode"  onSelect={() => { setMode('light');  setOpen(false) }} />
              <Item icon={Monitor} label="System mode" onSelect={() => { setMode('system'); setOpen(false) }} />
              <Item icon={Moon}    label="Dark mode"   onSelect={() => { setMode('dark');   setOpen(false) }} />
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
            <span className="flex items-center gap-3">
              <kbd className={kbd}>↑↓</kbd> navigate
              <kbd className={kbd}>↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className={kbd}>esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

const itemCls = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 data-[selected=true]:bg-brand-50 dark:data-[selected=true]:bg-brand-950/40 data-[selected=true]:text-brand-700 dark:data-[selected=true]:text-brand-300'
const kbd = 'px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-800 font-mono text-[10px] text-gray-500 dark:text-gray-400'

function Item({ icon: Icon, label, onSelect }) {
  return (
    <Command.Item value={label.toLowerCase()} onSelect={onSelect} className={itemCls}>
      <Icon className="w-4 h-4 text-gray-400" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 data-[selected=true]:opacity-100" />
    </Command.Item>
  )
}
