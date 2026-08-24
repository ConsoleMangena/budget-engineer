import { useState, useMemo } from 'react'
import {
  Box, LayoutGrid, Boxes, FileText, HardHat, Building2,
  Wrench, ShieldCheck, Clock, DollarSign, Target,
  CheckCircle2, AlertTriangle, TrendingUp, Layers,
  ChevronRight, Ruler, Droplets, Flame, Truck,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { DzCard, DzPill, Kicker, BorderBeamCard } from '@/components/dzenhare'
import { PascalViewer } from './PascalViewer'
import { DrawIoEditor } from './DrawIoEditor'
import { DocsAndBimPackage } from './DocsAndBimPackage'
import { ConstructionDetailsBrowser } from './ConstructionDetailsBrowser'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'
import {
  PHASES,
} from '@/engine/construction/constructionPhases'

/* ──────────────────────────────────────────────────────────────── */
/*  Types                                                           */
/* ──────────────────────────────────────────────────────────────── */

export interface BimIntegrationDashboardProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
  pipelineResult?: PipelineResult | null
  buildingType?: string
}

type DashboardTab =
  | 'overview'
  | 'bim-3d'
  | 'drawio'
  | 'docs-package'
  | 'construction-details'

/* ──────────────────────────────────────────────────────────────── */
/*  Constants                                                       */
/* ──────────────────────────────────────────────────────────────── */

const SEVEN_STAGES = [
  { key: 'brief', label: 'Brief', icon: FileText, color: '#3b82f6' },
  { key: 'concept', label: 'Concept', icon: Target, color: '#8b5cf6' },
  { key: 'design', label: 'Design', icon: LayoutGrid, color: '#06b6d4' },
  { key: 'bim', label: 'BIM', icon: Boxes, color: '#d4a574' },
  { key: 'docs-bim', label: 'Docs & BIM', icon: Layers, color: '#22c55e' },
  { key: 'budget', label: 'Budget', icon: DollarSign, color: '#f59e0b' },
  { key: 'budget-eng', label: 'Budget Engineered', icon: ShieldCheck, color: '#10b981' },
] as const

const GREEN_FLAG_CHECKS = [
  { id: 'C1', label: 'Red Pen take-off variance', icon: AlertTriangle },
  { id: 'C2', label: 'WIPAA billing alignment', icon: TrendingUp },
  { id: 'C3', label: 'True Ledger WBS coding', icon: CheckCircle2 },
  { id: 'C4', label: 'Market index hedging', icon: DollarSign },
  { id: 'C5', label: 'Escrow milestone release', icon: Target },
] as const

const SITE_HAWK_CHECKS = [
  { id: 'P1', label: 'Site photos captured', icon: Building2 },
  { id: 'P2', label: 'Fleet delivery confirmed', icon: Truck },
  { id: 'P3', label: 'Work permits approved', icon: ShieldCheck },
  { id: 'P4', label: 'Weather risk flagged', icon: AlertTriangle },
  { id: 'P5', label: 'Resource utilisation', icon: TrendingUp },
  { id: 'P6', label: 'Dispute resolution', icon: CheckCircle2 },
] as const

/* ──────────────────────────────────────────────────────────────── */
/*  Sub-components                                                  */
/* ──────────────────────────────────────────────────────────────── */

function StagePipeline({ pipelineResult }: { pipelineResult?: PipelineResult | null }) {
  const steps = pipelineResult?.steps ?? []
  const stepMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of steps) m.set(s.name, s.status)
    return m
  }, [steps])

  return (
    <div className="flex flex-col gap-3" data-testid="stage-pipeline">
      <Kicker>Pipeline Stages</Kicker>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {SEVEN_STAGES.map((stage) => {
          const Icon = stage.icon
          const status = stepMap.get(stage.label) ?? stepMap.get(stage.key) ?? 'pending'
          const tone = status === 'passed' ? 'verified' as const : status === 'failed' ? 'disputed' as const : 'neutral' as const
          return (
            <DzCard key={stage.key} hover data-testid={`stage-${stage.key}`}>
              <div className="flex items-center gap-2 p-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stage.color}20` }}
                >
                  <Icon size={16} style={{ color: stage.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{stage.label}</p>
                </div>
                <DzPill tone={tone}>{status}</DzPill>
              </div>
            </DzCard>
          )
        })}
      </div>
    </div>
  )
}

function GreenFlagGuild() {
  return (
    <div className="flex flex-col gap-3" data-testid="green-flag-guild">
      <Kicker>Cost Clarity Green Flag Guild</Kicker>
      <DzCard>
        <div className="flex flex-col gap-2 p-4">
          {GREEN_FLAG_CHECKS.map((check) => {
            const Icon = check.icon
            return (
              <div key={check.id} className="flex items-center gap-2" data-testid={`flag-${check.id}`}>
                <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10">
                  <Icon size={12} className="text-emerald-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{check.id}</span>
                <span className="flex-1 text-xs text-[var(--text-primary)]">{check.label}</span>
              </div>
            )
          })}
        </div>
      </DzCard>
    </div>
  )
}

function SiteHawk() {
  return (
    <div className="flex flex-col gap-3" data-testid="site-hawk">
      <Kicker>Project Control Site Hawk</Kicker>
      <DzCard>
        <div className="flex flex-col gap-2 p-4">
          {SITE_HAWK_CHECKS.map((check) => {
            const Icon = check.icon
            return (
              <div key={check.id} className="flex items-center gap-2" data-testid={`hawk-${check.id}`}>
                <div className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/10">
                  <Icon size={12} className="text-cyan-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{check.id}</span>
                <span className="flex-1 text-xs text-[var(--text-primary)]">{check.label}</span>
              </div>
            )
          })}
        </div>
      </DzCard>
    </div>
  )
}

function ConstructionPhasesSummary() {
  return (
    <div className="flex flex-col gap-3" data-testid="construction-phases">
      <Kicker>Construction Phases</Kicker>
      <div className="flex flex-col gap-2">
        {Object.values(PHASES).map((phase) => (
          <DzCard key={phase.id}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10">
                <Wrench size={14} className="text-[var(--brand-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{phase.title}</p>
                <p className="text-[10px] text-stone-400">{phase.estimatedDays} days</p>
              </div>
              <DzPill tone="neutral">{phase.workItems.length} items</DzPill>
            </div>
          </DzCard>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main component                                                  */
/* ──────────────────────────────────────────────────────────────── */

export function BimIntegrationDashboard({
  activePlan,
  selectedDesign,
  pipelineResult,
  buildingType,
}: BimIntegrationDashboardProps) {
  const [tab, setTab] = useState<DashboardTab>('overview')

  return (
    <div className="flex flex-1 flex-col overflow-hidden" data-testid="bim-integration-dashboard">
      {/* Header */}
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
            <Boxes size={20} className="text-[var(--brand-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Construction Intelligence Dashboard</h1>
            <p className="text-xs text-stone-400">BIM + Docs & BIM + Construction Intelligence</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] px-4 py-1.5 overflow-x-auto">
        {([
          { key: 'overview' as const, label: 'Overview', icon: Boxes },
          { key: 'bim-3d' as const, label: '3D Model', icon: Box },
          { key: 'drawio' as const, label: 'AI Draw.io', icon: LayoutGrid },
          { key: 'docs-package' as const, label: 'Docs Package', icon: FileText },
          { key: 'construction-details' as const, label: 'Construction Details', icon: HardHat },
        ]).map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Icon size={12} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* BIM & Docs Hero */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BorderBeamCard badge="BIM Fortress" title="3D + Docs Integration" description="Parametric model viewer, AI-powered draw.io editor, and 18-sheet SADC council package">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-2">
                      <Box size={14} className="text-[var(--brand-accent)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">Pascal Viewer</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-2">
                      <LayoutGrid size={14} className="text-[var(--brand-accent)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">Draw.io Editor</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-2">
                      <FileText size={14} className="text-[var(--brand-accent)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">18-Sheet Package</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-2">
                      <HardHat size={14} className="text-[var(--brand-accent)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">Construction Details</span>
                    </div>
                  </div>
                </BorderBeamCard>
              </div>
              <div className="flex flex-col gap-3">
                <GreenFlagGuild />
              </div>
            </div>

            {/* Pipeline + Site Hawk */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <StagePipeline pipelineResult={pipelineResult} />
              </div>
              <div>
                <SiteHawk />
              </div>
            </div>

            {/* Construction phases */}
            <ConstructionPhasesSummary />
          </motion.div>
        )}

        {tab === 'bim-3d' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
            data-testid="bim-3d-view"
          >
            <BorderBeamCard badge="Pascal Viewer" title="3D Parametric BIM Model" description="Interactive 3D model with orbit, explode, and layer controls">
              <PascalViewer height={600} />
            </BorderBeamCard>
          </motion.div>
        )}

        {tab === 'drawio' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
            data-testid="drawio-view"
          >
            <BorderBeamCard badge="AI Editor" title="Draw.io AI Diagram Editor" description="AI-powered site plans, floor plans, and council submission diagrams">
              <DrawIoEditor height={600} />
            </BorderBeamCard>
          </motion.div>
        )}

        {tab === 'docs-package' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
            data-testid="docs-package-view"
          >
            <DocsAndBimPackage
              activePlan={activePlan}
              selectedDesign={selectedDesign}
            />
          </motion.div>
        )}

        {tab === 'construction-details' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
            data-testid="construction-details-view"
          >
            <ConstructionDetailsBrowser buildingType={buildingType} />
          </motion.div>
        )}
      </div>
    </div>
  )
}
