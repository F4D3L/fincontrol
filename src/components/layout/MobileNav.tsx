'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Receipt, CreditCard, Target, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/fixed-bills', label: 'Contas', icon: Receipt },
  { href: '/debts', label: 'Dívidas', icon: CreditCard },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950 border-t border-gray-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                active ? 'text-indigo-400' : 'text-gray-500 active:text-gray-300'
              )}
            >
              <Icon size={20} />
              <span className="text-[9px] font-medium truncate w-full text-center leading-tight">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
