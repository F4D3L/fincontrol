-- FinControl - Schema inicial
-- Execute este script no SQL Editor do Supabase

-- Habilita RLS (Row Level Security) para todos os usuários verem apenas seus dados

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'tag',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own categories"
  ON categories FOR ALL USING (auth.uid() = user_id);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Tabela de contas fixas
CREATE TABLE IF NOT EXISTS fixed_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_auto_debit BOOLEAN DEFAULT FALSE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fixed_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own fixed bills"
  ON fixed_bills FOR ALL USING (auth.uid() = user_id);

-- Tabela de pagamentos de contas fixas (histórico mensal)
CREATE TABLE IF NOT EXISTS fixed_bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_bill_id UUID NOT NULL REFERENCES fixed_bills(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- formato YYYY-MM
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(fixed_bill_id, month)
);

ALTER TABLE fixed_bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bill payments"
  ON fixed_bill_payments FOR ALL
  USING (fixed_bill_id IN (SELECT id FROM fixed_bills WHERE user_id = auth.uid()));

-- Tabela de dívidas
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  creditor TEXT,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount DECIMAL(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  total_installments INTEGER,
  current_installment INTEGER DEFAULT 0,
  installment_amount DECIMAL(12,2),
  interest_rate DECIMAL(5,2),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own debts"
  ON debts FOR ALL USING (auth.uid() = user_id);

-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#6366f1',
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own goals"
  ON goals FOR ALL USING (auth.uid() = user_id);

-- Tabela de transações recorrentes
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own recurring transactions"
  ON recurring_transactions FOR ALL USING (auth.uid() = user_id);
