import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date + 'T00:00:00'))
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Returns the actual last day of a YYYY-MM string (e.g. "2026-04" → "2026-04-30")
export function getMonthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate() // day 0 of next month = last day of current month
  return `${ym}-${String(lastDay).padStart(2, '0')}`
}

export function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  if (dueDay >= currentDay) {
    return dueDay - currentDay
  } else {
    return daysInMonth - currentDay + dueDay
  }
}

export function getBillStatus(dueDay: number, isPaid: boolean): 'paid' | 'upcoming' | 'due-soon' | 'overdue' {
  if (isPaid) return 'paid'
  const daysUntil = getDaysUntilDue(dueDay)
  const today = new Date().getDate()
  if (dueDay < today) return 'overdue'
  if (daysUntil <= 3) return 'due-soon'
  return 'upcoming'
}

export function getDebtProgress(paid: number, total: number): number {
  if (total === 0) return 0
  return Math.min((paid / total) * 100, 100)
}

export function getGoalProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min((current / target) * 100, 100)
}

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
