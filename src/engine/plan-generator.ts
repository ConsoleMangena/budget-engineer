import type { DesignOption } from '../domain/boq'
import type { PlanModel, PlanSource, PlanningZoneMarker } from '../domain/plan'
import { getRoomProgram } from './roomPrograms'
import { isResidential } from './buildingTypes'
import { generateLayoutByTypology, type FloorContext } from '../lib/layout/typology-router'
import type { FloorLayoutResult } from '../lib/layout/typology-router'
import { assemblePlan, validatePlanCompliance } from '../lib/geometry/plan-intelligence'
import { listHouseTemplates } from '../lib/layout/layout-templates'
import { getMinimumDimensions, getRoomStandard } from '@/engine/standards/roomStandards'

/** Calculate the total minimum area (m²) required by a room program based on §5 standards. */
function totalMinArea(program: { name: string; ratio: number }[]): number {
  let total = 0
  for (const p of program) {
    const std = getRoomStandard(p.name)
    total += std.minWidth * std.minDepth
  }
  return total
}

/**
 * Pre-generation feasibility gate.
 * Ensures the footprint can accommodate all program rooms at their §5 minimum sizes.
 * Returns adjusted footprint dimensions if the original is too small.
 */
function ensureFeasibleFootprint(
  footprint: { width: number; height: number },
  program: { name: string; ratio: number }[],
): { width: number; height: number; adjusted: boolean } {
  const required = totalMinArea(program)
  const available = footprint.width * footprint.height
  if (available >= required) return { ...footprint, adjusted: false }

  // Scale up proportionally to fit the program at minimum sizes
  const scale = Math.sqrt(required / available) * 1.05 // 5% margin
  const newWidth = Math.max(footprint.width * scale, 5.0)
  const newHeight = Math.max(footprint.height * scale, 5.0)

  // Keep aspect ratio close to original
  const aspect = footprint.width / footprint.height
  let finalW = newWidth
  let finalH = newHeight
  if (finalW / finalH > aspect * 1.5) {
    finalW = finalH * aspect * 1.5
  } else if (finalW / finalH < aspect / 1.5) {
    finalH = finalW / aspect * 1.5
  }

  return { width: Math.round(finalW * 10) / 10, height: Math.round(finalH * 10) / 10, adjusted: true }
}

const GRID = 0.05
const snap05 = (v: number) => Math.round(v / GRID) * GRID
import { generateBuildingChassis, validateVerticalConstraints, getConstraintsForLevel } from '../lib/layout/vertical-chassis'
import { computeLevelStack } from '../lib/layout/level-stack'
import { isWetRoom } from '../lib/layout/shaft-stack'
import { validateCirculationSeparation, buildMixedUseCirculation } from '../lib/layout/circulation-separation'
import { generatePartyWall, clampToPartyWall } from '../lib/layout/party-wall'
import { computeLevelProgrammes, getAllocationProgramme, getLevelFloorRole } from '../lib/layout/level-programme'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'
import { validateEntranceSeparation } from '../lib/layout/typologies/non-residential'

/** Copy spatial extras (structural grid, core, plate metrics, adjacency graph) from a layout result onto the plan model. */
function stampSpatialExtras(planModel: PlanModel, layoutResult: FloorLayoutResult | null | undefined): void {
  if (!layoutResult) return
  if (layoutResult.structuralGrid) planModel.structuralGrid = layoutResult.structuralGrid
  if (layoutResult.coreLayout) planModel.coreLayout = layoutResult.coreLayout
  if (layoutResult.floorPlateMetrics) planModel.floorPlateMetrics = layoutResult.floorPlateMetrics
  if (layoutResult.adjacencyGraph) planModel.adjacencyGraph = layoutResult.adjacencyGraph
  if (layoutResult.bubbleDiagram) planModel.bubbleDiagram = layoutResult.bubbleDiagram
  if (layoutResult.constraintEvaluation) planModel.constraintEvaluation = layoutResult.constraintEvaluation
}

function postProcessRooms(rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[], fpW: number, fpH: number): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const result = rooms.map(r => ({ ...r }))
  let passes = 0
  const maxPasses = 12

  while (passes < maxPasses) {
    passes++
    let changedThisPass = false

    // 1. Expand rooms to minimum dimensions, shrink neighbors if needed (cascade-safe)
    for (let i = 0; i < result.length; i++) {
      const room = result[i]
      const dims = getMinimumDimensions(room.name)
      if (room.width < dims.minWidth - 0.01) {
        const targetW = Math.min(dims.minWidth, fpW - room.x)
        const needed = targetW - room.width
        if (needed > 0.01) {
          const neighbors = result
            .map((o, idx) => ({ o, idx }))
            .filter(({ o, idx }) => idx !== i && o.x >= room.x + room.width - 0.05 && o.x < room.x + room.width + needed + 0.5 && Math.abs(o.y - room.y) < 0.2 && o.name !== 'Circulation')
            .sort((a, b) => a.o.x - b.o.x)
          let remaining = needed
          for (const { o } of neighbors) {
            if (remaining <= 0.01) break
            const neighborDims = getMinimumDimensions(o.name)
            const minShrinkableW = Math.max(0, o.width - neighborDims.minWidth - 0.1)
            const shrink = Math.min(remaining, minShrinkableW)
            if (shrink < 0.01) continue
            o.x += shrink
            o.width -= shrink
            remaining -= shrink
          }
          if (needed - remaining > 0.01) {
            room.width = Math.round((room.width + (needed - remaining)) * 10) / 10
            changedThisPass = true
          }
        }
      }
      if (room.height < dims.minDepth - 0.01) {
        const targetH = Math.min(dims.minDepth, fpH - room.y)
        const needed = targetH - room.height
        if (needed > 0.01) {
          const neighbors = result
            .map((o, idx) => ({ o, idx }))
            .filter(({ o, idx }) => idx !== i && o.y >= room.y + room.height - 0.05 && o.y < room.y + room.height + needed + 0.5 && Math.abs(o.x - room.x) < 0.2 && o.name !== 'Circulation')
            .sort((a, b) => a.o.y - b.o.y)
          let remaining = needed
          for (const { o } of neighbors) {
            if (remaining <= 0.01) break
            const neighborDims = getMinimumDimensions(o.name)
            const minShrinkableH = Math.max(0, o.height - neighborDims.minDepth - 0.1)
            const shrink = Math.min(remaining, minShrinkableH)
            if (shrink < 0.01) continue
            o.y += shrink
            o.height -= shrink
            remaining -= shrink
          }
          if (needed - remaining > 0.01) {
            room.height = Math.round((room.height + (needed - remaining)) * 10) / 10
            changedThisPass = true
          }
        }
      }
    }

    // 2. Fix extreme aspect ratios for all room types (only when truly disproportionate)
    for (const room of result) {
      const aspect = Math.max(room.width / room.height, room.height / room.width)
      if (aspect > 4.0) {
        const minDim = Math.min(room.width, room.height)
        if (room.width > room.height) {
          room.width = Math.max(minDim * 3.0, room.height * 3.0)
        } else {
          room.height = Math.max(minDim * 3.0, room.width * 3.0)
        }
        changedThisPass = true
      }
    }

    // 3. Enforce minimum circulation width (1.2m corridors)
    for (const room of result) {
      if (room.name === 'Circulation' || room.name.toLowerCase().includes('corridor') || room.name.toLowerCase().includes('circulation')) {
        if (room.width < 1.2 && room.height < 1.2) {
          if (room.width <= room.height) room.width = 1.2
          else room.height = 1.2
          changedThisPass = true
        } else if (room.width < 1.2) {
          room.width = 1.2
          changedThisPass = true
        } else if (room.height < 1.2) {
          room.height = 1.2
          changedThisPass = true
        }
      }
    }

    // 4. Resolve overlaps between non-circulation rooms
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j]
        if (a.name === 'Circulation' || b.name === 'Circulation') continue
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        if (overlapX > 0.02 && overlapY > 0.02) {
          if (overlapX < overlapY) {
            if (a.x < b.x) b.x = a.x + a.width
            else a.x = b.x + b.width
          } else {
            if (a.y < b.y) b.y = a.y + a.height
            else a.y = b.y + b.height
          }
          changedThisPass = true
        }
      }
    }

    // 5. Clamp to footprint
    for (const room of result) {
      if (room.x + room.width > fpW) room.width = Math.max(0.5, fpW - room.x)
      if (room.y + room.height > fpH) room.height = Math.max(0.5, fpH - room.y)
      room.x = snap05(Math.max(0, room.x))
      room.y = snap05(Math.max(0, room.y))
      room.width = snap05(Math.max(room.width, 0.5))
      room.height = snap05(Math.max(room.height, 0.5))
    }

    if (!changedThisPass) break
  }

  return result
}

function normalizeFootprint(area: number) {
  const targetAspect = area <= 140 ? 1.25 : 1.18
  const width = Math.sqrt(area * targetAspect)
  const height = area / width
  return {
    width: Math.ceil(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  }
}

function programFromArea(area: number, buildingType: string): Array<{ name: string; ratio: number }> {
  if (!isResidential(buildingType)) {
    return getRoomProgram(buildingType)
  }

  if (area <= 79) {
    return [
      { name: 'Living / Kitchen / Dining', ratio: 0.45 },
      { name: 'Bedroom 1', ratio: 0.24 },
      { name: 'Bedroom 2', ratio: 0.19 },
      { name: 'Bathroom 1', ratio: 0.12 },
    ]
  }

  if (area <= 80) {
    return [
      { name: 'Lounge / Dining', ratio: 0.27 },
      { name: 'Kitchen', ratio: 0.12 },
      { name: 'Bedroom 1', ratio: 0.18 },
      { name: 'Bedroom 2', ratio: 0.15 },
      { name: 'Bathroom 1', ratio: 0.10 },
      { name: 'Circulation', ratio: 0.10 },
    ]
  }

  if (area <= 100) {
    return [
      { name: 'Lounge / Dining', ratio: 0.28 },
      { name: 'Kitchen', ratio: 0.14 },
      { name: 'Bedroom 1', ratio: 0.21 },
      { name: 'Bedroom 2', ratio: 0.17 },
      { name: 'Bathroom 1', ratio: 0.11 },
      { name: 'Circulation', ratio: 0.09 },
    ]
  }

  if (area <= 110) {
    const totalNoCirc = 0.26 + 0.11 + 0.16 + 0.14 + 0.12 + 0.08
    return [
      { name: 'Lounge / Dining', ratio: 0.26 / totalNoCirc },
      { name: 'Kitchen', ratio: 0.11 / totalNoCirc },
      { name: 'Bedroom 1', ratio: 0.16 / totalNoCirc },
      { name: 'Bedroom 2', ratio: 0.14 / totalNoCirc },
      { name: 'Bedroom 3', ratio: 0.12 / totalNoCirc },
      { name: 'Bathroom 1', ratio: 0.08 / totalNoCirc },
    ]
  }

  return [
    { name: 'Lounge / Dining', ratio: 0.22 },
    { name: 'Kitchen', ratio: 0.10 },
    { name: 'Bedroom 1', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Bathroom 1', ratio: 0.07 },
    { name: 'Bathroom 2', ratio: 0.06 },
    { name: 'Veranda', ratio: 0.05 },
  ]
}

export function generatePlanModel(design: DesignOption): PlanModel {
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const floors = Math.max(1, design.floors || 1)
  let footprint = normalizeFootprint(area)
  const wallThickness = 0.2

  const program = programFromArea(area, buildingType)

  // Pre-generation feasibility gate: ensure footprint can fit all rooms at §5 minimums
  footprint = ensureFeasibleFootprint(footprint, program)

  // Level programme profile for multi-storey buildings
  const levelProfile = floors > 1 ? computeLevelProgrammes(buildingType, floors) : null

  // Generate vertical chassis for multi-storey buildings
  const verticalWarnings: string[] = []
  let chassis = null
  let structuralBridge: ReturnType<typeof computeStructuralBridge> | null
  if (floors > 1) {
    chassis = generateBuildingChassis({
      typology: buildingType,
      storeyCount: floors,
      buildingWidth: footprint.width,
      buildingDepth: footprint.height,
      floorToFloorHeight: 3.0,
      wallThickness,
      structuralSystem: floors <= 2 ? 'masonry' : 'rc-frame',
      maxStructuralSpan: 6.0,
      hasLift: floors >= 3,
      hasDuplex: buildingType === 'duplex' || buildingType === 'townhouse',
      hasMixedUse: buildingType === 'mixed-use',
      programmes: levelProfile ? levelProfile.levels.map(l => l.floorRole) : Array(floors).fill(buildingType),
    })

    // Validate vertical constraints
    const vReport = validateVerticalConstraints(chassis)
    verticalWarnings.push(...vReport.warnings)

    // Level stack check
    const stackResult = computeLevelStack(chassis)
    verticalWarnings.push(...stackResult.alignmentWarnings)

    // Circulation separation for mixed-use
    if (chassis.circulationModel.separated) {
      const circResult = validateCirculationSeparation(chassis)
      verticalWarnings.push(...circResult.warnings)
    }

    // Update circulation model for mixed-use
    if (buildingType === 'mixed-use') {
      chassis.circulationModel = buildMixedUseCirculation(chassis)
      verticalWarnings.push('[Mixed-Use] Circulation model built with retail/public, residential/private, and service/BOH routes')
    }

    // Add party wall for duplex
    if (buildingType === 'duplex' || buildingType === 'townhouse') {
      const partyWall = generatePartyWall(chassis)
      chassis.partyWalls = [partyWall]
    }

    // Compute structural bridge
    structuralBridge = computeStructuralBridge(chassis)
    for (const sw of structuralBridge.warnings) {
      verticalWarnings.push(`[Structural] ${sw}`)
    }

    // Detect wet rooms that should stack
    const wetRoomNames = program.filter(p => isWetRoom(p.name)).map(p => p.name)
    for (const w of wetRoomNames) {
      verticalWarnings.push(`[Chassis] Wet room "${w}" should stack with shaft-aligned zone`)
    }
  }

  if (floors <= 1) {
    // Single floor: compliance-driven retry with up to 12 attempts
    let bestLayout: FloorLayoutResult | null = null
    let bestRejectedWarnings: string[] = []
    let bestPlanModel: PlanModel | null = null
    let bestViolationCount = Infinity

    const templates = listHouseTemplates(footprint.width * footprint.height)
    for (let retry = 0; retry < 12; retry++) {
      const baseSeed = Date.now()
      const templateOffset = retry < templates.length ? retry : (templates.length - 1 - (retry - templates.length))
      const seed = baseSeed + templateOffset * 7919 + retry * 5003
      const layoutResult = generateLayoutByTypology(
        buildingType,
        program,
        footprint.width,
        footprint.height,
        seed,
      )

      const rawRooms = layoutResult.rooms
      const rooms = rawRooms.map(r => ({
        id: r.id,
        name: r.name,
        x: snap05(r.x),
        y: snap05(r.y),
        width: snap05(Math.max(r.width, 0.5)),
        height: snap05(Math.max(r.height, 0.5)),
        color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][((seed * 16807) % 2147483647) % 8],
      }))

      let result = assemblePlan({
        rooms,
        width: footprint.width,
        height: footprint.height,
        wallThickness,
        designOptionId: design.id,
      })

      if (result.plan) {
        const plan = result.plan as PlanModel
        const processed = postProcessRooms(plan.rooms.map(r => ({ ...r })), footprint.width, footprint.height)
        result = assemblePlan({
          rooms: processed,
          width: footprint.width,
          height: footprint.height,
          wallThickness,
          designOptionId: design.id,
        })
      }

      // Compliance check: detect rooms below §5 minimum dimensions
      if (result.plan && retry < 11) {
        const violations = validatePlanCompliance(result.plan as PlanModel)
        if (violations.length > 0) {
          // Track worst violation count to find the best result so far
          if (violations.length < bestViolationCount) {
            bestViolationCount = violations.length
            bestPlanModel = result.plan as PlanModel
          }
          // Expand minimum rooms in the next iteration by adjusting footprint slightly
          footprint.width = Math.round((footprint.width + 0.3) * 10) / 10
          footprint.height = Math.round((footprint.height + 0.3) * 10) / 10
          continue
        }
      }

      // Track best plan model for fallback
      if (result.plan && !bestPlanModel) {
        bestPlanModel = result.plan as PlanModel
      }

      if (!result.rejected && layoutResult.valid !== false) {
        const planModel = result.plan as PlanModel
        if (layoutResult.entranceMarkers && layoutResult.entranceMarkers.length > 0) {
          planModel.entranceMarkers = layoutResult.entranceMarkers
        }
        const allWarnings = [...result.warnings, ...verticalWarnings, ...(layoutResult.warnings || [])]
        if (allWarnings.length > 0) {
          if (import.meta.env.DEV) console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
        }
        stampSpatialExtras(planModel, layoutResult)
        return planModel
      }

      // Track best despite rejection for fallback
      if (!bestLayout || result.warnings.length < bestRejectedWarnings.length) {
        bestLayout = { ...layoutResult, rooms: layoutResult.rooms, warnings: layoutResult.warnings, entranceMarkers: layoutResult.entranceMarkers, valid: false }
        bestRejectedWarnings = result.warnings
      }
    }

    // All retries exhausted — use best plan model if available, otherwise fall back
    if (import.meta.env.DEV) console.error(`[plan-generator] PLAN REJECTED after 12 retries: ${bestRejectedWarnings.filter(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected')).join('; ')}`)
    if (bestPlanModel) {
      const plan = bestPlanModel
      stampSpatialExtras(plan, bestLayout || { rooms: [], warnings: [], entranceMarkers: [] })
      return plan
    }

    const bestRooms = (bestLayout?.rooms || []).map(r => ({
      id: r.id,
      name: r.name,
      x: snap05(r.x),
      y: snap05(r.y),
      width: snap05(Math.max(r.width, 0.5)),
      height: snap05(Math.max(r.height, 0.5)),
      color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.abs(Date.now() * 16807) % 8],
    }))
    let fallbackResult = assemblePlan({
      rooms: bestRooms,
      width: footprint.width,
      height: footprint.height,
      wallThickness,
      designOptionId: design.id,
    })
    if (fallbackResult.plan) {
      const plan = fallbackResult.plan as PlanModel
      plan.rooms = postProcessRooms(plan.rooms.map(r => ({ ...r })), footprint.width, footprint.height)
      fallbackResult = assemblePlan({
        rooms: plan.rooms,
        width: footprint.width,
        height: footprint.height,
        wallThickness,
        designOptionId: design.id,
      })
    }
    const planModel = fallbackResult.plan as PlanModel
    if (bestLayout?.entranceMarkers && bestLayout.entranceMarkers.length > 0) {
      planModel.entranceMarkers = bestLayout.entranceMarkers
    }
    const allWarnings = [...fallbackResult.warnings, ...verticalWarnings, ...(bestLayout?.warnings || [])]
    if (allWarnings.length > 0 && import.meta.env.DEV) {
      console.warn(`[plan-generator] ${allWarnings.length} warnings (fallback):`, allWarnings.slice(0, 8))
    }
    stampSpatialExtras(planModel, bestLayout)
    return planModel
  }

  // Multi-storey: generate per-floor rooms with level-specific programmes
  const allRooms: { id: string; name: string; x: number; y: number; width: number; height: number; color?: string }[] = []
  const allEntranceMarkers: PlanningZoneMarker[] = []
  let groundLayoutResult: FloorLayoutResult | null = null
  const palette = ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309']

  for (let fi = 0; fi < floors; fi++) {
    const levelProgramme = levelProfile ? getAllocationProgramme(levelProfile, fi) : program
    const floorRole = levelProfile ? getLevelFloorRole(levelProfile, fi) : 'ground-public'

    const floorContext: FloorContext = {
      levelIndex: fi,
      totalFloors: floors,
      floorRole,
      isGround: fi === 0,
      isRoof: fi === floors - 1,
      programmeTags: levelProfile?.levels[fi]?.programmeTags ?? [],
    }

    // Generate level-specific rooms with retry on failure
    let rawRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
    let layoutWarnings: string[] = []
    let floorEntranceMarkers: PlanningZoneMarker[] = []
    let genSuccess = false

    for (let retry = 0; retry < 3; retry++) {
      try {
        const seed = Date.now() + fi + retry * 9973
        const candidateResult = generateLayoutByTypology(
          buildingType,
          levelProgramme,
          footprint.width,
          footprint.height,
          seed,
          floorContext,
        )

        const candidateRooms = candidateResult.rooms

        // Validate: no NaN, no zero-area rooms
        const valid = candidateRooms.every(r =>
          !Number.isNaN(r.x) && !Number.isNaN(r.y) &&
          !Number.isNaN(r.width) && !Number.isNaN(r.height) &&
          r.width >= 0.3 && r.height >= 0.3,
        )

        if (valid && candidateRooms.length > 0) {
          rawRooms = candidateRooms
          layoutWarnings = candidateResult.warnings || []
          floorEntranceMarkers = candidateResult.entranceMarkers || []
          if (fi === 0) groundLayoutResult = candidateResult
          genSuccess = true
          break
        }
      } catch {
        // Retry with adjusted params
      }
    }

    if (!genSuccess) {
      // Fallback: generate zoned layout as last resort
      const fallbackResult = generateLayoutByTypology(
        buildingType,
        levelProgramme,
        footprint.width,
        footprint.height,
        Date.now() + fi,
        { ...floorContext, floorRole: 'ground-public' },
      )
      rawRooms = fallbackResult.rooms
      layoutWarnings = fallbackResult.warnings || []
      floorEntranceMarkers = fallbackResult.entranceMarkers || []
      if (fi === 0) groundLayoutResult = fallbackResult
      verticalWarnings.push(`[Level ${fi}] fallback generation used after retries`)
    }

    // Propagate packer warnings
    for (const lw of layoutWarnings) {
      verticalWarnings.push(`[Level ${fi} Layout] ${lw}`)
    }

    // Collect entrance markers from ground floor
    if (fi === 0 && floorEntranceMarkers.length > 0) {
      allEntranceMarkers.push(...floorEntranceMarkers)
    }

    // Validate entrance separation for mixed-use ground floor
    if (buildingType === 'mixed-use' && fi === 0 && rawRooms.length > 0) {
      const entranceResult = validateEntranceSeparation(rawRooms, floorEntranceMarkers)
      if (!entranceResult.valid) {
        for (const conflict of entranceResult.conflicts) {
          verticalWarnings.push(`[Mixed-Use Entrance] ${conflict}`)
        }
      } else {
        verticalWarnings.push('[Mixed-Use Entrance] All entrances properly separated: retail/public, residential/private, service/BOH')
      }
    }

    // Offset rooms per floor vertically for visualisation
    const yOffset = fi * footprint.height * 1.1

    const levelRooms = rawRooms.map(r => ({
      id: r.id,
      name: r.name,
      x: snap05(r.x),
      y: snap05(r.y + yOffset),
      width: snap05(Math.max(r.width, 0.5)),
      height: snap05(Math.max(r.height, 0.5)),
      color: palette[fi % palette.length],
    }))

    // Apply party wall clamping for duplexes
    if ((buildingType === 'duplex' || buildingType === 'townhouse') && chassis?.partyWalls.length) {
      const pwX = chassis.partyWalls[0].startX
      clampToPartyWall(levelRooms, pwX)
    }

    allRooms.push(...levelRooms)
    verticalWarnings.push(`[Level ${fi}] ${floorRole}: generated ${rawRooms.length} rooms`)
  }

  // Collect all constraint markers across floors (for post-assemblePlan addition)
  const allConstraintMarkers: { id: string; name: string; x: number; y: number; width: number; height: number; color: string }[] = []
  for (let fi = 0; fi < floors; fi++) {
    const constraints = chassis ? getConstraintsForLevel(chassis, fi) : []
    const yOffset = fi * footprint.height * 1.1
    for (const c of constraints) {
      if (c.type === 'core-reserve' || c.type === 'shaft-reserve') {
        allConstraintMarkers.push({
          id: `constraint-${fi}-${c.type}`,
          name: `[${c.label}]`,
          x: c.x,
          y: c.y + yOffset,
          width: Math.max(c.width, 0.2),
          height: Math.max(c.depth, 0.2),
          color: '#94a3b8',
        })
      }
    }
  }

  // Build the plan from all rooms
  const planWidth = footprint.width
  const planHeight = footprint.height * floors * 1.1

  // Post-process rooms across all floors to fix dimensions, overlaps, aspect ratios
  const processedRooms = postProcessRooms(allRooms, planWidth, planHeight)

  const result = assemblePlan({
    rooms: processedRooms,
    width: planWidth,
    height: planHeight,
    wallThickness,
    designOptionId: design.id,
  })

  const { plan, warnings, rejected } = result
  if (rejected && import.meta.env.DEV) {
    console.error(`[plan-generator] PLAN REJECTED: ${warnings.map(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected') ? w : '').filter(Boolean).join('; ')}`)
  }

  const planModel = plan as PlanModel
  // Add entrance markers from ground floor if any
  if (allEntranceMarkers.length > 0) {
    planModel.entranceMarkers = allEntranceMarkers
  }

  stampSpatialExtras(planModel, groundLayoutResult)

  // Add constraint markers to the final plan model (post-assemblePlan to avoid false overlap rejection)
  planModel.rooms.push(...allConstraintMarkers)

  const allWarnings = [...warnings, ...verticalWarnings]
  if (allWarnings.length > 0) {
    if (import.meta.env.DEV) console.warn(`[plan-generator] ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
  }

  return planModel
}

function seedFromId(id: string): number {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash) + id.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export function generateVariedPlanModel(
  design: DesignOption,
  seed?: number,
): PlanModel {
  const variationSeed = seed ?? seedFromId(design.id)
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const rawFootprint = normalizeFootprint(area)
  const program = programFromArea(area, buildingType)

  // Pre-generation feasibility gate
  let footprint = ensureFeasibleFootprint(rawFootprint, program)

  const wallThickness = 0.2

  // Compliance-driven retry with up to 12 attempts
  let bestPlanModel: PlanModel | null = null
  let bestViolationCount = Infinity
  let lastLayoutResult: FloorLayoutResult | null = null
  let lastRawRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  for (let retry = 0; retry < 12; retry++) {
    const layoutResult = generateLayoutByTypology(
      buildingType,
      program,
      footprint.width,
      footprint.height,
      variationSeed,
    )
    lastLayoutResult = layoutResult
    const rawRooms = layoutResult.rooms
    lastRawRooms = rawRooms

    const rooms = rawRooms.map(r => ({
      id: r.id,
      name: r.name,
      x: snap05(r.x),
      y: snap05(r.y),
      width: snap05(Math.max(r.width, 0.5)),
      height: snap05(Math.max(r.height, 0.5)),
      color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.abs(variationSeed) % 8],
    }))

    let result = assemblePlan({
      rooms,
      width: footprint.width,
      height: footprint.height,
      wallThickness,
      designOptionId: design.id,
    })

    if (result.plan) {
      const plan = result.plan as PlanModel
      const processed = postProcessRooms(plan.rooms.map(r => ({ ...r })), footprint.width, footprint.height)
      result = assemblePlan({
        rooms: processed,
        width: footprint.width,
        height: footprint.height,
        wallThickness,
        designOptionId: design.id,
      })
    }

    // Compliance check
    if (result.plan && retry < 11) {
      const violations = validatePlanCompliance(result.plan as PlanModel)
      if (violations.length > 0) {
        if (violations.length < bestViolationCount) {
          bestViolationCount = violations.length
          bestPlanModel = result.plan as PlanModel
        }
        footprint.width = Math.round((footprint.width + 0.3) * 10) / 10
        footprint.height = Math.round((footprint.height + 0.3) * 10) / 10
        continue
      }
    }

    if (result.plan && !bestPlanModel) {
      bestPlanModel = result.plan as PlanModel
    }

    const { plan, warnings, rejected } = result
    if (rejected && import.meta.env.DEV) {
      console.error(`[plan-generator] generateVariedPlanModel PLAN REJECTED: ${warnings.filter(w => w.includes('LAYOUT_REJECTED') || w.includes('overlap detected')).join('; ')}`)
    }

    const planModel = plan as PlanModel
    if (layoutResult.entranceMarkers && layoutResult.entranceMarkers.length > 0) {
      planModel.entranceMarkers = layoutResult.entranceMarkers
    }

    stampSpatialExtras(planModel, layoutResult)

    // Preserve canonical planSource
    const planWithSource = rejected
      ? { ...planModel, planSource: 'canonical-generated-plan-rejected' as PlanSource }
      : planModel

    const planWarnings = layoutResult.warnings || []
    const allWarnings = [...warnings, ...planWarnings]
    if (allWarnings.length > 0) {
      if (import.meta.env.DEV) console.warn(`[plan-generator] generateVariedPlanModel: ${allWarnings.length} warnings:`, allWarnings.slice(0, 8))
    }

    if (!rejected) return planWithSource
  }

  // All retries exhausted — use best plan model
  if (bestPlanModel) {
    stampSpatialExtras(bestPlanModel, lastLayoutResult)
    return bestPlanModel
  }

  // Ultimate fallback
  const fallbackRooms = lastRawRooms.map(r => ({ ...r }))
  const fallbackResult = assemblePlan({
    rooms: fallbackRooms,
    width: footprint.width,
    height: footprint.height,
    wallThickness,
    designOptionId: design.id,
  })
  const plan = fallbackResult.plan as PlanModel
  plan.rooms = postProcessRooms(plan.rooms.map(r => ({ ...r })), footprint.width, footprint.height)
  stampSpatialExtras(plan, lastLayoutResult)
  return plan
}
