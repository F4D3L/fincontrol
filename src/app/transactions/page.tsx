'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency, getCurrentMonth, getMonthEnd, MONTHS_PT } from '@/lib/utils'
import { Plus, Pencil, Trash2, Tag, Settings } from 'lucide-react'
import type { Transaction, Category } from '@/types'

const PRESET_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#84cc16','#f97316','#06b6d4']

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [filter, setFilter] = useState({ type: 'all', month: getCurrentMonth(), category: 'all' })

  // Form state
  const [form, setForm] = useState({ amount: '', type: 'expense', category_id: '', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false })
  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1', type: 'expense' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [ym_start, ym_end] = [`${filter.month}-01`, getMonthEnd(filter.month)]
    let txQuery = supabase.from('transactions').select('*, category:categories(*)').eq('user_id', user.id).gte('date', ym_start).lte('date', ym_end).order('date', { ascending: false })
    if (filter.type !== 'all') txQuery = txQuery.eq('type', filter.type)
    if (filter.category !== 'all') txQuery = txQuery.eq('category_id', filter.category)

    const [{ data }, { data: cats }] = await Promise.all([
      txQuery,
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    ])
    setTransactions(data || [])
    setCategories(cats || [])
    setLoading(false)
  }

  async function saveTx() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = { user_id: user.id, amount: parseFloat(form.amount), type: form.type, category_id: form.category_id || null, description: form.description, date: form.date, is_recurring: form.is_recurring }
      if (editTx) {
        await supabase.from('transactions').update(payload).eq('id', editTx.id)
      } else {
        await supabase.from('transactions').insert(payload)
      }
      setModalOpen(false)
      setEditTx(null)
      setForm({ amount: '', type: 'expense', category_id: '', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false })
      load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteTx(id: string) {
    if (!confirm('Excluir esta transação?')) return
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  async function saveCat() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('categories').insert({ user_id: user.id, ...catForm })
    setCatModalOpen(false)
    setCatForm({ name: '', color: '#6366f1', type: 'expense' })
    load()
  }

  async function deleteCat(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    await supabase.from('categories').delete().eq('id', id)
    load()
  }

  function openNew() {
    setEditTx(null)
    setForm({ amount: '', type: 'expense', category_id: '', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false })
    setModalOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setForm({ amount: String(tx.amount), type: tx.type, category_id: tx.category_id || '', description: tx.description, date: tx.date, is_recurring: tx.is_recurring })
    setModalOpen(true)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`
    return { val, label }
  })

  return (
    <div>
      <Header
        title="Transações"
        subtitle="Gerencie suas receitas e despesas"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCatModalOpen(true)}>
              <Tag size={14} /> Categorias
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus size={14} /> Nova transação
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Receitas', value: income, color: 'text-emerald-400' },
          { label: 'Despesas', value: expense, color: 'text-red-400' },
          { label: 'Saldo', value: income - expense, color: income - expense >= 0 ? 'text-white' : 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="py-4">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-3">
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" value={filter.month} onChange={e => setFilter(p => ({ ...p, month: e.target.value }))}>
            {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" value={filter.category} onChange={e => setFilter(p => ({ ...p, category: e.target.value }))}>
            <option value="all">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </Card>

      {/* Transactions List */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-3">Nenhuma transação encontrada</p>
            <Button size="sm" onClick={openNew}><Plus size={14} /> Adicionar</Button>
          </div>
        ) : (
          <div className="space-y-0">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between py-3 ${i < transactions.length - 1 ? 'border-b border-gray-800' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: (tx.category?.color || '#6366f1') + '22', color: tx.category?.color || '#6366f1' }}>
                    {tx.description.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tx.category && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: (tx.category.color || '#6366f1') + '22', color: tx.category.color || '#6366f1' }}>
                          {tx.category.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      {tx.is_recurring && <span className="text-xs text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded-md">Recorrente</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => deleteTx(tx.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Transaction Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTx ? 'Editar transação' : 'Nova transação'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${form.type === t
                  ? t === 'income' ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : 'bg-red-600/20 border-red-600 text-red-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                {t === 'income' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
          <Input label="Descrição" placeholder="Ex: Supermercado" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <Input label="Valor (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <Input label="Data" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          <Select label="Categoria" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
            <option value="">Sem categoria</option>
            {categories.filter(c => c.type === form.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))} className="rounded" />
            Transação recorrente
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveTx} disabled={!form.description || !form.amount}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Categories Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Gerenciar categorias">
        <div className="space-y-4">
          <div className="space-y-3">
            <Input label="Nome da categoria" placeholder="Ex: Alimentação" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setCatForm(p => ({ ...p, type: t }))}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${catForm.type === t ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  {t === 'income' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setCatForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full transition-transform ${catForm.color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={saveCat} disabled={!catForm.name}><Plus size={14} /> Criar categoria</Button>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Suas categorias</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-3">Nenhuma categoria criada</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-300">{cat.name}</span>
                      <span className="text-xs text-gray-600">({cat.type === 'income' ? 'receita' : 'despesa'})</span>
                    </div>
                    <button onClick={() => deleteCat(cat.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
