export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  type: TransactionType
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string | null
  category?: Category
  description: string
  date: string
  is_recurring: boolean
  recurring_id: string | null
  created_at: string
}

export interface FixedBill {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number
  is_auto_debit: boolean
  category_id: string | null
  category?: Category
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface FixedBillPayment {
  id: string
  fixed_bill_id: string
  month: string // YYYY-MM
  paid: boolean
  paid_at: string | null
  amount: number
}

export interface Debt {
  id: string
  user_id: string
  name: string
  creditor: string | null
  total_amount: number
  paid_amount: number
  total_installments: number | null
  current_installment: number | null
  installment_amount: number | null
  interest_rate: number | null
  due_day: number | null
  start_date: string
  notes: string | null
  is_paid: boolean
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  notes: string | null
  is_completed: boolean
  created_at: string
}

export interface RecurringTransaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string | null
  description: string
  frequency: 'monthly' | 'weekly' | 'yearly'
  day_of_month: number | null
  next_date: string
  is_active: boolean
  created_at: string
}
