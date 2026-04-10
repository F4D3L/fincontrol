'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, getCurrentMonth, MONTHS_PT, getBillStatus, getDaysUntilDue } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'
import type { Transaction, FixedBill, FixedBillPayment, Goal } from '@/types'

interface MonthData { month: string; income: number; expense: number }

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16']

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState({ income: 0, expense: 0 })
  const [balance, setBalance] = useState(0)
  const [chartData, setChartData] = useState<MonthData[]>([])
  const [categoryData, setCategoryData] = useState<{name:string; value:number; color:string}[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [alertBills, setAlertBills] = useState<(FixedBill & {status: string; daysUntil: number; isPaid: boolean})[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const user = session.user

    const now = new Date()
    const currentMonth = getCurrentMonth()

    // Fetch all independent data in parallel
    const [
      { data: txData },
      { data: bills },
      { data: goalsData },
      months,
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .gte('date', `${currentMonth}-01`)
        .lte('date', `${currentMonth}-31`)
        .order('date', { ascending: false }),
      supabase
        .from('fixed_bills')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(3),
      Promise.all(
        Array.from({ length: 6 }, (_, idx) => {
          const i = 5 - idx
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .gte('date', `${ym}-01`)
            .lte('date', `${ym}-31`)
            .then(({ data: mTx }) => {
              const mIncome = (mTx || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
              const mExpense = (mTx || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
              return { month: MONTHS_PT[d.getMonth()].substring(0, 3), income: mIncome, expense: mExpense }
            })
        })
      ),
    ])

    // Bill payments depend on bill IDs — only sequential step remaining
    const { data: payments } = await supabase
      .from('fixed_bill_payments')
      .select('*')
      .eq('month', currentMonth)
      .in('fixed_bill_id', (bills || []).map(b => b.id))

    // Process transactions
    const income = (txData || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = (txData || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    setMonthData({ income, expense })
    setBalance(income - expense)
    setRecentTx((txData || []).slice(0, 5))

    const catMap: Record<string, { name: string; value: number; color: string }> = {}
    ;(txData || []).filter(t => t.type === 'expense').forEach((t, i) => {
      const key = t.category_id || 'sem-categoria'
      const name = t.category?.name || 'Sem categoria'
      const color = t.category?.color || COLORS[i % COLORS.length]
      if (!catMap[key]) catMap[key] = { name, value: 0, color }
      catMap[key].value += Number(t.amount)
    })
    setCategoryData(Object.values(catMap).sort((a, b) => b.value - a.value).slice(0, 6))

    setChartData(months)

    const billsWithStatus = (bills || []).map(bill => {
      const payment = payments?.find(p => p.fixed_bill_id === bill.id)
      const isPaid = payment?.paid ?? false
      const status = getBillStatus(bill.due_day, isPaid)
      const daysUntil = getDaysUntilDue(bill.due_day)
      return { ...bill, status, daysUntil, isPaid }
    }).filter(b => b.status !== 'paid').sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 4)
    setAlertBills(billsWithStatus)

    setGoals(goalsData || [])
    setLoading(false)
  }

  const statusColors: Record<string, string> = {
    'overdue': 'text-red-400 bg-red-900/20 border-red-800',
    'due-soon': 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
    'upcoming': 'text-blue-400 bg-blue-900/20 border-blue-800',
  }
  const statusLabels: Record<string, string> = {
    'overdue': 'Atrasada',
    'due-soon': 'Vence em breve',
    'upcoming': 'A vencer',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`${MONTHS_PT[new Date().getMonth()]} ${new Date().getFullYear()}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-indigo-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Saldo do Mês</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-gray-500 text-xs mt-1">Receitas − Despesas</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Wallet size={22} className="text-indigo-400" />
            </div>
          </div>
        </Card>

        <Card className="border-emerald-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Receitas</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthData.income)}</p>
              <p className="text-gray-500 text-xs mt-1">Entradas este mês</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <TrendingUp size={22} className="text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="border-red-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Despesas</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(monthData.expense)}</p>
              <p className="text-gray-500 text-xs mt-1">Saídas este mês</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
              <TrendingDown size={22} className="text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução dos últimos 6 meses</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb' }}
                formatter={(value) => [formatCurrency(Number(value)), '']}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Receitas" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Despesas" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb' }}
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }} />
                      <span className="text-gray-400 truncate max-w-[100px]">{cat.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">Sem despesas este mês</div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transações recentes</CardTitle>
            <Link href="/transactions" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
              Ver todas <ChevronRight size={14} />
            </Link>
          </CardHeader>
          {recentTx.length > 0 ? (
            <div className="space-y-3">
              {recentTx.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: (tx.category?.color || '#6366f1') + '33', color: tx.category?.color || '#6366f1' }}
                    >
                      {tx.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.category?.name || 'Sem categoria'} · {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-600">
              <p className="text-sm">Nenhuma transação este mês</p>
              <Link href="/transactions" className="text-indigo-400 text-xs mt-1 hover:text-indigo-300">Adicionar transação</Link>
            </div>
          )}
        </Card>

        {/* Alerts + Goals */}
        <div className="space-y-4">
          {/* Bill Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas de contas</CardTitle>
              <Link href="/fixed-bills" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                Ver <ChevronRight size={14} />
              </Link>
            </CardHeader>
            {alertBills.length > 0 ? (
              <div className="space-y-2">
                {alertBills.map(bill => (
                  <div key={bill.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${statusColors[bill.status]}`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span className="font-medium truncate max-w-[100px]">{bill.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold">{formatCurrency(bill.amount)}</p>
                      <p className="opacity-70">{statusLabels[bill.status]}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm text-center py-4">Nenhum alerta 🎉</p>
            )}
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Metas ativas</CardTitle>
              <Link href="/goals" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                Ver <ChevronRight size={14} />
              </Link>
            </CardHeader>
            {goals.length > 0 ? (
              <div className="space-y-3">
                {goals.map(goal => {
                  const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-300 font-medium truncate">{goal.name}</span>
                        <span className="text-gray-500 ml-2">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: goal.color || '#6366f1' }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                        <span>{formatCurrency(Number(goal.current_amount))}</span>
                        <span>{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm text-center py-4">Nenhuma meta criada</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
