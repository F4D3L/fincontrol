'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, MONTHS_PT } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MonthReport {
  month: string
  monthLabel: string
  income: number
  expense: number
  balance: number
  categories: { name: string; value: number; color: string }[]
}

export default function ReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<MonthReport[]>([])
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const now = new Date()

    // Fetch all 6 months in parallel
    const monthReports = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .gte('date', `${ym}-01`)
          .lte('date', `${ym}-31`)
          .then(({ data: txData }) => {
            const income = (txData || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
            const expense = (txData || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
            const catMap: Record<string, { name: string; value: number; color: string }> = {}
            ;(txData || []).filter(t => t.type === 'expense').forEach(t => {
              const key = t.category_id || '__none__'
              if (!catMap[key]) catMap[key] = { name: t.category?.name || 'Sem categoria', value: 0, color: t.category?.color || '#6b7280' }
              catMap[key].value += Number(t.amount)
            })
            return {
              month: ym,
              monthLabel: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`,
              income, expense, balance: income - expense,
              categories: Object.values(catMap).sort((a, b) => b.value - a.value)
            }
          })
      })
    )

    setReports(monthReports)
    setLoading(false)
  }

  const current = reports[selectedMonth]
  const previous = reports[selectedMonth + 1]

  function pctChange(curr: number, prev: number): number | null {
    if (!prev) return null
    return ((curr - prev) / prev) * 100
  }

  const chartData = [...reports].reverse().map(r => ({
    month: r.monthLabel.substring(0, 3),
    Receitas: r.income,
    Despesas: r.expense,
    Saldo: r.balance,
  }))

  return (
    <div>
      <Header title="Relatórios" subtitle="Análise mensal das suas finanças" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : reports.length === 0 ? (
        <Card className="text-center py-12"><p className="text-gray-500">Nenhum dado disponível ainda</p></Card>
      ) : (
        <>
          {/* Month selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {reports.map((r, i) => (
              <button key={r.month} onClick={() => setSelectedMonth(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedMonth === i ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                {r.monthLabel}
              </button>
            ))}
          </div>

          {current && (
            <>
              {/* KPIs vs previous month */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Receitas', value: current.income, prev: previous?.income, color: 'text-emerald-400', positive: true },
                  { label: 'Despesas', value: current.expense, prev: previous?.expense, color: 'text-red-400', positive: false },
                  { label: 'Saldo', value: current.balance, prev: previous?.balance, color: current.balance >= 0 ? 'text-white' : 'text-red-400', positive: true },
                ].map(s => {
                  const pct = s.prev !== undefined ? pctChange(s.value, s.prev) : null
                  const improved = s.positive ? (pct !== null && pct >= 0) : (pct !== null && pct <= 0)
                  return (
                    <Card key={s.label}>
                      <p className="text-gray-400 text-xs mb-1">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
                      {pct !== null && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Math.abs(pct) < 0.1 ? <Minus size={12} /> : pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          <span>{Math.abs(pct).toFixed(1)}% vs mês anterior</span>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>

              {/* Bar Chart */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Comparativo dos últimos 6 meses</CardTitle>
                </CardHeader>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb' }} formatter={(value) => [formatCurrency(Number(value)), '']} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Category breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Despesas por categoria — {current.monthLabel}</CardTitle>
                  </CardHeader>
                  {current.categories.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-6">Sem despesas neste mês</p>
                  ) : (
                    <div className="space-y-3">
                      {current.categories.map((cat, i) => {
                        const pct = (cat.value / current.expense) * 100
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-gray-300">{cat.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-xs">{pct.toFixed(1)}%</span>
                                <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>

                {/* Month over month comparison */}
                {previous && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Comparação com {previous.monthLabel}</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                      {[
                        { label: 'Receitas', curr: current.income, prev: previous.income, goodIfPositive: true },
                        { label: 'Despesas', curr: current.expense, prev: previous.expense, goodIfPositive: false },
                        { label: 'Saldo', curr: current.balance, prev: previous.balance, goodIfPositive: true },
                      ].map(item => {
                        const diff = item.curr - item.prev
                        const isGood = item.goodIfPositive ? diff >= 0 : diff <= 0
                        return (
                          <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <div className="text-right">
                              <p className="text-white font-semibold text-sm">{formatCurrency(item.curr)}</p>
                              <p className={`text-xs ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff >= 0 ? '+' : ''}{formatCurrency(diff)} vs anterior
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
