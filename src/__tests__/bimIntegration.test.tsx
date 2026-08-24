// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BimIntegrationDashboard } from '@/components/bim/BimIntegrationDashboard'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'

/* ─── Mocks ──────────────────────────────────────────────────── */

vi.mock('@/components/bim/PascalViewer', () => ({
  PascalViewer: (props: { height?: number }) => (
    <div data-testid="mock-pascal-viewer" data-height={props.height}>PascalViewer</div>
  ),
}))

vi.mock('@/components/bim/DrawIoEditor', () => ({
  DrawIoEditor: (props: { height?: number }) => (
    <div data-testid="mock-drawio-editor" data-height={props.height}>DrawIoEditor</div>
  ),
}))

vi.mock('@/components/bim/DocsAndBimPackage', () => ({
  DocsAndBimPackage: (props: { activePlan: unknown; selectedDesign: unknown }) => (
    <div data-testid="mock-docs-package">DocsAndBimPackage</div>
  ),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, viewport, whileInView, ...valid } = props
      return <div {...valid}>{children}</div>
    },
  },
}))

/* ─── Fixtures ───────────────────────────────────────────────── */

const MOCK_PLAN: PlanModel = {
  id: 'plan-1',
  rooms: [
    { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 5 },
    { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 4 },
  ],
  walls: [],
  openings: [],
  wallThickness: 0.23,
  ceilingHeight: 2.7,
} as unknown as PlanModel

const MOCK_DESIGN: DesignOption = {
  id: 'design-1',
  name: 'Option A',
  floors: 2,
  grossFloorArea: 180,
  netFloorArea: 150,
  rooms: [],
} as unknown as DesignOption

const MOCK_PIPELINE: PipelineResult = {
  success: true,
  brief: null,
  enhancedBrief: null,
  optimizerResult: null,
  selectedCandidate: null,
  planModel: MOCK_PLAN,
  councilPackage: null,
  complianceReport: null,
  constraintEvaluation: null,
  designOption: MOCK_DESIGN,
  steps: [
    { name: 'Brief', status: 'passed' },
    { name: 'Concept', status: 'passed' },
    { name: 'Design', status: 'passed' },
    { name: 'BIM', status: 'running' },
    { name: 'Docs & BIM', status: 'pending' },
    { name: 'Budget', status: 'skipped' },
    { name: 'Budget Engineered', status: 'pending' },
  ],
  errors: [],
}

/* ─── Tests ──────────────────────────────────────────────────── */

describe('BimIntegrationDashboard', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('renders with data-testid', () => {
    render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
    expect(screen.getByTestId('bim-integration-dashboard')).toBeTruthy()
  })

  it('displays heading', () => {
    render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
    expect(screen.getByText('Construction Intelligence Dashboard')).toBeTruthy()
  })

  it('displays subtitle', () => {
    render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
    expect(screen.getByText('BIM + Docs & BIM + Construction Intelligence')).toBeTruthy()
  })

  it('renders all 5 tabs', () => {
    render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
    expect(screen.getByTestId('tab-overview')).toBeTruthy()
    expect(screen.getByTestId('tab-bim-3d')).toBeTruthy()
    expect(screen.getByTestId('tab-drawio')).toBeTruthy()
    expect(screen.getByTestId('tab-docs-package')).toBeTruthy()
    expect(screen.getByTestId('tab-construction-details')).toBeTruthy()
  })

  it('shows overview tab by default', () => {
    render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
    expect(screen.getByTestId('stage-pipeline')).toBeTruthy()
    expect(screen.getByTestId('green-flag-guild')).toBeTruthy()
    expect(screen.getByTestId('site-hawk')).toBeTruthy()
  })

  describe('7-stage pipeline', () => {
    it('renders all 7 pipeline stage cards', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByText('Brief')).toBeTruthy()
      expect(screen.getByText('Concept')).toBeTruthy()
      expect(screen.getByText('Design')).toBeTruthy()
      expect(screen.getByText('BIM')).toBeTruthy()
      expect(screen.getByText('Docs & BIM')).toBeTruthy()
      expect(screen.getByText('Budget')).toBeTruthy()
      expect(screen.getByText('Budget Engineered')).toBeTruthy()
    })

    it('shows pipeline stage labels', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByText('Brief')).toBeTruthy()
      expect(screen.getByText('Concept')).toBeTruthy()
      expect(screen.getByText('Design')).toBeTruthy()
      expect(screen.getByText('BIM')).toBeTruthy()
      expect(screen.getByText('Docs & BIM')).toBeTruthy()
      expect(screen.getByText('Budget')).toBeTruthy()
      expect(screen.getByText('Budget Engineered')).toBeTruthy()
    })

    it('reflects pipeline result statuses', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} pipelineResult={MOCK_PIPELINE} />)
      const verified = screen.getAllByText('passed')
      expect(verified.length).toBeGreaterThanOrEqual(3)
      expect(screen.getByText('running')).toBeTruthy()
      const pendingList = screen.getAllByText('pending')
      expect(pendingList.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('skipped')).toBeTruthy()
    })

    it('shows pending for all stages when no pipeline result', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      const pending = screen.getAllByText('pending')
      expect(pending.length).toBe(7)
    })
  })

  describe('Green Flag Guild', () => {
    it('renders all C1-C5 checks', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByTestId('flag-C1')).toBeTruthy()
      expect(screen.getByTestId('flag-C2')).toBeTruthy()
      expect(screen.getByTestId('flag-C3')).toBeTruthy()
      expect(screen.getByTestId('flag-C4')).toBeTruthy()
      expect(screen.getByTestId('flag-C5')).toBeTruthy()
    })

    it('shows check labels', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByText('Red Pen take-off variance')).toBeTruthy()
      expect(screen.getByText('WIPAA billing alignment')).toBeTruthy()
      expect(screen.getByText('True Ledger WBS coding')).toBeTruthy()
      expect(screen.getByText('Market index hedging')).toBeTruthy()
      expect(screen.getByText('Escrow milestone release')).toBeTruthy()
    })
  })

  describe('Site Hawk', () => {
    it('renders all P1-P6 checks', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByTestId('hawk-P1')).toBeTruthy()
      expect(screen.getByTestId('hawk-P2')).toBeTruthy()
      expect(screen.getByTestId('hawk-P3')).toBeTruthy()
      expect(screen.getByTestId('hawk-P4')).toBeTruthy()
      expect(screen.getByTestId('hawk-P5')).toBeTruthy()
      expect(screen.getByTestId('hawk-P6')).toBeTruthy()
    })

    it('shows check labels', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByText('Site photos captured')).toBeTruthy()
      expect(screen.getByText('Fleet delivery confirmed')).toBeTruthy()
      expect(screen.getByText('Work permits approved')).toBeTruthy()
    })
  })

  describe('tab switching', () => {
    it('switches to 3D Model tab and shows PascalViewer', () => {
      render(<BimIntegrationDashboard activePlan={MOCK_PLAN} selectedDesign={MOCK_DESIGN} />)
      fireEvent.click(screen.getByTestId('tab-bim-3d'))
      expect(screen.getByTestId('mock-pascal-viewer')).toBeTruthy()
    })

    it('switches to Draw.io tab and shows DrawIoEditor', () => {
      render(<BimIntegrationDashboard activePlan={MOCK_PLAN} selectedDesign={MOCK_DESIGN} />)
      fireEvent.click(screen.getByTestId('tab-drawio'))
      expect(screen.getByTestId('mock-drawio-editor')).toBeTruthy()
    })

    it('switches to Docs Package tab and shows DocsAndBimPackage', () => {
      render(<BimIntegrationDashboard activePlan={MOCK_PLAN} selectedDesign={MOCK_DESIGN} />)
      fireEvent.click(screen.getByTestId('tab-docs-package'))
      expect(screen.getByTestId('mock-docs-package')).toBeTruthy()
    })

    it('switches to Construction Details tab', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      fireEvent.click(screen.getByTestId('tab-construction-details'))
      expect(screen.getByTestId('construction-details-view')).toBeTruthy()
    })

    it('switches back to overview from another tab', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      fireEvent.click(screen.getByTestId('tab-bim-3d'))
      fireEvent.click(screen.getByTestId('tab-overview'))
      expect(screen.getByTestId('stage-pipeline')).toBeTruthy()
    })
  })

  describe('brand palette', () => {
    it('uses brand accent colors', () => {
      const { container } = render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      const accentEls = container.querySelectorAll('[class*="brand-accent"]')
      expect(accentEls.length).toBeGreaterThan(0)
    })
  })

  describe('local-first', () => {
    it('renders without requiring props (null plan/design)', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByTestId('bim-integration-dashboard')).toBeTruthy()
      expect(screen.getAllByText('pending').length).toBe(7)
    })

    it('works with plan and design provided', () => {
      render(<BimIntegrationDashboard activePlan={MOCK_PLAN} selectedDesign={MOCK_DESIGN} />)
      expect(screen.getByTestId('bim-integration-dashboard')).toBeTruthy()
    })

    it('works with pipeline result', () => {
      render(
        <BimIntegrationDashboard
          activePlan={MOCK_PLAN}
          selectedDesign={MOCK_DESIGN}
          pipelineResult={MOCK_PIPELINE}
        />,
      )
      expect(screen.getByTestId('stage-pipeline')).toBeTruthy()
      const verified = screen.getAllByText('passed')
      expect(verified.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('construction phases', () => {
    it('renders construction phases summary', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByTestId('construction-phases')).toBeTruthy()
    })

    it('shows phase work item counts', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      const items = screen.getAllByText(/^\d+ items$/)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  describe('buildingType passthrough', () => {
    it('passes buildingType to ConstructionDetailsBrowser', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} buildingType="house" />)
      fireEvent.click(screen.getByTestId('tab-construction-details'))
      expect(screen.getByTestId('construction-details-view')).toBeTruthy()
    })
  })

  describe('border-beam BIM Fortress card', () => {
    it('renders on overview tab', () => {
      render(<BimIntegrationDashboard activePlan={null} selectedDesign={null} />)
      expect(screen.getByText('3D + Docs Integration')).toBeTruthy()
      expect(screen.getByText('Pascal Viewer')).toBeTruthy()
      expect(screen.getByText('Draw.io Editor')).toBeTruthy()
      expect(screen.getByText('18-Sheet Package')).toBeTruthy()
      expect(screen.getAllByText('Construction Details').length).toBeGreaterThanOrEqual(1)
    })
  })
})
