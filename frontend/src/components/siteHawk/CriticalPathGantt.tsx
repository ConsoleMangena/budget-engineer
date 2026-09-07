import { Calendar, AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import type { CriticalPathResult, GanttTask } from '@/engine/sitehawk/criticalPath';

interface CriticalPathGanttProps {
  result: CriticalPathResult;
  currentDay?: number;
  onTaskClick?: (task: GanttTask) => void;
}

export default function CriticalPathGantt({ result, currentDay = 0, onTaskClick }: CriticalPathGanttProps) {
  const { tasks, criticalPath, totalDurationDays, scheduleVarianceDays } = result;
  const maxDay = Math.max(totalDurationDays, currentDay + 5);

  const barLeft = (day: number) => `${(day / maxDay) * 100}%`;
  const barWidth = (days: number) => `${Math.max(0.5, (days / maxDay) * 100)}%`;

  const statusColor = (task: GanttTask) => {
    if (task.status === 'completed') return 'bg-emerald-500';
    if (task.status === 'in-progress') return 'bg-[var(--brand-accent)]';
    if (task.onCriticalPath) return 'bg-red-500';
    return 'bg-stone-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Critical Path</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-stone-400 tabular-nums">{totalDurationDays} days total</span>
          {scheduleVarianceDays !== 0 && (
            <span className={`flex items-center gap-1 ${scheduleVarianceDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {scheduleVarianceDays > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {scheduleVarianceDays > 0 ? '+' : ''}{scheduleVarianceDays}d variance
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex items-center text-[10px] text-stone-500 border-b border-stone-700 pb-1 mb-2">
            <div className="w-48 shrink-0 text-stone-400">Task</div>
            <div className="flex-1 relative h-3">
              {Array.from({ length: Math.ceil(maxDay / 5) + 1 }).map((_, i) => (
                <span key={i} className="absolute text-[9px] text-stone-600 tabular-nums" style={{ left: `${(i * 5 / maxDay) * 100}%` }}>{i * 5}d</span>
              ))}
            </div>
          </div>

          {/* Today marker */}
          {currentDay > 0 && (
            <div className="relative h-0" style={{ marginLeft: '192px' }}>
              <div className="absolute top-0 h-full w-px bg-amber-500/60" style={{ left: barLeft(currentDay) }} />
              <span className="absolute -top-4 text-[9px] text-amber-400 tabular-nums" style={{ left: barLeft(currentDay) }}>Today</span>
            </div>
          )}

          {/* Task rows */}
          {tasks.map((task) => {
            const isCritical = criticalPath.includes(task.id);
            return (
              <div key={task.id} onClick={() => onTaskClick?.(task)}
                className="flex items-center h-7 hover:bg-[var(--bg-secondary)] rounded cursor-pointer group">
                <div className="w-48 shrink-0 flex items-center gap-1.5 pr-2">
                  {isCritical && <Flag className="h-3 w-3 text-red-400 shrink-0" />}
                  <span className={`text-xs truncate ${isCritical ? 'text-red-400 font-medium' : 'text-[var(--text-primary)]'}`}>
                    {task.name}
                  </span>
                </div>
                <div className="flex-1 relative h-4">
                  <div
                    className={`absolute h-4 rounded-sm ${statusColor(task)} opacity-80 group-hover:opacity-100 transition-opacity`}
                    style={{ left: barLeft(task.earlyStart), width: barWidth(task.durationDays) }}
                    title={`${task.name}: ${task.earlyStart}d-${task.earlyFinish}d`}
                  />
                  {task.dependencies.length > 0 && (
                    <div className="absolute h-px bg-stone-600 top-2" style={{ left: barLeft(task.earlyStart), width: '2px' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-stone-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" />Critical path</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--brand-accent)]" />In progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-stone-600" />Not started</span>
      </div>
    </div>
  );
}
