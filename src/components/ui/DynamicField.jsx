import Input, { Select, TextArea } from './Input'
import { statusLabel, cn } from '../../lib/utils'

/**
 * DynamicField — renders one field from a division's report schema.
 * Value shape matches the field type; see divisionReportSchemas.js.
 */
export default function DynamicField({ field, value, onChange }) {
  const v = value ?? defaultFor(field)

  switch (field.type) {
    case 'text':
      return <Input label={field.label} placeholder={field.placeholder} value={v} onChange={e => onChange(e.target.value)} />
    case 'textarea':
      return <TextArea label={field.label} placeholder={field.placeholder} rows={3} value={v} onChange={e => onChange(e.target.value)} />
    case 'number':
      return (
        <Input
          label={field.label}
          type="number"
          min={field.min}
          step={field.step ?? 1}
          value={v}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'boolean':
      return (
        <label className="flex items-start gap-3 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={!!v}
            onChange={e => onChange(e.target.checked)}
            className="mt-1 w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.label}</span>
        </label>
      )
    case 'select':
      return (
        <Select label={field.label} value={v} onChange={e => onChange(e.target.value)}>
          <option value="">— Pick one —</option>
          {field.options.map(opt => <option key={opt} value={opt}>{statusLabel(opt)}</option>)}
        </Select>
      )
    case 'multiselect': {
      const sel = Array.isArray(v) ? v : []
      const toggle = (opt) => {
        if (sel.includes(opt)) onChange(sel.filter(o => o !== opt))
        else onChange([...sel, opt])
      }
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{field.label}</label>
          <div className="flex flex-wrap gap-1.5">
            {field.options.map(opt => {
              const active = sel.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all border',
                    active
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  {statusLabel(opt)}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

function defaultFor(field) {
  switch (field.type) {
    case 'number':      return ''
    case 'boolean':     return false
    case 'multiselect': return []
    default:            return ''
  }
}
