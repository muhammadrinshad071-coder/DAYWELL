import { CalendarDays, Clock3, Pencil, Repeat2, Trash2 } from 'lucide-react'
import { taskIsOverdue } from '../core/calculations'
import { displayDate, displayTime } from '../core/dates'
import { useI18n } from '../core/i18n'
import type { Task } from '../core/models'
import { useClock, usePreferences } from '../state/context'
import { Badge, CheckButton, IconButton } from './ui'

export default function TaskRow({ task, onToggle, onEdit, onDelete, compact = false }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete?: () => void; compact?: boolean }) {
  const { t, categoryLabel, locale } = useI18n()
  const { preferences } = usePreferences()
  const now = useClock()
  const overdue = taskIsOverdue(task, now)
  return <div className={`task-row ${task.completedAt ? 'task-done' : ''} ${compact ? 'task-compact' : ''}`} data-testid="task-row"><CheckButton checked={!!task.completedAt} onClick={onToggle} label={`${t(task.completedAt ? 'common.reopen' : 'common.complete')}: ${task.title}`} /><div className="task-copy"><button className="task-title" onClick={onEdit}>{task.title}</button>{!compact && task.description && <p className="task-description">{task.description}</p>}<div className="task-meta"><span>{categoryLabel(task.category)}</span>{task.kind !== 'task' && <Badge tone="violet">{t(`planner.${task.kind}`)}</Badge>}{task.dueDate && <span className={overdue ? 'text-danger' : ''}><CalendarDays size={11} aria-hidden="true" />{displayDate(task.dueDate, preferences.dateFormat, locale)}</span>}{task.time && <span><Clock3 size={11} aria-hidden="true" />{displayTime(task.time, locale)}</span>}{task.repeat !== 'none' && <span title={t(`repeat.${task.repeat}`)}><Repeat2 size={12} aria-hidden="true" /></span>}</div></div><div className="task-badges">{overdue && <Badge tone="danger">{t('planner.overdue')}</Badge>}<Badge tone={task.priority === 'high' ? 'amber' : task.priority === 'medium' ? 'indigo' : 'neutral'}>{t(`priority.${task.priority}`)}</Badge></div>{!compact && <div className="row-actions"><IconButton icon={Pencil} label={`${t('common.edit')}: ${task.title}`} onClick={onEdit} />{onDelete && <IconButton icon={Trash2} label={`${t('common.delete')}: ${task.title}`} onClick={onDelete} />}</div>}</div>
}
