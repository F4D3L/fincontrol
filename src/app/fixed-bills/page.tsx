'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency, getCurrentMonth, getBillStatus, getDaysUntilDue } from '@/lib/utils'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, AlertCircle, Clock, CheckCheck } from 'lucide-react'
import type { FixedBill, Category } from '@/types'

type BillWithStatus = FixedBill & { status: string; isPaid: boolean; daysUntil: number }

export default function FixedBillsPage() {
  const supabase = createClient()
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editBill, setEditBill] = useState<FixedBill | null>(null)
  const [form, setForm] = useState({ name: '', amount: '', due_day: '1', is_auto_debit: false, category_id: '', notes: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const currentMonth = getCurrentMonth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const user = session.user

    // Bills and categories are independent — fetch in parallel
    const [{ data: billsData }, { data: cats }] = await Promise.all([
      supabase.from('fixed_bills').select('*, category:categories(*)').eq('user_id', user.id).order('due_day'),
      supabase.from('categories').select('*').eq('user_id', user.id),
    ])

    // Payments depend on bill IDs — only sequential step
    const { data: payments } = await supabase
      .from('fixed_bill_payments')
      .select('*')
      .eq('month', currentMonth)
      .in('fixed_bill_id', (billsData || []).map(b => b.id))

    const enriched: BillWithStatus[] = (billsData || []).map(bill => {
      const payment = payments?.find(p => p.fixed_bill_id === bill.id)
      const isPaid = payment?.paid ?? false
      const status = getBillStatus(bill.due_day, isPaid)
      const daysUntil = getDaysUntilDue(bill.due_day)
      return { ...bill, isPaid, status, daysUntil }
    })

    setBills(enriched)
    setCategories(cats || [])
    setLoading(false)
  }

  async function togglePaid(bill: BillWithStatus) {
    const newPaid = !bill.isPaid
    const { data: existing } = await supabase.from('fixed_bill_payments').select('id').eq('fixed_bill_id', bill.id).eq('month', currentMonth).single()
    if (existing) {
      await supabase.from('fixed_bill_payments').update({ paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null }).eq('id', existing.id)
    } else {
      await supabase.from('fixed_bill_payments').insert({ fixed_bill_id: bill.id, month: currentMonth, paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null, amount: bill.amount })
    }
    load()
  }

  async function saveBill() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user
      const payload = { user_id: user.id, name: form.name, amount: parseFloat(form.amount), due_day: parseInt(form.due_day), is_auto_debit: form.is_auto_debit, category_id: form.category_id || null, notes: form.notes || null, is_active: form.is_active }
      if (editBill) {
        await supabase.from('fixed_bills').update(payload).eq('id', editBill.id)
      } else {
        await supabase.from('fixed_bills').insert(payload)
      }
      setModalOpen(false)
      setEditBill(null)
      resetForm()
      load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteBill(id: string) {
    if (!confirm('Excluir esta conta fixa?')) return
    await supabase.from('fixed_bills').delete().eq('id', id)
    load()
  }

  function resetForm() {
    setForm({ name: '', amount: '', due_day: '1', is_auto_debit: false, category_id: '', notes: '', is_active: true })
  }

  function openEdit(bill: FixedBill) {
    setEditBill(bill)
    setForm({ name: bill.name, amount: String(bill.amount), due_day: String(bill.due_day), is_auto_debit: bill.is_auto_debit, category_id: bill.category_id || '', notes: bill.notes || '', is_active: bill.is_active })
    setModalOpen(true)
  }

  const totalFixed = bills.filter(b => b.is_active).reduce((s, b) => s + Number(b.amount), 0)
  const totalPaid = bills.filter(b => b.isPaid).reduce((s, b) => s + Number(b.amount), 0)
  const totalPending = totalFixed - totalPaid

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    paid: { icon: CheckCheck, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/50', label: 'Paga' },
    upcoming: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/50', label: 'A vencer' },
    'due-soon': { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/50', label: 'Vence em breve' },
    overdue: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/50', label: 'Atrasada' },
  }

  return (
    <div>
      <Header
        title="Contas Fixas"
        subtitle="Gerencie seus compromissos mensais"
        actions={<Button size="sm" onClick={() => { resetForm(); setEditBill(null); setModalOpen(true) }}><Plus size={14} /> Nova conta</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total mensal', value: totalFixed, color: 'text-white' },
          { label: 'Já pago', value: totalPaid, color: 'text-emerald-400' },
          { label: 'Pendente', value: totalPending, color: 'text-yellow-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
          </Card>
        ))}
      </div>

      {/* Bills Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : bills.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-3">Nenhuma conta fixa cadastrada</p>
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Adicionar</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bills.map(bill => {
            const sc = statusConfig[bill.status]
            const StatusIcon = sc.icon
            return (
              <Card key={bill.id} className={`border ${sc.bg} transition-all`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePaid(bill)} className={`flex-shrink-0 transition-colors ${bill.isPaid ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}>
                      {bill.isPaid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div>
                      <p className={`font-semibold text-sm ${bill.isPaid ? 'line-through text-gray-500' : 'text-white'}`}>{bill.name}</p>
                      <p className="text-xs text-gray-500">Vence dia {bill.due_day}{bill.is_auto_debit ? ' · Débito automático' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(bill)} className="p-1 text-gray-600 hover:text-indigo-400 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => deleteBill(bill.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{formatCurrency(Number(bill.amount))}</p>
                    {bill.category && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md mt-1 inline-block" style={{ backgroundColor: (bill.category.color || '#6366f1') + '22', color: bill.category.color || '#6366f1' }}>
                        {bill.category.name}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${sc.color} ${sc.bg} border`}>
                    <StatusIcon size={12} />
                    {bill.isPaid ? 'Paga' : bill.status === 'overdue' ? 'Atrasada' : bill.status === 'due-soon' ? `${bill.daysUntil}d` : `${bill.daysUntil}d`}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editBill ? 'Editar conta fixa' : 'Nova conta fixa'}>
        <div className="space-y-4">
          <Input label="Nome da conta" placeholder="Ex: Aluguel, Netflix, Academia" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Valor mensal (R$)" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} />
          <Select label="Categoria" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Textarea label="Observações (opcional)" placeholder="Detalhes adicionais..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.is_auto_debit} onChange={e => setForm(p => ({ ...p, is_auto_debit: e.target.checked }))} />
              Débito automático
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
              Conta ativa
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveBill} disabled={!form.name || !form.amount}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
