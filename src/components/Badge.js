const categoryColors = {
  spiritual: 'bg-spiritual/20 text-spiritual border-spiritual/30',
  emotional: 'bg-emotional/20 text-emotional border-emotional/30',
  physical: 'bg-physical/20 text-physical border-physical/30',
  other: 'bg-other/20 text-other border-other/30',
}

const statusColors = {
  pending: 'bg-warning/20 text-warning',
  active: 'bg-sage/20 text-sage',
  completed: 'bg-success/20 text-success',
}

export default function Badge({ type = 'category', value, className = '' }) {
  const colors = type === 'status' ? statusColors[value] : categoryColors[value]
  return (
    <span className={`${colors || ''} px-2.5 py-0.5 rounded-md text-xs font-medium capitalize border ${type === 'status' ? 'border-transparent' : ''} ${className}`}>
      {value}
    </span>
  )
}

export { categoryColors, statusColors }
