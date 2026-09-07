// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParametricPlanCanvas, parametricPlanToDataUri, downloadParametricPlan } from '@/components/bim/ParametricPlanCanvas'
import type { PlanModel } from '@/domain/plan'

/* ─── Fixtures ───────────────────────────────────────────────── */

const MINIMAL_PLAN: PlanModel = {
  id: 'plan-1',
  rooms: [
    { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
  ],
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 5, y: 0 }, thickness: 0.23, type: 'external' },
    { id: 'w2', start: { x: 5, y: 0 }, end: { x: 5, y: 4 }, thickness: 0.23, type: 'external' },
    { id: 'w3', start: { x: 5, y: 4 }, end: { x: 0, y: 4 }, thickness: 0.23, type: 'external' },
    { id: 'w4', start: { x: 0, y: 4 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
  ],
  openings: [
    { id: 'o1', wallId: 'w1', kind: 'door', offset: 2, width: 0.9, height: 2.1 },
    { id: 'o2', wallId: 'w2', kind: 'window', offset: 1, width: 1.2, height: 1.2, sillHeight: 0.9 },
  ],
  wallThickness: 0.23,
  ceilingHeight: 2.7,
  width: 5,
  height: 4,
} as unknown as PlanModel

const MULTI_ROOM_PLAN: PlanModel = {
  id: 'plan-2',
  rooms: [
    { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
    { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 3, height: 3.5 },
    { id: 'r3', name: 'Bathroom', x: 5, y: 3.5, width: 3, height: 2.5 },
    { id: 'r4', name: 'Bedroom', x: 0, y: 4, width: 4, height: 3.5 },
    { id: 'r5', name: 'Corridor', x: 4, y: 4, width: 4, height: 2 },
  ],
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 8, y: 0 }, thickness: 0.23, type: 'external' },
    { id: 'w2', start: { x: 8, y: 0 }, end: { x: 8, y: 6 }, thickness: 0.23, type: 'external' },
    { id: 'w3', start: { x: 8, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.23, type: 'external' },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
    { id: 'w5', start: { x: 5, y: 0 }, end: { x: 5, y: 6 }, thickness: 0.15, type: 'internal' },
    { id: 'w6', start: { x: 0, y: 4 }, end: { x: 8, y: 4 }, thickness: 0.15, type: 'internal' },
  ],
  openings: [],
  wallThickness: 0.23,
  ceilingHeight: 2.7,
  width: 8,
  height: 6,
} as unknown as PlanModel

const PLAN_WITH_EGRESS: PlanModel = {
  ...MINIMAL_PLAN,
  id: 'plan-egress',
  egressPoints: [
    { id: 'e1', x: 2.5, y: 0, type: 'main-entry', label: 'Main Entry' },
    { id: 'e2', x: 5, y: 2, type: 'emergency-exit', label: 'Fire Exit' },
  ],
} as unknown as PlanModel

/* ─── Tests ──────────────────────────────────────────────────── */

describe('ParametricPlanCanvas', () => {
  describe('Basic rendering', () => {
    it('renders an SVG element', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('sets data-component attribute', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('data-component')).toBe('ParametricPlanCanvas')
    })

    it('sets plan dimension data attributes', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('data-plan-width')).toBe('5')
      expect(svg?.getAttribute('data-plan-height')).toBe('4')
    })

    it('reports room and wall counts', () => {
      const { container } = render(<ParametricPlanCanvas plan={MULTI_ROOM_PLAN} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('data-room-count')).toBe('5')
      expect(svg?.getAttribute('data-wall-count')).toBe('6')
    })

    it('applies className prop', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} className="test-class" />)
      const svg = container.querySelector('svg')
      expect(svg?.classList.contains('test-class')).toBe(true)
    })
  })

  describe('Layers', () => {
    it('renders grid-lines layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="grid-lines"]')).toBeTruthy()
    })

    it('renders walls layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="walls"]')).toBeTruthy()
    })

    it('renders rooms layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="rooms"]')).toBeTruthy()
    })

    it('renders dimensions layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="dimensions"]')).toBeTruthy()
    })

    it('renders north arrow layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="north-arrow"]')).toBeTruthy()
    })

    it('renders scale-bar layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="scale-bar"]')).toBeTruthy()
    })

    it('renders background layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="background"]')).toBeTruthy()
    })
  })

  describe('Wall rendering', () => {
    it('renders external walls with external type', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const extWalls = container.querySelectorAll('[data-wall-type="external"]')
      expect(extWalls.length).toBeGreaterThanOrEqual(4)
    })

    it('renders internal walls with internal type', () => {
      const { container } = render(<ParametricPlanCanvas plan={MULTI_ROOM_PLAN} />)
      const intWalls = container.querySelectorAll('[data-wall-type="internal"]')
      expect(intWalls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Room labels', () => {
    it('renders room name labels', () => {
      const { container } = render(<ParametricPlanCanvas plan={MULTI_ROOM_PLAN} />)
      const rooms = container.querySelectorAll('[data-room-id]')
      expect(rooms.length).toBe(5)
    })

    it('renders room backgrounds with zone fills', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const bg = container.querySelector('[data-room-bg="r1"]')
      expect(bg).toBeTruthy()
    })
  })

  describe('Opening symbols', () => {
    it('renders openings layer for door and window', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const layer = container.querySelector('[data-layer="openings"]')
      expect(layer).toBeTruthy()
      const doorEl = container.querySelector('[data-opening-kind="door"]')
      const windowEl = container.querySelector('[data-opening-kind="window"]')
      expect(doorEl).toBeTruthy()
      expect(windowEl).toBeTruthy()
    })
  })

  describe('Occupancy class badges', () => {
    it('does not render occupancy badges when buildingType is omitted', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const badges = container.querySelectorAll('[data-occupancy]')
      expect(badges.length).toBe(0)
    })

    it('renders occupancy badges when buildingType is provided', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} buildingType="house" />)
      const badges = container.querySelectorAll('[data-occupancy]')
      expect(badges.length).toBe(1)
      expect(badges[0].getAttribute('data-occupancy')).toBe('B2')
    })

    it('classifies school correctly', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} buildingType="school" />)
      const badges = container.querySelectorAll('[data-occupancy]')
      expect(badges[0].getAttribute('data-occupancy')).toBe('A3')
    })

    it('classifies hotel correctly', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} buildingType="hotel" />)
      const badges = container.querySelectorAll('[data-occupancy]')
      expect(badges[0].getAttribute('data-occupancy')).toBe('H1')
    })
  })

  describe('Egress overlay', () => {
    it('renders no egress layer when plan has no egressPoints', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      expect(container.querySelector('[data-layer="egress"]')).toBeFalsy()
    })

    it('renders egress layer when plan has egressPoints', () => {
      const { container } = render(<ParametricPlanCanvas plan={PLAN_WITH_EGRESS} />)
      expect(container.querySelector('[data-layer="egress"]')).toBeTruthy()
    })
  })

  describe('Fire compartment overlay', () => {
    it('renders fire compartment layer', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} buildingType="house" />)
      const layer = container.querySelector('[data-layer="fire-compartments"]')
      expect(layer).toBeTruthy()
      expect(layer?.getAttribute('data-fire-rating')).toBe('30')
    })
  })

  describe('Caption and metadata', () => {
    it('shows PARAMETRIC FLOOR PLAN caption', () => {
      render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const els = screen.getAllByText('PARAMETRIC FLOOR PLAN')
      expect(els.length).toBeGreaterThanOrEqual(1)
    })

    it('shows default scale label', () => {
      render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const els = screen.getAllByText('SCALE 1:100')
      expect(els.length).toBeGreaterThanOrEqual(1)
    })

    it('shows building type badge when provided', () => {
      render(<ParametricPlanCanvas plan={MINIMAL_PLAN} buildingType="house" />)
      const els = screen.getAllByText((_, element) =>
        element?.textContent?.toLowerCase().includes('house') ?? false,
      )
      expect(els.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Dimension lines', () => {
    it('renders overall width dimension in mm', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const dims = container.querySelector('[data-layer="dimensions"]')
      expect(dims).toBeTruthy()
      expect(dims?.textContent).toContain('5 000')
    })

    it('renders overall height dimension in mm', () => {
      const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
      const dims = container.querySelector('[data-layer="dimensions"]')
      expect(dims?.textContent).toContain('4 000')
    })
  })

  describe('Multi-room plan', () => {
    it('renders all 5 rooms', () => {
      const { container } = render(<ParametricPlanCanvas plan={MULTI_ROOM_PLAN} />)
      const rooms = container.querySelectorAll('[data-room-id]')
      expect(rooms.length).toBe(5)
    })

    it('renders bay dimensions for structural bays', () => {
      const { container } = render(<ParametricPlanCanvas plan={MULTI_ROOM_PLAN} />)
      const dims = container.querySelector('[data-layer="dimensions"]')
      expect(dims?.textContent).toContain('8 000')
    })
  })
})

describe('Export utilities', () => {
  it('parametricPlanToDataUri returns a data URI string', () => {
    const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
    const svg = container.querySelector('svg') as SVGSVGElement
    const uri = parametricPlanToDataUri(svg)
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
    expect(uri.length).toBeGreaterThan(30)
  })

  it('downloadParametricPlan creates an anchor and clicks it', () => {
    const { container } = render(<ParametricPlanCanvas plan={MINIMAL_PLAN} />)
    const svg = container.querySelector('svg') as SVGSVGElement
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node)
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node)
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    downloadParametricPlan(svg, 'test-plan.svg')

    expect(clickSpy).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(revokeSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
    revokeSpy.mockRestore()
  })
})
