'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { formatCurrency, getDebtProgress } from '@/lib/utils'
import { Plus, Pencil, Trash2, CheckCircle2, CreditCard } from 'lucide-react'
import type { Debt } from '@/types'

export default function DebtsPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [form, setForm] = useState({
    name: '', creditor: '', total_amount: '', paid_amount: '0',
    total_installments: '', current_installment: '0', installment_amount: '',
    interest_rate: '', due_day: '', start_date: new Date().toISOString().split('T')[0], notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [showPaid, setShowPaid] = useState(false)

  useEffect(() => { load() }, [showPaid])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const user = session.user
    let query = supabase.from('debts').select('*').eq('user_id', user.id)
    if (!showPaid) query = query.eq('is_paid', false)
    query = query.order('created_at', { ascending: false })
    const { data } = await query
    setDebts(data || [])
    setLoading(false)
  }

  async function saveDebt() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user
      const payload = {
        user_id: user.id,
        name: form.name,
        creditor: form.creditor || null,
        total_amount: parseFloat(form.total_amount),
        paid_amount: parseFloat(form.paid_amount) || 0,
        total_installments: form.total_installments ? parseInt(form.total_installments) : null,
        current_installment: form.current_installment ? parseInt(form.current_installment) : 0,
        installment_amount: form.installment_amount ? parseFloat(form.installment_amount) : null,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
        due_day: form.due_day ? parseInt(form.due_day) : null,
        start_date: form.start_date,
        notes: form.notes || null,
      }
      if (editDebt) {
        await supabase.from('debts').update(payload).eq('id', editDebt.id)
      } else {
        await supabase.from('debts').insert(payload)
      }
      setModalOpen(false)
      setEditDebt(null)
      resetForm()
      load()
    } finally {
      setSaving(false)
    }
  }

  async function markPaid(id: string) {
    if (!confirm('Marcar dívida como quitada?')) return
    await supabase.from('debts').update({ is_paid: true, paid_amount: debts.find(d => d.id === id)?.total_amount }).eq('id', id)
    load()
  }

  async function deleteDebt(id: string) {
    if (!confirm('Excluir esta dívida?')) return
    await supabase.from('debts').delete().eq('id', id)
    load()
  }

  function resetForm() {
    setForm({ name: '', creditor: '', total_amount: '', paid_amount: '0', total_installments: '', current_installment: '0', installment_amount: '', interest_rate: '', due_day: '', start_date: new Date().toISOString().split('T')[0], notes: '' })
  }

  function openEdit(debt: Debt) {
    setEditDebt(debt)
    setForm({
      name: debt.name, creditor: debt.creditor || '', total_amount: String(debt.total_amount), paid_amount: String(debt.paid_amount),
      total_installments: String(debt.total_installments || ''), current_installment: String(debt.current_installment || 0),
      installment_amount: String(debt.installment_amount || ''), interest_rate: String(debt.interest_rate || ''),
      due_day: String(debt.due_day || ''), start_date: debt.start_date, notes: debt.notes || ''
    })
    setModalOpen(true)
  }

  const totalDebt = debts.filter(d => !d.is_paid).reduce((s, d) => s + Number(d.total_amount), 0)
  const totalPaid = debts.filter(d => !d.is_paid).reduce((s, d) => s + Number(d.paid_amount), 0)
  const totalRemaining = totalDebt - totalPaid

  return (
    <div>
      <Header
        title="Dívidas"
        subtitle="Acompanhe e controle suas dívidas"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowPaid(p => !p)}>
              {showPaid ? 'Ocultar quitadas' : 'Ver quitadas'}
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setEditDebt(null); setModalOpen(true) }}>
              <Plus size={14} /> Nova dívida
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total em dívidas', value: totalDebt, color: 'text-white' },
          { label: 'Total pago', value: totalPaid, color: 'text-emerald-400' },
          { label: 'Ainda deve', value: totalRemaining, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
          </Card>
        ))}
      </div>

      {/* Debts List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : debts.length === 0 ? (
        <Card className="text-center py-12">
          <CreditCard size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">{showPaid ? 'Nenhuma dívida encontrada' : 'Nenhuma dívida ativa 🎉'}</p>
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Adicionar</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map(debt => {
            const progress = getDebtProgress(Number(debt.paid_amount), Number(debt.total_amount))
            const remaining = Number(debt.total_amount) - Number(debt.paid_amount)
            return (
              <Card key={debt.id} className={debt.is_paid ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{debt.name}</h3>
                      {debt.is_paid && <span className="text-xs text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-800/50">Quitada</span>}
                    </div>
                    {debt.creditor && <p className="text-gray-500 text-xs mt-0.5">Credor: {debt.creditor}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {debt.total_installments && <span>{debt.current_installment}/{debt.total_installments} parcelas</span>}
                      {debt.interest_rate && <span>{debt.interest_rate}% a.m.</span>}
                      {debt.due_day && <span>Vence dia {debt.due_day}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!debt.is_paid && (
                      <button onClick={() => markPaid(debt.id)} className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors" title="Marcar como quitada">
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button onClick={() => openEdit(debt)} className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => deleteDebt(debt.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progresso de quitação</span>
                    <span className="text-white font-medium">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, #6366f1, #8b5cf6)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pago: <span className="text-emerald-400 font-medium">{formatCurrency(Number(debt.paid_amount))}</span></span>
                    <span>Restante: <span className="text-red-400 font-medium">{formatCurrency(remaining)}</span></span>
                    <span>Total: <span className="text-white font-medium">{formatCurrency(Number(debt.total_amount))}</span></span>
                  </div>
                </div>

                {debt.installment_amount && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Parcela mensal</span>
                    <span className="text-white font-semibold text-sm">{formatCurrency(Number(debt.installment_amount))}</span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editDebt ? 'Editar dívida' : 'Nova dívida'}>
        <div className="space-y-3">
          <Input label="Nome da dívida" placeholder="Ex: Empréstimo pessoal, Cartão XYZ" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Credor (opcional)" placeholder="Ex: Banco Itaú, familiar" value={form.creditor} onChange={e => setForm(p => ({ ...p, creditor: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor total (R$)" type="number" min="0" step="0.01" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} />
            <Input label="Já pago (R$)" type="number" min="0" step="0.01" value={form.paid_amount} onChange={e => setForm(p => ({ ...p, paid_amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total de parcelas" type="number" min="1" placeholder="Ex: 12" value={form.total_installments} onChange={e => setForm(p => ({ ...p, total_installments: e.target.value }))} />
            <Input label="Parcela atual" type="number" min="0" placeholder="Ex: 3" value={form.current_installment} onChange={e => setForm(p => ({ ...p, current_installment: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor da parcela (R$)" type="number" min="0" step="0.01" value={form.installment_amount} onChange={e => setForm(p => ({ ...p, installment_amount: e.target.value }))} />
            <Input label="Juros (% a.m.)" type="number" min="0" step="0.01" placeholder="Ex: 2.5" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} />
            <Input label="Data de início" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
          </div>
          <Textarea label="Observações" placeholder="Detalhes adicionais..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveDebt} disabled={!form.name || !form.total_amount}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
