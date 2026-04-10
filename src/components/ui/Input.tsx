import { cn } from '@/lib/utils'
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white',
        'placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
        'transition-colors',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className, children, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white',
        'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
        'transition-colors',
        error && 'border-red-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none',
        'placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
        'transition-colors',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'
