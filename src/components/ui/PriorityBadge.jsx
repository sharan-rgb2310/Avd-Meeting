import { ArrowDown, ArrowUp, Minus, Flame } from 'lucide-react'
import Badge from './Badge'

const CONFIG = {
  Low: { tone: 'neutral', icon: ArrowDown },
  Medium: { tone: 'blue', icon: Minus },
  High: { tone: 'orange', icon: ArrowUp },
  Critical: { tone: 'red', icon: Flame },
}

const PriorityBadge = ({ priority, className }) => {
  const config = CONFIG[priority] || CONFIG.Medium
  return (
    <Badge tone={config.tone} icon={config.icon} className={className}>
      {priority}
    </Badge>
  )
}

export default PriorityBadge
