// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ConstructionDetailsBrowser } from '@/components/bim/ConstructionDetailsBrowser'
import { CONSTRUCTION_DETAILS, DETAIL_CATEGORIES } from '@/engine/construction/constructionDetails'
import { OCCUPANCY_CLASSES, OCCUPANCY_MATRIX } from '@/engine/compliance/occupancyMatrix'
import { listSpecStandards } from '@/engine/standards/roomStandards'

describe('ConstructionDetailsBrowser', () => {
  describe('occupancy matrix tab', () => {
    it('renders the component with data-component attr', () => {
      const { container } = render(<ConstructionDetailsBrowser />)
      expect(container.querySelector('[data-component="construction-details-browser"]')).toBeTruthy()
      expect(container.querySelector('[data-tab-content="occupancy"]')).toBeTruthy()
    })

    it('shows all 16 SANS 10400-A occupancy classes', () => {
      const { getAllByText } = render(<ConstructionDetailsBrowser />)
      OCCUPANCY_CLASSES.forEach((code) => {
        const spec = OCCUPANCY_MATRIX[code]
        expect(getAllByText(spec.code).length).toBeGreaterThanOrEqual(1)
        expect(getAllByText(spec.label).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows live load, travel distance, fire rating columns', () => {
      const { getAllByText } = render(<ConstructionDetailsBrowser />)
      expect(getAllByText('Live Load (kPa)').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('Travel Dist. (m)').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('Fire Rating (min)').length).toBeGreaterThanOrEqual(1)
    })

    it('classifies a known building type and shows badge', () => {
      const { container } = render(<ConstructionDetailsBrowser buildingType="house-residential" />)
      const occupancyContent = container.querySelector('[data-tab-content="occupancy"]')
      expect(occupancyContent).toBeTruthy()
      expect(occupancyContent!.textContent).toContain('house-residential')
      expect(occupancyContent!.textContent).toContain('→')
      expect(occupancyContent!.textContent).toContain('B2')
    })

    it('filters occupancy classes by query', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      const inputs = container.querySelectorAll('[data-tab-content="occupancy"] input')
      const input = inputs[0] as HTMLInputElement
      expect(input).toBeTruthy()
      fireEvent.change(input, { target: { value: 'hotel' } })
      expect(getAllByText('H1').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('room standards tab', () => {
    it('switches to room-standards tab and shows 13 spec rooms', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      const tabBtn = container.querySelector('[data-tab="room-standards"]') as HTMLButtonElement
      expect(tabBtn).toBeTruthy()
      fireEvent.click(tabBtn)

      expect(container.querySelector('[data-tab-content="room-standards"]')).toBeTruthy()

      const specs = listSpecStandards()
      expect(specs.length).toBe(13)
      specs.forEach((rs) => {
        expect(getAllByText(rs.name).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows zone and dimension columns', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      fireEvent.click(container.querySelector('[data-tab="room-standards"]')!)

      expect(getAllByText('Min Width (m)').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('Min Depth (m)').length).toBeGreaterThanOrEqual(1)
      expect(getAllByText('Wet Core').length).toBeGreaterThanOrEqual(1)
    })

    it('shows zone badges for each room', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      fireEvent.click(container.querySelector('[data-tab="room-standards"]')!)

      const specs = listSpecStandards()
      specs.forEach((rs) => {
        expect(getAllByText(rs.zone).length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('construction details tab', () => {
    it('switches to construction details tab and shows categories', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      fireEvent.click(container.querySelector('[data-tab="construction"]')!)

      expect(container.querySelector('[data-tab-content="construction"]')).toBeTruthy()

      DETAIL_CATEGORIES.forEach((cat) => {
        expect(getAllByText(cat.label).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows detail list for wall-sections by default', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      fireEvent.click(container.querySelector('[data-tab="construction"]')!)

      const wallDetails = CONSTRUCTION_DETAILS.filter(
        (d) => d.category === 'wall-sections',
      )
      wallDetails.forEach((d) => {
        expect(getAllByText(d.title).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('selects a detail and shows preview', () => {
      const { container, getAllByText } = render(<ConstructionDetailsBrowser />)
      fireEvent.click(container.querySelector('[data-tab="construction"]')!)

      const detail = CONSTRUCTION_DETAILS.find(
        (d) => d.category === 'wall-sections',
      )
      if (!detail) return

      const detailBtns = container.querySelectorAll('[data-tab-content="construction"] button')
      expect(detailBtns.length).toBeGreaterThan(0)
      fireEvent.click(detailBtns[0])

      expect(getAllByText(detail.description).length).toBeGreaterThanOrEqual(1)
      expect(getAllByText(detail.scale).length).toBeGreaterThanOrEqual(1)
    })
  })
})
