// Embedded Skills-Architects and Urban-Design-Skills SKILL.md corpus.
//
// 12 practitioner-grade knowledge documents from the Extensions Clones repos,
// ingested through the same parseCodeDocument pipeline as the building-code
// corpus. These add comprehensive architectural domain knowledge covering
// building codes, envelope, structural systems, fire safety, materials,
// accessibility, services, cost estimation, zoning, and site analysis.
//
// Pattern: each skill text constant → parseCodeDocument → CodeDocument

import type { CodeDocument } from './types'
import { parseCodeDocument } from './extraction'

// ---------------------------------------------------------------------------
// 1. Building Codes (Skills-Architects)
// ---------------------------------------------------------------------------

export const BUILDING_CODES_SKILL = [
  'Building Codes',
  '',
  'Section 1: IBC Occupancy Groups',
  '1.1 The IBC classifies every building into one of 10 occupancy groups based on use and occupant characteristics.',
  '1.2 Group A — Assembly: A-1 fixed seating theatres 0.65m2 net/person; A-2 food/drink 1.4m2 net/person; A-3 worship recreation 0.65-2.8m2 net/person; A-4 indoor sporting 0.65m2; A-5 outdoor.',
  '1.3 Group B — Business: offices banks outpatient clinics. Occupant load 9.3m2 gross/person. Max travel 76m sprinklered 61m unsprinklered.',
  '1.4 Group E — Educational: schools K-12. 1.9m2 net/person classrooms. Storm shelter ICC 500. Fire alarm voice/evacuation.',
  '1.5 Group F — Factory: F-1 moderate hazard 11.6m2 gross/person; F-2 low hazard.',
  '1.6 Group H — High Hazard: H-1 detonation H-2 deflagration H-3 physical H-4 health H-5 semiconductor.',
  '1.7 Group I — Institutional: I-1 supervised residential; I-2 medical care 24-hour; I-3 restrained; I-4 day care.',
  '1.8 Group M — Mercantile: display and sale. 2.8m2 gross/person ground floor. Sprinklers >1115m2.',
  '1.9 Group R — Residential: R-1 transient hotels; R-2 permanent apartments; R-3 one/two family; R-4 residential care 5-16 persons.',
  '1.10 Group S — Storage: S-1 moderate hazard; S-2 low hazard parking garages.',
  '1.11 Group U — Utility: agricultural carports fences retaining walls.',
  '',
  'Section 2: Construction Types',
  '2.1 Type I noncombustible: IA 3-hour FRR all elements; IB 2-hour FRR. Materials reinforced concrete protected steel.',
  '2.2 Type II noncombustible reduced: IIA 1-hour FRR; IIB 0-hour unprotected.',
  '2.3 Type III exterior noncombustible interior any: IIIA 1-hour frame 2-hour bearing walls; IIIB 0-hour frame.',
  '2.4 Type IV heavy timber and mass timber: IV-HT legacy; IV-A mass timber 3-hour 18 stories; IV-B partial exposure 12 stories; IV-C exposed 9 stories.',
  '2.5 Type V combustible: VA 1-hour; VB 0-hour. Wood frame with gypsum board.',
  '',
  'Section 3: Height and Area Limitations',
  '3.1 IBC controls height by allowable stories above grade plane and allowable height in feet. Both must be satisfied.',
  '3.2 Sprinkler increase: NFPA 13 adds 6.1m height and 1 story. Type IB Group B M S-2 unlimited when sprinklered.',
  '3.3 Frontage increase If = [F/P - 0.25] x 100 / 0.75. Max 75%.',
  '3.4 Sprinkler area increase: multi-story 200%, single-story 300%.',
  '3.5 Allowable area per floor Aa = At + [At x If / 100] + [At x Is / 100].',
  '3.6 Unlimited area buildings IBC 507: single story NFPA 13 18.3m setback all sides.',
  '',
  'Section 4: Means of Egress',
  '4.1 Three components: exit access, exit (fire-rated), exit discharge to public way.',
  '4.2 Number of exits: 1-500 occupants 2 exits; 501-1000 3 exits; >1000 4 exits.',
  '4.3 Travel distance: A 61m/76m; B 61m/91m; H-1 23m; R 61m/76m; S-2 91m/122m (unsprinklered/sprinklered).',
  '4.4 Stair width: 7.6mm per occupant. Level components: 5.1mm per occupant.',
  '4.5 Common path of egress: general 23m; R sprinklered 38m.',
  '4.6 Dead-end corridors: general 6.1m max; sprinklered B F-1 S-1 15m.',
  '',
  'Section 5: Fire Separation',
  '5.1 Fire wall IBC 706: structural independence creates separate buildings. 2-4 hour FRR.',
  '5.2 Fire barrier IBC 707: continuous floor to roof. 1-2 hour.',
  '5.3 Fire partition IBC 708: dwelling unit separation corridor walls. 1 hour.',
  '5.4 Occupancy separation IBC Table 508.4: sprinklered 1hr common; H-2 2hr; I-2 2hr.',
  '5.5 Shaft enclosures: 4 stories or fewer 1hr; more than 4 stories 2hr.',
  '5.6 Corridor fire rating: I-2 0hr sprinklered; R 0.5hr sprinklered; A B E F M S 0hr sprinklered.',
  '',
  'Section 6: Plumbing Fixtures',
  '6.1 Assembly: WC 1/125M 1/65F; lavatories 1/200 persons.',
  '6.2 Business: WC 1/25M 1/25F; lavatories 1/40 persons.',
  '6.3 Residential R-1 R-2: 1 WC 1 lavatory 1 bath/shower per dwelling unit.',
  '',
  'Section 7: International Code Comparison',
  '7.1 IBC US: prescriptive height area tables. Fire resistance per construction type.',
  '7.2 Building Regulations England: performance-based fire strategy. Post-Grenfell combustible ban above 18m.',
  '7.3 Eurocodes: structural design EN 1990-1999. National annexes govern height limits.',
  '7.4 NCC Australia: Class 1-10 classification. FRL structural adequacy/integrity/insulation.',
  '7.5 NBC Canada: Part 3 Table 3.2.2.A. Combustible limited 6 storeys.',
].join('\n')

export const BUILDING_CODES_DOC: CodeDocument = parseCodeDocument({
  id: 'building-codes-skill',
  code: 'ibc',
  jurisdiction: 'international',
  title: 'Building Codes (IBC Occupancy, Construction, Egress, Fire)',
  text: BUILDING_CODES_SKILL,
})

// ---------------------------------------------------------------------------
// 2. Building Envelope (Skills-Architects)
// ---------------------------------------------------------------------------

export const BUILDING_ENVELOPE_SKILL = [
  'Building Envelope',
  '',
  'Section 1: Envelope Performance Requirements',
  '1.1 Four functions: structural support, weather protection, thermal and energy performance, aesthetics.',
  '1.2 Performance metrics: U-value W/m2K (lower is better), R-value m2K/W, SHGC 0-1, VLT percent, air permeability m3/h/m2 at 50Pa, Rw dB acoustic.',
  '1.3 Hot-arid climate: wall U <= 0.35, roof U <= 0.20, window U <= 2.4, SHGC <= 0.25, thermal mass >300kg/m2.',
  '1.4 Hot-humid climate: wall U <= 0.45, roof U <= 0.25, SHGC <= 0.25, vapor barrier exterior side.',
  '1.5 Temperate climate: wall U <= 0.18 (UK Part L 2021), roof U <= 0.13, window U <= 1.2.',
  '1.6 Cold climate: wall U <= 0.15, roof U <= 0.10, window U <= 0.80 triple glazing, SHGC 0.40-0.60 south.',
  '1.7 Passive House: wall U <= 0.15, window U <= 0.80, air <= 0.6 ach50, heating demand <= 15kWh/m2/yr.',
  '',
  'Section 2: Wall Systems',
  '2.1 Masonry cavity wall: 102.5mm brick 50mm cavity 100-150mm insulation 140mm block 12.5mm plaster. U 0.18-0.25. 120+ min fire. Rw 50-55dB. Cost $150-250/m2.',
  '2.2 Insulated concrete form ICF: 50-100mm EPS 150-300mm RC 50-100mm EPS. U 0.11-0.20. 120-240 min fire. Rw 50-58dB. Cost $180-300/m2.',
  '2.3 Timber frame platform: cladding cavity breather 9mm OSB 140mm studs mineral wool VCL 12.5mm plasterboard. U 0.18-0.25. 30-60 min fire. Cost $120-200/m2.',
  '2.4 Steel frame infill: cladding cavity breather 100-150mm insulation VCL 12.5mm plasterboard. U 0.20-0.35. Thermal bridging through steel studs 50x timber. Cost $130-220/m2.',
  '2.5 SIPs: 11mm OSB 117-217mm EPS/PUR 11mm OSB. U 0.12-0.20. Excellent airtightness factory-sealed. Cost $140-230/m2.',
  '2.6 CLT with external insulation: cladding cavity 100-200mm insulation 100-160mm CLT. U 0.12-0.18. 60-120 min fire chars at 0.65mm/min. Embodied carbon -10 to +30 kgCO2e/m2. Cost $200-350/m2.',
  '2.7 Curtain wall: stick system assembled on site; unitized factory-assembled panels. U whole 1.4-2.2 double 0.8-1.2 triple. Cost $400-1200/m2.',
  '2.8 Rainscreen ventilated facade: cladding 50mm cavity insulation 100-200mm structural wall. U 0.12-0.20. Fire barriers at every floor per BS 9414 NFPA 285.',
  '2.9 Precast concrete panels: 75mm face 100-150mm insulation 100mm inner. U 0.15-0.25. 120-240 min fire. Rw 50-58dB. Cost $200-400/m2.',
  '2.10 Mass timber internal insulation: CLT 100-200mm service void insulation VCL plasterboard. U 0.15-0.25. Embodied carbon -20 to +20. Cost $220-380/m2.',
  '',
  'Section 3: Glazing Systems',
  '3.1 Glass types: float annealed 3-19mm; toughened tempered 4-19mm; laminated 6.4-25mm+; insulated IGU 24-60mm; wired; fire-rated 15-54mm.',
  '3.2 Low-e coatings: hard coat pyrolytic emissivity 0.15-0.20; soft coat sputtered 0.02-0.05. Solar control SHGC 0.15-0.35 VLT 40-70%.',
  '3.3 Gas fills: air baseline; argon 30% improvement; krypton 65% 12mm cavity; xenon 77% rare.',
  '3.4 Window U-values: single 5.6; double air 2.7-2.9; double argon low-e 1.1-1.4; triple argon 0.5-0.8.',
  '3.5 Frame types: aluminum no break 5.0-7.0; aluminum thermal break 1.5-3.0; timber 1.2-1.6; uPVC 1.2-1.8.',
  '3.6 WWR guidance: hot climate 20-30% total; temperate 30-45%; cold 25-40%.',
  '',
  'Section 4: Roof Systems',
  '4.1 Flat warm deck: membrane insulation VCL deck. U 0.10-0.18. Falls min 1:60.',
  '4.2 Flat inverted: ballast filter XPS insulation membrane deck. U 0.15-0.25.',
  '4.3 Green roof extensive: sedum 80-150mm 60-180kg/m2. Stormwater 50-90% retention.',
  '4.4 Pitched ventilated cold roof: tiles battens underlay ventilated cavity insulation VCL plasterboard. U 0.10-0.16.',
  '',
  'Section 5: Moisture Management',
  '5.1 Perfect wall order: rain screen, air barrier, thermal insulation, vapor control layer, structure.',
  '5.2 Vapor drive: cold outward VCL interior; hot-humid inward VCL exterior; mixed smart VCL.',
  '5.3 Glaser method BS EN ISO 13788: temperature gradient dewpoint analysis. Max 200g/m2 non-absorbent 500g/m2 absorbent.',
  '',
  'Section 6: Thermal Bridge Prevention',
  '6.1 Psi-values typical: wall-floor 0.16 good 0.08 Passive House 0.01; window head 0.15 good 0.05; balcony uninsulated 0.50-1.00.',
  '6.2 Continuous insulation most effective strategy. Thermal break connectors Schock Isokorb reduces psi from 0.70 to 0.15 W/mK.',
  '6.3 Window install in insulation plane. Insulation return into reveal min 30mm over frame.',
].join('\n')

export const BUILDING_ENVELOPE_DOC: CodeDocument = parseCodeDocument({
  id: 'building-envelope-skill',
  code: 'envelope',
  jurisdiction: 'international',
  title: 'Building Envelope Design (Walls, Glazing, Roofs, Thermal)',
  text: BUILDING_ENVELOPE_SKILL,
})

// ---------------------------------------------------------------------------
// 3. Structural Systems (Skills-Architects)
// ---------------------------------------------------------------------------

export const STRUCTURAL_SYSTEMS_SKILL = [
  'Structural Systems',
  '',
  'Section 1: Structural System Selection',
  '1.1 Selection criteria: building height, span, load, material availability, cost, speed, fire resistance, sustainability.',
  '1.2 System hierarchy: load path from roof to foundations. Gravity loads: dead + live + snow. Lateral loads: wind + seismic.',
  '1.3 Material families: concrete (reinforced/prestressed), steel (hot-rolled/cold-formed), timber (solid/glulam/CLT), masonry (loadbearing/infill).',
  '',
  'Section 2: Concrete Structures',
  '2.1 Cast-in-situ RC: flat slab 200-300mm spans 7-10m; beam-slab 150mm slab + 300-600mm beams spans 8-12m; ribbed slab voided 200-300mm spans 10-15m.',
  '2.2 Span-to-depth ratios: flat slab L/d 30-33; beam-slab slab L/d 20-25 beams L/d 12-15; post-tensioned L/d 35-45.',
  '2.3 Column sizing: typical 300x300mm to 600x600mm. Load capacity 500-5000kN depending on height and reinforcement.',
  '2.4 Foundation types: isolated pad 1-3m2; strip footing continuous; raft slab full coverage; piled deep foundations.',
  '2.5 Concrete grades: C20/25 to C50/60. Reinforcement B500B/C. Cover 25-50mm depending on exposure.',
  '',
  'Section 3: Steel Structures',
  '3.1 Hot-rolled sections: universal beams UB 150-1000mm depth; universal columns UC 150-350mm. Spans 6-15m typical.',
  '3.2 Composite steel-concrete: steel beam + profiled deck + concrete topping. Efficient 8-12m spans. Reduced beam size.',
  '3.3 Frame types: moment frame rigid connections 6-12m bays; braced frame diagonal bracing 6-9m; core walls lateral stability.',
  '3.4 Fire protection to steel: intumescent paint 30-120min; board encapsulation 60-240min; spray application 60-120min.',
  '',
  'Section 4: Timber Structures',
  '4.1 Glulam beams: 100-1200mm depth spans 6-20m. Strength class GL24-GL32.',
  '4.2 CLT panels: 3-7 layers 75-300mm thick. Planar elements for floors walls roofs. Spans 3-8m depending on thickness.',
  '4.3 Light timber frame: 89-235mm studs at 400-600mm centers. Platform frame max 4-5 storeys.',
  '4.4 Mass timber tall buildings: IV-A 18 storeys fully encapsulated; IV-B 12 storeys partial exposure; IV-C 9 storeys exposed.',
  '',
  'Section 5: Lateral Stability',
  '5.1 Wind loads: basic wind speed x terrain factor x height factor x pressure coefficients. Typical 0.5-1.5 kN/m2 facade.',
  '5.2 Seismic design: response spectrum analysis; ductile detailing in high seismic zones. Importance factor 1.0-1.5.',
  '5.3 Lateral systems: shear walls (concrete/CLT), braced frames (steel), moment frames (steel/RC), cores.',
  '5.4 Deflection limits: floor L/250 to L/500; roof L/180 to L/300; cladding L/150. Drift H/500 typical.',
  '',
  'Section 6: Foundation Design',
  '6.1 Shallow foundations: bearing capacity 50-500 kPa depending on soil. Settlement limits 25mm total 10mm differential.',
  '6.2 Deep foundations: bored piles 600-1500mm diameter; driven precast 300-600mm; pile caps connect to superstructure.',
  '6.3 Retaining walls: gravity mass concrete; reinforced cantilever 3-6m height; contiguous piled 6-15m.',
  '6.4 Soil investigation: boreholes to 1.5x building depth minimum. SPT N-values, CPT, laboratory testing.',
].join('\n')

export const STRUCTURAL_SYSTEMS_DOC: CodeDocument = parseCodeDocument({
  id: 'structural-systems-skill',
  code: 'structural',
  jurisdiction: 'international',
  title: 'Structural Systems Selection and Design',
  text: STRUCTURAL_SYSTEMS_SKILL,
})

// ---------------------------------------------------------------------------
// 4. Fire and Life Safety (Skills-Architects)
// ---------------------------------------------------------------------------

export const FIRE_LIFE_SAFETY_SKILL = [
  'Fire and Life Safety',
  '',
  'Section 1: Compartmentation',
  '1.1 Purpose: limit fire spread, protect escape routes, protect structure. Compartment size limited by floor area and volume.',
  '1.2 Compartment walls: fire-resistant construction separating building into zones. Minimum 30-120min FRR depending on occupancy and height.',
  '1.3 Compartment areas: single-storey 2000-8000m2 sprinklered; multi-storey 500-2500m2. Depends on occupancy and construction type.',
  '1.4 Shaft and duct enclosures: 1-2hr fire resistance. Service penetrations fire-stopped to same rating.',
  '',
  'Section 2: Means of Escape',
  '2.1 Travel distance: maximum distance from any point to nearest exit. IBC 61-122m; UK 18-45m depending on occupancy.',
  '2.2 Exit width: per occupant load and component type. Stairs 7.6mm/occupant; corridors/doors 5.1mm/occupant (IBC).',
  '2.3 Number of exits: minimum 2 for >50 occupants; 3 for >500; 4 for >1000.',
  '2.4 Dead-end corridors: maximum 6.1m general; 15m sprinklered low-hazard.',
  '2.5 Common path of egress: maximum 23m general before two separate paths available.',
  '',
  'Section 3: Fire Resistance',
  '3.1 FRR requirements by construction type: Type I 2-3hr; Type II 1-2hr; Type III 1-2hr exterior; Type IV heavy timber 1-2hr; Type V 0-1hr.',
  '3.2 Fire resistance of elements: structural frame, loadbearing walls, floors, roofs each rated independently.',
  '3.3 Integrity: resistance to passage of flames and hot gases. Insulation: limiting temperature rise on unexposed face.',
  '',
  'Section 4: Smoke Control',
  '4.1 Smoke ventilation: lobby ventilation 1.0m2 open area; stairwell pressurization 5-10mm H2O; atrium smoke exhaust.',
  '4.2 Smoke detectors: addressable system in all escape routes and common areas. Heat detectors in kitchens and plant rooms.',
  '4.3 Sprinkler systems: NFPA 13 standard; NFPA 13R low-rise residential; NFPA 13D single-family.',
  '',
  'Section 5: Active Fire Protection',
  '5.1 Sprinkler design: ESFR for storage; wet pipe standard; dry pipe cold areas; deluge high-hazard.',
  '5.2 Fire alarm: voice evacuation for >300 occupants. Manual call points at exits. Strobe/horn in sleeping areas.',
  '5.3 Smoke control: mechanical extract or natural ventilation. Atrium smoke reservoir minimum depth 500mm.',
].join('\n')

export const FIRE_LIFE_SAFETY_DOC: CodeDocument = parseCodeDocument({
  id: 'fire-life-safety-skill',
  code: 'fire',
  jurisdiction: 'international',
  title: 'Fire and Life Safety Design',
  text: FIRE_LIFE_SAFETY_SKILL,
})

// ---------------------------------------------------------------------------
// 5. Material Selection (Skills-Architects)
// ---------------------------------------------------------------------------

export const MATERIAL_SELECTION_SKILL = [
  'Material Selection',
  '',
  'Section 1: Eight-Criteria Evaluation Framework',
  '1.1 Criterion 1 Structural Performance: compressive strength MPa, tensile strength MPa, elastic modulus GPa, yield strength ductility, fatigue resistance, span-to-depth ratio.',
  '1.2 Criterion 2 Durability: design life 25-100+ years, moisture/freeze-thaw/UV/pollution resistance, maintenance frequency, patina character, EN 206 exposure classes.',
  '1.3 Criterion 3 Thermal Properties: thermal conductivity lambda W/mK, specific heat capacity J/kgK, thermal mass decrement delay, U-value contribution, thermal bridging psi-values.',
  '1.4 Criterion 4 Acoustic Properties: sound absorption alpha NRC, sound reduction Rw dB, impact sound Ln,w, flanking transmission.',
  '1.5 Criterion 5 Fire Performance: Euroclass A1 to F, fire resistance REI 30 to REI 240, charring rate timber 0.65mm/min softwood 0.50mm/min hardwood.',
  '1.6 Criterion 6 Embodied Carbon: kgCO2e per kg per m2 per m3, LCA stages A1-A5 B1-B7 C1-C4 D, recyclability, circular economy Design for Disassembly.',
  '1.7 Criterion 7 Cost: material cost per m2/m3/linear meter, installation labor, maintenance replacement whole-life cost.',
  '1.8 Criterion 8 Aesthetic Quality: color texture pattern translucency, surface finish, ageing character, tectonic expression.',
  '',
  'Section 2: Decision Matrix',
  '2.1 Scoring: 1 poor to 5 excellent per criterion. Weighting multipliers 1.0-3.0. Highest weighted total = preferred option.',
  '2.2 Sensitivity analysis: vary weights plus/minus 0.5 to test robustness. Options within 5% treat as equivalent.',
  '',
  'Section 3: Structural Materials',
  '3.1 Concrete: compressive 20-80 MPa, density 2400 kg/m3, embodied carbon 100-400 kgCO2e/m3. Durable 50-100 years. Recyclable as aggregate.',
  '3.2 Steel: yield 250-550 MPa, density 7850 kg/m3, embodied carbon 8-15 kgCO2e/kg. 90%+ recyclable. Thermal conductivity 50 W/mK.',
  '3.3 Timber: compressive 20-50 MPa, density 350-700 kg/m3, embodied carbon -700 to -1000 kgCO2e/m3 carbon sequestration. Renewable.',
  '3.4 Masonry: compressive 5-100 MPa depending on unit, density 1800-2400 kg/m3, embodied 0.2-2.0 kgCO2e/kg. 100+ year durability.',
  '',
  'Section 4: Envelope Materials',
  '4.1 Insulation: mineral wool lambda 0.035-0.040 W/mK, non-combustible A1; PIR/PUR lambda 0.022-0.028, combustible; XPS lambda 0.034, moisture-resistant.',
  '4.2 Membranes: EPDM 25-35 year life; TPO/PVC 20-30 years; bituminous 20-25 years.',
  '4.3 Cladding: fiber cement 6-12mm; HPL 6-8mm; terracotta 30mm; aluminum composite 4mm; stone 30-50mm.',
].join('\n')

export const MATERIAL_SELECTION_DOC: CodeDocument = parseCodeDocument({
  id: 'material-selection-skill',
  code: 'materials',
  jurisdiction: 'international',
  title: 'Architectural Material Selection and Specification',
  text: MATERIAL_SELECTION_SKILL,
})

// ---------------------------------------------------------------------------
// 6. Accessibility Design (Skills-Architects)
// ---------------------------------------------------------------------------

export const ACCESSIBILITY_DESIGN_SKILL = [
  'Accessibility Design',
  '',
  'Section 1: Universal Design Principles',
  '1.1 Seven Principles of Universal Design (Ronald Mace 1997): Equitable Use, Flexibility in Use, Simple and Intuitive Use, Perceptible Information, Tolerance for Error, Low Physical Effort, Size and Space for Approach and Use.',
  '1.2 Equitable Use: same means of use for all users. Avoid segregating or stigmatizing. Appeal to all users.',
  '1.3 Flexibility in Use: choice in methods, right/left handed access, adaptable to user pace.',
  '1.4 Perceptible Information: multiple modes pictorial verbal tactile, adequate contrast, maximize legibility.',
  '1.5 Low Physical Effort: minimize repetitive actions, minimize sustained physical effort.',
  '1.6 Size and Space: approach and use regardless body size posture mobility. Clear floor space 760x1220mm minimum.',
  '',
  'Section 2: ADA/ABA Accessibility Standards',
  '2.1 Accessible route: minimum clear width 915mm (36in). Cross slope max 1:50 (2%). Running slope max 1:20 (5%) ramp 1:12 (8.33%).',
  '2.2 Ramps: max slope 1:12. Rise max 760mm (30in) per run. Level landing 1525mm at top and bottom. Handrails both sides if rise >150mm.',
  '2.3 Doors: clear opening 815mm (32in) minimum. Maneuvering clearance 1525mm. Lever handles. Max opening force 22N. Closer max 5 seconds.',
  '2.4 Corridors: minimum clear width 915mm. Turning space 1525x1525mm at intersections.',
  '2.5 Elevators: cab minimum 1100x1400mm. Door clear width 815mm. Braille and raised characters at controls. Audible signals.',
  '2.6 Accessible toilet: 1500x1500mm clear floor space. WC height 430-485mm. Grab bars. Grab rail height 840-915mm.',
  '',
  'Section 3: International Standards Comparison',
  '3.1 ADA US: 2010 Standards. Accessible route 915mm. Ramp 1:12. WC 1500x1500mm. Tactile warning 610mm strip.',
  '3.2 Equality Act BS 8300 UK: Part M4(2) accessible adaptable; M4(3) wheelchair user. Approach zone 1000mm.',
  '3.3 DIN 18040 Germany: level access mandatory for public buildings. Corridor 1200mm. Turning circle 1500mm diameter.',
  '3.4 AS 1428 Australia: among most stringent for public buildings. 1200mm corridors. Tactile ground surface indicators.',
  '',
  'Section 4: Sensory Accessibility',
  '4.1 Visual impairment: contrast ratio 30% minimum between adjacent surfaces. Tactile indicators. Braille signage at 1400mm height. Adequate lighting 200-300 lux.',
  '4.2 Hearing impairment: hearing loop systems. Visual alarms strobe. Induction loops at counters. Captioning on video.',
  '4.3 Neurodiversity: clear wayfinding, consistent layouts, quiet rooms, controlled lighting, wayfinding color coding.',
  '',
  'Section 5: Aging in Place',
  '5.1 Zero-step entry. Wide doorways 915mm. Lever handles throughout. Blocking in walls for future grab bars.',
  '5.2 Accessible kitchen: roll-under sink, lower worktops, side-opening oven. Bathroom: walk-in shower, shower seat.',
].join('\n')

export const ACCESSIBILITY_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'accessibility-design-skill',
  code: 'accessibility',
  jurisdiction: 'international',
  title: 'Accessibility and Universal Design Standards',
  text: ACCESSIBILITY_DESIGN_SKILL,
})

// ---------------------------------------------------------------------------
// 7. Building Services (Skills-Architects)
// ---------------------------------------------------------------------------

export const BUILDING_SERVICES_SKILL = [
  'Building Services for Architects',
  '',
  'Section 1: HVAC Systems',
  '1.1 Mechanical plant as percentage of GFA: commercial office 5-8%; hospital 8-12%; hotel 5-7%; residential 2-4%.',
  '1.2 Natural ventilation: floor plate depth max 12-15m. No ceiling void for ductwork. Energy 0 kWh/m2/yr ventilation.',
  '1.3 Mixed-mode hybrid: natural when conditions permit mechanical backup. Floor plate 12-18m. Ceiling void 200-400mm.',
  '1.4 Fan coil units FCU + fresh air: ceiling void 350-500mm. AHU plant 2-3% GFA. Chiller 1-2% GFA. COP 3.5-5.0.',
  '1.5 Variable air volume VAV: ceiling void 500-800mm. AHU plant 3-5% GFA. Main duct 800x400 to 1500x800mm.',
  '1.6 Chilled beams active and passive: ceiling void 300-450mm. COP 4.0-6.0. Excellent energy but limited cooling 80-120 W/m2.',
  '',
  'Section 2: Plumbing and Drainage',
  '2.1 Water supply: cold water storage, boosted cold water, hot water generation.',
  '2.2 Drainage: below-ground gravity 100mm pipes min 1:40 fall. Above-ground 100mm soil stacks.',
  '2.3 Fixtures per occupancy: WC 1/25 persons business; basin 1/40 persons; urinal 1/45 males.',
  '',
  'Section 3: Electrical Systems',
  '3.1 Distribution: HV intake 11kV transformer LV 400/230V distribution board circuit protection.',
  '3.2 Lighting: office 500 lux; corridor 100 lux; store 200 lux. Emergency 1 lux minimum escape route.',
  '3.3 Fire alarm: L1 detection throughout; L2 common areas + escape routes; L3 escape routes + rooms opening to them.',
  '',
  'Section 4: Vertical Transportation',
  '4.1 Passenger elevators: capacity 450-2500kg; speed 1-10m/s. Round-trip time 25-30 seconds peak. 1 per 30-40 floors.',
  '4.2 Escalators: 30-60 degree inclination. 0.5-0.75m/s speed. 10,000 persons/hour capacity.',
  '4.3 Plant: machine room above or below; machine-room-less MRL traction for buildings up to 20 storeys.',
  '',
  'Section 5: Fire Protection Systems',
  '5.1 Sprinklers: NFPA 13 design. ESFR for high-pile storage. Wet pipe standard. Dry pipe unheated areas.',
  '5.2 Smoke control: atrium exhaust 10-15 air changes per hour. Stair pressurization 5-10mm H2O.',
].join('\n')

export const BUILDING_SERVICES_DOC: CodeDocument = parseCodeDocument({
  id: 'building-services-skill',
  code: 'mep',
  jurisdiction: 'international',
  title: 'Building Services (HVAC, Plumbing, Electrical, Vertical Transport)',
  text: BUILDING_SERVICES_SKILL,
})

// ---------------------------------------------------------------------------
// 8. Architect Calculator (Skills-Architects)
// ---------------------------------------------------------------------------

export const ARCHITECT_CALCULATOR_SKILL = [
  'Architect Calculator',
  '',
  'Seven Python-based architectural calculators for common design computations.',
  '',
  '1. Area Calculator: site area, floor area ratio FAR, net-to-gross ratio 0.80 default, average unit size 85m2, persons per unit 2.5, parking ratio 1.0. Outputs GFA NGA units population parking.',
  '2. U-Value Calculator: multi-layer thermal transmittance. Sum of layer thickness/conductivity + surface resistances Rsi 0.13 Rse 0.04.',
  '3. Daylight Factor: BRE methodology. DF = (Ag x T x M) / (Afloor x (1-R2)). Target 2% minimum for offices. Glazing ratio, maintenance factor 0.8, reflectance 0.5.',
  '4. Egress Calculator: occupant load by occupancy type. Exit width 5.1mm per person level 7.6mm stairs. Travel distance limits by occupancy and sprinkler status.',
  '5. Structural Calculator: dead load + live load + snow load. Tributary area method. Typical residential 1.5 kN/m2 live load. Snow 0.6-1.5 kN/m2.',
  '6. Energy Demand: degree-day method. Heating degree days x fabric heat loss coefficient x volume. Typical 30-60 kWh/m2/yr heating for residential.',
  '7. Cost Estimator: construction cost per m2 by building type and quality. Residential $600-2500/m2. Commercial $1200-5000/m2. Include professional fees 10-15% and contingency 5-10%.',
].join('\n')

export const ARCHITECT_CALCULATOR_DOC: CodeDocument = parseCodeDocument({
  id: 'architect-calculator-skill',
  code: 'calculator',
  jurisdiction: 'international',
  title: 'Architectural Calculator Suite (Area, U-Value, Daylight, Egress, Structural, Energy, Cost)',
  text: ARCHITECT_CALCULATOR_SKILL,
})

// ---------------------------------------------------------------------------
// 9. Urban Calculator (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const URBAN_CALCULATOR_SKILL = [
  'Urban Calculator',
  '',
  'Python computational tools for urban design metric calculations.',
  '',
  '1. Density Calculator: population density persons/ha and dwelling density DU/ha from site area FAR avg unit size efficiency household size residential percentage. Typical: 50-100 DU/ha medium density 100-200 DU/ha high density.',
  '2. FAR Calculator: floor area ratio and GFA by use from site area coverage floors use split. Bonus FAR for affordable housing. FAR 0.5-1.0 low density 1.0-2.0 medium 2.0-4.0 high.',
  '3. Walkability Scorer: Walk Score 0-100 from amenity distances and intersection density. 90-100 Walker Paradise; 70-89 Very Walkable; 50-69 Somewhat Walkable; 0-49 Car Dependent.',
  '4. Parking Calculator: parking requirements with transit and TDM reductions. Residential 1.0-2.0 spaces/unit. Office 3-4 per 100m2. Retail 3-5 per 100m2. Transit reduction 20-30%. Shared reduction 10-20%.',
  '5. Green Space Analyzer: per capita m2 of green space WHO minimum 9m2. Service coverage within 300m walking distance. Target 15-25% of site area green.',
  '6. Block Optimizer: block dimensions for target FAR height coverage daylight access. Optimal block depth 20-30m for residential cross-ventilation.',
].join('\n')

export const URBAN_CALCULATOR_DOC: CodeDocument = parseCodeDocument({
  id: 'urban-calculator-skill',
  code: 'urban-calc',
  jurisdiction: 'international',
  title: 'Urban Design Calculator Suite (Density, FAR, Walkability, Parking, Green Space)',
  text: URBAN_CALCULATOR_SKILL,
})

// ---------------------------------------------------------------------------
// 10. Cost Estimation (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const COST_ESTIMATION_SKILL = [
  'Cost Estimation',
  '',
  'Systematic framework for estimating capital costs of urban design projects.',
  '',
  'Section 1: Building Construction Cost per m2 GFA',
  '1.1 Residential: detached house $800-2500/m2; townhouse $750-2200/m2; low-rise apartment $900-2400/m2; mid-rise $1100-3000/m2; high-rise $1400-4000/m2.',
  '1.2 Commercial: office standard $1200-3500/m2; office Grade A LEED $1800-5000/m2; retail shell $700-2000/m2; hotel 3-star $1400-2800/m2; hotel 5-star $2500-8000/m2.',
  '1.3 Civic: primary school $1200-3500/m2; hospital $2500-7500/m2; community center $1000-3000/m2; library $1400-4500/m2.',
  '1.4 Parking: surface lot $100-170/m2; structured above-grade $570-1000/m2; underground 1 level $875-1250/m2.',
  '',
  'Section 2: Regional Cost Adjustment Factors',
  '2.1 US Northeast/California 1.20-1.40. US Southeast/Midwest 0.85-1.00 base.',
  '2.2 UK London 1.30-1.50. UK regions 1.00-1.20. Europe Germany 1.00-1.15.',
  '2.3 Sub-Saharan Africa 0.40-0.70. Middle East 0.60-0.90. South Asia 0.30-0.50.',
  '2.4 Zimbabwe regional: Harare 1.00 base. Bulawayo 0.90-0.95. Rural 0.70-0.85.',
  '',
  'Section 3: Infrastructure Costs',
  '3.1 Roads: $50-150/m2 for minor; $100-300/m2 for collector; $200-500/m2 for arterial.',
  '3.2 Water supply: $15-40/m linear meter for distribution mains. $2000-5000 per connection.',
  '3.3 Sewerage: $20-60/m linear meter. $1500-4000 per connection. Treatment plant $500-2000/capita.',
  '3.4 Stormwater: $10-30/m linear meter. Detention basins $20-50/m3 storage.',
  '',
  'Section 4: Soft Costs',
  '4.1 Professional fees: architect 8-12%; engineer 5-8%; quantity surveyor 2-4%; total 10-20%.',
  '4.2 Contingency: design development 5-10%; preliminary 10-15%; concept 15-25%.',
  '4.3 Developer overhead: 10-15% of total development cost.',
].join('\n')

export const COST_ESTIMATION_DOC: CodeDocument = parseCodeDocument({
  id: 'cost-estimation-skill',
  code: 'cost',
  jurisdiction: 'international',
  title: 'Construction Cost Estimation (Building, Infrastructure, Soft Costs)',
  text: COST_ESTIMATION_SKILL,
})

// ---------------------------------------------------------------------------
// 11. Zoning and Codes (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const ZONING_AND_CODES_SKILL = [
  'Zoning and Codes',
  '',
  'Comprehensive knowledge of zoning systems and building codes for urban design.',
  '',
  'Section 1: Zoning Systems',
  '1.1 Euclidean zoning: separation by use (residential commercial industrial). Overlay zones add requirements. Performance zoning sets measurable standards instead of rigid categories.',
  '1.2 Form-based codes: regulate building form rather than use. Build-to line, setbacks, height, lot coverage, facade articulation. More design flexibility than Euclidean.',
  '1.3 Transect zoning (New Urbanism): T1 rural to T6 urban core. Graduated intensity. Natural to built environment spectrum.',
  '1.4 Mixed-use zoning: vertical mixed use (retail ground floor residential above); horizontal mixed use (adjacent parcels); conditional uses.',
  '',
  'Section 2: Building Envelope Controls',
  '2.1 Height limits: measured to parapet, ridgeline, or mean height. May exclude mechanical penthouses. Setback-plane approaches allow increasing height with deeper setbacks.',
  '2.2 Lot coverage: building footprint as percentage of lot area. Typical 40-80% depending on zone. Floor area ratio FAR = total floor area / lot area.',
  '2.3 Setbacks: front side rear. Front 3-6m residential; 0-3m commercial urban. Side 1-3m; zero-lot-line on one side common for townhouses.',
  '2.4 Open space: private yards minimum; common amenity space for multi-unit. Some jurisdictions require 10-20% open space.',
  '',
  'Section 3: Residential Standards',
  '3.1 Unit density: low 8-15 DU/ha suburban; medium 25-50 DU/ha urban; high 80-200 DU/ha city center.',
  '3.2 Parking requirements: residential 1.0-2.0 spaces per unit; reduced near transit (0.5-1.0). Visitor 0.25-0.5 per unit.',
  '3.3 Building separation: minimum distance between buildings for light and privacy. 6-12m for residential; reduced in urban areas.',
].join('\n')

export const ZONING_AND_CODES_DOC: CodeDocument = parseCodeDocument({
  id: 'zoning-and-codes-skill',
  code: 'zoning',
  jurisdiction: 'international',
  title: 'Zoning Systems and Building Code Controls',
  text: ZONING_AND_CODES_SKILL,
})

// ---------------------------------------------------------------------------
// 12. Site Analysis (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const SITE_ANALYSIS_SKILL = [
  'Site Analysis',
  '',
  'Multi-scale environmental and contextual analysis methodology for building and urban design.',
  '',
  'Section 1: Multi-Scale Analysis',
  '1.1 Macro scale city/region: transport networks, growth corridors, zoning, land use patterns, infrastructure capacity.',
  '1.2 Meso scale neighborhood: block structure, street pattern, building typologies, public spaces, servicing.',
  '1.3 Micro scale site: boundaries dimensions orientation slope soil vegetation hydrology access.',
  '1.4 Analysis dimensions: context and constraints, climate and environment, access and circulation, utilities and infrastructure, regulatory framework.',
  '',
  'Section 2: Climate and Environmental Layers',
  '2.1 Solar analysis: sun path by latitude, equinox solstice noon, shadow casting from surrounding buildings and trees, solar access rights, overshadowing of public spaces.',
  '2.2 Wind analysis: prevailing direction and speed, local wind patterns, leeward shelter zones, wind funnelling through streets, pedestrian comfort criteria.',
  '2.3 Precipitation: annual rainfall patterns, stormwater runoff potential, flood risk mapping, drainage requirements, SuDS integration.',
  '2.4 Temperature: diurnal range, urban heat island potential, thermal comfort zones, cooling/heating degree days, climate-responsive design opportunities.',
  'Section 3: Solar and Wind',
  '3.1 Sun path analysis: altitude and azimuth by latitude season time. Solar envelope maximum buildable volume without shadowing neighbors. Solar access rights.',
  '3.2 Wind analysis: prevailing wind direction speed frequency. Wind comfort criteria 5m/s walking 10m/s discomfort. Pedestrian wind study with CFD.',
  '3.3 Daylight analysis: sky component external reflected component. Vertical sky component VSC minimum 27%. Annual sunlight exposure ASE 10% threshold.',
  '',
  'Section 4: Topography and Hydrology',
  '4.1 Topographic analysis: slope gradient aspect. Maximum buildable slope 15%. Retaining walls required above 3m cut/fill.',
  '4.2 Drainage: catchment area flow direction stormwater runoff coefficient 0.3-0.9. Flood risk 1:100 year return period.',
  '4.3 Soil: bearing capacity 50-500 kPa. Investigation to 1.5x building depth. Contamination assessment brownfield sites.',
  '',
  'Section 5: Ecological and Environmental',
  '5.1 Vegetation survey: specimen trees TPO conservation areas. Ecological value assessment habitat classification.',
  '5.2 Noise: ambient noise levels dB(A). Night noise 45dB residential limit. Barriers attenuation planting.',
  '5.3 Air quality: wind rose dispersion analysis. Traffic-generated pollutants. Green infrastructure mitigation.',
  '',
  'Section 6: Stakeholder Mapping',
  '6.1 Community consultation: resident groups business owners statutory authorities utility providers.',
  '6.2 SWOT analysis: strengths weaknesses opportunities threats for site and context.',
].join('\n')

export const SITE_ANALYSIS_DOC: CodeDocument = parseCodeDocument({
  id: 'site-analysis-skill',
  code: 'site',
  jurisdiction: 'international',
  title: 'Site Analysis (Topography, Climate, Solar, Wind, Ecology)',
  text: SITE_ANALYSIS_SKILL,
})
