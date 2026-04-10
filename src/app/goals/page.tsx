'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { formatCurrency, getGoalProgress } from '@/lib/utils'
import { Plus, Pencil, Trash2, Target, CheckCircle2 } from 'lucide-react'
import type { Goal } from '@/types'

const PRESET_COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#f97316']
const ICONS = ['🎯','🏠','🚗','✈️','📚','💰','💊','🏋️','💻','🎓','💍','🌴','📱','🛡️','🎸']

export default function GoalsPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯', color: '#6366f1', notes: '' })
  const [saving, setSaving] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => { load() }, [showCompleted])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const user = session.user
    let query = supabase.from('goals').select('*').eq('user_id', user.id)
    if (!showCompleted) query = query.eq('is_completed', false)
    query = query.order('created_at', { ascending: false })
    const { data } = await query
    setGoals(data || [])
    setLoading(false)
  }

  async function saveGoal() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user
      const payload = {
        user_id: user.id, name: form.name, target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0, target_date: form.target_date || null,
        icon: form.icon, color: form.color, notes: form.notes || null
      }
      if (editGoal) {
        await supabase.from('goals').update(payload).eq('id', editGoal.id)
      } else {
        await supabase.from('goals').insert(payload)
      }
      setModalOpen(false)
      setEditGoal(null)
      resetForm()
      load()
    } finally {
      setSaving(false)
    }
  }

  async function makeDeposit() {
    if (!depositGoal || !depositAmount) return
    const newAmount = Math.min(Number(depositGoal.current_amount) + parseFloat(depositAmount), Number(depositGoal.target_amount))
    const isCompleted = newAmount >= Number(depositGoal.target_amount)
    await supabase.from('goals').update({ current_amount: newAmount, is_completed: isCompleted }).eq('id', depositGoal.id)
    setDepositModalOpen(false)
    setDepositAmount('')
    load()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Excluir esta meta?')) return
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  function resetForm() {
    setForm({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯', color: '#6366f1', notes: '' })
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal)
    setForm({ name: goal.name, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), target_date: goal.target_date || '', icon: goal.icon, color: goal.color, notes: goal.notes || '' })
    setModalOpen(true)
  }

  return (
    <div>
      <Header
        title="Metas Financeiras"
        subtitle="Defina e acompanhe seus objetivos"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCompleted(p => !p)}>
              {showCompleted ? 'Ocultar concluídas' : 'Ver concluídas'}
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setEditGoal(null); setModalOpen(true) }}>
              <Plus size={14} /> Nova meta
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-12">
          <Target size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">{showCompleted ? 'Nenhuma meta encontrada' : 'Nenhuma meta ativa'}</p>
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Criar meta</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(goal => {
            const progress = getGoalProgress(Number(goal.current_amount), Number(goal.target_amount))
            const remaining = Number(goal.target_amount) - Number(goal.current_amount)
            const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000) : null
            return (
              <Card key={goal.id} className={goal.is_completed ? 'opacity-70' : ''}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (goal.color || '#6366f1') + '22' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{goal.name}</h3>
                      {goal.is_completed ? (
                        <span className="text-xs text-emerald-400">✓ Concluída!</span>
                      ) : daysLeft !== null ? (
                        <span className={`text-xs ${daysLeft < 30 ? 'text-yellow-400' : 'text-gray-500'}`}>
                          {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 font-medium">{formatCurrency(Number(goal.current_amount))}</span>
                    <span className="text-gray-500">{formatCurrency(Number(goal.target_amount))}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all relative overflow-hidden"
                      style={{ width: `${progress}%`, backgroundColor: goal.color || '#6366f1' }}
                    >
                      <div className="absolute inset-0 bg-white/10 animate-pulse" style={{ animationDuration: '2s' }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{progress.toFixed(1)}% alcançado</span>
                    <span>Faltam {formatCurrency(remaining)}</span>
                  </div>
                </div>

                {!goal.is_completed && (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => { setDepositGoal(goal); setDepositModalOpen(true) }}>
                    + Adicionar valor
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Goal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGoal ? 'Editar meta' : 'Nova meta'}>
        <div className="space-y-4">
          <Input label="Nome da meta" placeholder="Ex: Reserva de emergência" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor alvo (R$)" type="number" min="0" step="0.01" value={form.target_amount} onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} />
            <Input label="Valor atual (R$)" type="number" min="0" step="0.01" value={form.current_amount} onChange={e => setForm(p => ({ ...p, current_amount: e.target.value }))} />
          </div>
          <Input label="Prazo (opcional)" type="date" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setForm(p => ({ ...p, icon }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === icon ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Textarea label="Observações" placeholder="Motivação, contexto..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveGoal} disabled={!form.name || !form.target_amount}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Deposit Modal */}
      <Modal open={depositModalOpen} onClose={() => setDepositModalOpen(false)} title="Adicionar valor à meta">
        <div className="space-y-4">
          {depositGoal && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-white font-medium">{depositGoal.icon} {depositGoal.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {formatCurrency(Number(depositGoal.current_amount))} / {formatCurrency(Number(depositGoal.target_amount))}
              </p>
            </div>
          )}
          <Input label="Valor a adicionar (R$)" type="number" min="0" step="0.01" placeholder="0,00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDepositModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={makeDeposit} disabled={!depositAmount}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
