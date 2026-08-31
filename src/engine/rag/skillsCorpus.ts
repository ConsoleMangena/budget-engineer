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

// ---------------------------------------------------------------------------
// 13. Landscape Architecture (Skills-Architects)
// ---------------------------------------------------------------------------

export const LANDSCAPE_ARCHITECTURE_SKILL = [
  'Landscape Architecture',
  '',
  'Section 1: Planting Design',
  '1.1 Plant selection: climate zone hardiness, soil pH, sun/shade tolerance, water requirements, mature size, root spread, seasonal interest.',
  '1.2 Native species priority: 70% minimum for biodiversity and low maintenance. Drought-tolerant species for arid climates.',
  '1.3 Planting zones: foundation planting, screen/buffer, accent specimen, ground cover, meadow/grassland, aquatic/wetland.',
  '1.4 Soil preparation: topsoil 150-300mm, compost amendment 20-30% by volume, mulch 75-100mm depth.',
  '',
  'Section 2: Hardscape Design',
  '2.1 Paving materials: natural stone 30-50mm thick; concrete pavers 60-80mm; clay bricks 65mm; timber decking 25-30mm.',
  '2.2 Permeable paving: minimum 30% of total hardscape for stormwater management. Sub-base 150-200mm open-graded aggregate.',
  '2.3 Retaining walls: gravity mass 0.6m max; reinforced cantilever 3-6m; gabion 3-8m; segmental block 1.2m without geogrid.',
  '',
  'Section 3: Site Grading',
  '3.1 Minimum slope away from buildings: 2% for 3m. Maximum lawn slope: 33%. Accessible routes max 5% cross slope.',
  '3.2 Cut and fill balance: aim for net zero export. Stockpile topsoil for reuse. Erosion control during construction.',
  '',
  'Section 4: Outdoor Spaces',
  '4.1 Playground safety: CPSC/ASTM fall zones, rubber mulch or poured-in-place 300mm depth, accessible route to all equipment.',
  '4.2 Outdoor seating: bench spacing 3-5m along primary paths, ADA-compliant seats 430-485mm height.',
  '4.3 Sports courts: tennis 18.3x36.6m; basketball 15.2x28.7m; multipurpose 30x40m minimum with 3m run-off.',
].join('\n')

export const LANDSCAPE_ARCHITECTURE_DOC: CodeDocument = parseCodeDocument({
  id: 'landscape-architecture-skill',
  code: 'landscape',
  jurisdiction: 'international',
  title: 'Landscape Architecture (Planting, Hardscape, Grading)',
  text: LANDSCAPE_ARCHITECTURE_SKILL,
})

// ---------------------------------------------------------------------------
// 14. Interior Design (Skills-Architects)
// ---------------------------------------------------------------------------

export const INTERIOR_DESIGN_SKILL = [
  'Interior Design',
  '',
  'Section 1: Space Planning',
  '1.1 Circulation zones: primary 1200-1500mm; secondary 900-1200mm; service 750-900mm. Clear floor space 760x1220mm minimum.',
  '1.2 Work triangle (kitchen): total 3600-7900mm between sink, hob, fridge. Single-wall max 3600mm between extremes.',
  '1.3 Furniture clearances: dining chair pullback 750mm; bed access 600mm; wardrobe door swing 900mm.',
  '',
  'Section 2: Finishes',
  '2.1 Floor finishes by space: living timber/ceramic; bathroom porcelain/non-slip R10+; kitchen porcelain/vinyl; bedroom timber/carpet.',
  '2.2 Wall finishes: wet areas tile to 1800mm minimum; living areas paint 2-coat minimum; feature walls timber/stone/texture.',
  '2.3 Ceiling finishes: moisture-resistant board in wet areas; acoustic tiles in offices 0.7-0.9 NRC; decorative in living areas.',
  '',
  'Section 3: Lighting Design',
  '3.1 Ambient: 200-300 lux living; 300-500 lux kitchen; 150-200 lux bedroom; 500-750 lux office. CRI 80+ minimum.',
  '3.2 Task: under-cabinet kitchen 300-500 lux; desk 400-500 lux; reading 300-400 lux. Dedicated circuits for dimming.',
  '3.3 Accent: 3:1 ratio ambient to accent. Track/spot for art. LED strip for cove/reveal lighting.',
  '',
  'Section 4: Storage Standards',
  '4.1 Kitchen: base 600mm deep; wall 300-350mm deep; tall 600mm. Minimum 3m linear counter for 2-person kitchen.',
  '4.2 Bedroom wardrobe: 1200-1500mm per person hanging space. Shoe storage 300mm depth. Linen closet 450mm deep.',
  '4.3 Bathroom: vanity 450-550mm deep. Recessed niche 300x400mm for shower products.',
].join('\n')

export const INTERIOR_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'interior-design-skill',
  code: 'interior',
  jurisdiction: 'international',
  title: 'Interior Design (Space Planning, Finishes, Lighting)',
  text: INTERIOR_DESIGN_SKILL,
})

// ---------------------------------------------------------------------------
// 15. Sustainability and Green Building (Skills-Architects)
// ---------------------------------------------------------------------------

export const SUSTAINABILITY_SKILL = [
  'Sustainability and Green Building',
  '',
  'Section 1: Energy Performance',
  '1.1 Passive House: heating demand <= 15 kWh/m2/yr; primary energy <= 120 kWh/m2/yr; airtightness <= 0.6 ACH50.',
  '1.2 Net-zero energy: on-site renewable generation >= annual consumption. Solar PV 150-200 Wp/m2 roof area.',
  '1.3 Embodied carbon: Structure A1-A3 typically 50-70% of whole-life. Target < 500 kgCO2e/m2 for residential.',
  '1.4 Operational carbon: heating/cooling 40-60% of operational. Fabric-first approach before renewables.',
  '',
  'Section 2: Water Efficiency',
  '2.1 Fixtures: WC 4.5/2.8L dual flush; basin aerator 4-6 L/min; shower 8 L/min. Target 100 L/person/day.',
  '2.2 Rainwater harvesting: 1m3 per 100m2 roof catchment. Non-potable use: WC flushing, irrigation, laundry.',
  '2.3 Greywater recycling: 70% reduction possible. Treatment to Class A for subsurface irrigation.',
  '',
  'Section 3: Material Sustainability',
  '3.1 Environmental Product Declarations EPD: third-party verified lifecycle data. Prefer products with EPDs.',
  '3.2 Responsible sourcing: FSC/PEFC timber; recycled steel > 90% content; low-carbon concrete GGBS/PFA 30-50% replacement.',
  '3.3 Circular economy: Design for Disassembly DfD. Mechanical connections over adhesive. Material passports.',
  '',
  'Section 4: Certification Systems',
  '4.1 LEED v4.1: Platinum 80+; Gold 60-79; Silver 50-59. Energy 26-33 pts; Water 10-12 pts; Materials 11-13 pts.',
  '4.2 BREEAM: Outstanding 85%+; Excellent 70-84%; Very Good 55-69%. Energy 15-19%; Management 12%; Health 15%.',
  '4.3 Green Star: 6 Star Premier; 5 Star Best Practice. Energy; Indoor Environment Quality; Materials; Transport.',
  '4.4 EDGE: 20% minimum reduction in energy, water, and embodied energy vs baseline. IFC/World Bank standard.',
].join('\n')

export const SUSTAINABILITY_DOC: CodeDocument = parseCodeDocument({
  id: 'sustainability-skill',
  code: 'sustainability',
  jurisdiction: 'international',
  title: 'Sustainability and Green Building (Energy, Water, Materials, Certification)',
  text: SUSTAINABILITY_SKILL,
})

// ---------------------------------------------------------------------------
// 16. Construction Management (Skills-Architects)
// ---------------------------------------------------------------------------

export const CONSTRUCTION_MANAGEMENT_SKILL = [
  'Construction Management',
  '',
  'Section 1: Planning and Scheduling',
  '1.1 Critical path method CPM: identify longest path through activity network. Float = TF - EF or LS - ES.',
  '1.2 Gantt chart: bar chart showing activity durations against calendar. Milestone diamonds for key dates.',
  '1.3 Level of detail: 5000-10000 activities for large projects. Roll-up to 200-500 for executive reporting.',
  '1.4 Weather days: allowance 10-15% in tropical climates. Rain days per month varies by region.',
  '',
  'Section 2: Cost Control',
  '2.1 Earned value EVM: CPI = BCWP/ACWP; SPI = BCWP/BCWS. CPI < 1 = over budget; SPI < 1 = behind schedule.',
  '2.2 Contingency: design development 5-10%; construction 3-5%; claims 2-3%. Total 10-18% of construction cost.',
  '2.3 Variation management: written instruction before work. Quantify within 14 days. Negotiate within 28 days.',
  '',
  'Section 3: Quality Management',
  '3.1 Inspection and Test Plan ITP: hold points, witness points, review points. Critical items 100% inspection.',
  '3.2 Non-conformance report NCR: describe deficiency, root cause, corrective action, verification of close-out.',
  '3.3 Mock-ups and samples: full-size mock-up for facade, interior finishes, waterproofing. Client approval required.',
  '',
  'Section 4: Health and Safety',
  '4.1 Risk assessment: identify hazards, evaluate risk, implement controls. Hierarchy: eliminate > substitute > control > PPE.',
  '4.2 Site setup: hoarding, access, welfare facilities, first aid, fire extinguishers, emergency procedures.',
  '4.3 PPE requirements: hard hat, hi-vis, safety boots minimum. Specialist: harness, respirator, hearing protection.',
].join('\n')

export const CONSTRUCTION_MANAGEMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'construction-management-skill',
  code: 'construction',
  jurisdiction: 'international',
  title: 'Construction Management (Planning, Cost, Quality, Safety)',
  text: CONSTRUCTION_MANAGEMENT_SKILL,
})

// ---------------------------------------------------------------------------
// 17. Project Management (Skills-Architects)
// ---------------------------------------------------------------------------

export const PROJECT_MANAGEMENT_SKILL = [
  'Project Management for Architects',
  '',
  'Section 1: RIBA Plan of Work 2020',
  '1.1 Stage 0 Strategic Definition: business case, project brief, feasibility study. 5-10% of fees.',
  '1.2 Stage 1 Preparation and Briefing: spatial requirements, sustainability objectives, site analysis. 10-15% of fees.',
  '1.3 Stage 2 Concept Design: design concept, outline specifications, cost plan. 15-20% of fees.',
  '1.4 Stage 3 Spatial Coordination: developed design, coordination with consultants, planning application. 20-25% of fees.',
  '1.5 Stage 4 Technical Design: detailed specifications, building regulations, tender documentation. 25-35% of fees.',
  '1.6 Stage 5 Manufacturing and Construction: site supervision, quality control, snagging. 15-20% of fees.',
  '1.7 Stage 6 Handover: O&M manuals, building logbook, defects liability period 12 months. 2-5% of fees.',
  '',
  'Section 2: Fee Scales',
  '2.1 RIBA fees: 8-15% of construction cost for full service. Reduced: 5-8% partial; 2-5% initial stages only.',
  '2.2 Geographic adjustments: London 1.3-1.5x; regional UK 1.0x; international varies 0.5-2.0x.',
  '2.3 Specialist services additional: interior design 3-5%; landscape 2-4%; CDM 1-2%; BIM management 2-3%.',
  '',
  'Section 3: Risk Management',
  '3.1 Risk register: probability 1-5 x impact 1-5 = risk score. Mitigate score > 12. Transfer > 16. Accept < 4.',
  '3.2 Programme risk: Monte Carlo simulation on critical path. P50 for budget; P80 for programme commitment.',
  '3.3 Design risk: value engineering workshops at Stage 3. Life-cycle costing over 25-30 year horizon.',
].join('\n')

export const PROJECT_MANAGEMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'project-management-skill',
  code: 'pm',
  jurisdiction: 'international',
  title: 'Project Management (RIBA Plan, Fees, Risk)',
  text: PROJECT_MANAGEMENT_SKILL,
})

// ---------------------------------------------------------------------------
// 18. Building Pathology (Skills-Architects)
// ---------------------------------------------------------------------------

export const BUILDING_PATHOLOGY_SKILL = [
  'Building Pathology',
  '',
  'Section 1: Defect Diagnosis',
  '1.1 Moisture sources: rain penetration, rising damp, condensation, plumbing leaks, groundwater.',
  '1.2 Rising damp: maximum height 1.2m. Salt deposits (nitrates/chlorides) on wall surface. Timber decay at base.',
  '1.3 Condensation: surface relative humidity > 80%. Thermal bridges at junctions. Inadequate ventilation 0.5 ACH minimum.',
  '1.4 Structural movement: stepped cracks in masonry (settlement); diagonal cracks at openings (lintel failure); horizontal cracks (thermal expansion).',
  '',
  'Section 2: Common Defects',
  '2.1 Roof defects: slipped tiles, failed lead joints, blocked gutters, inadequate insulation, ponding on flat roofs.',
  '2.2 Wall defects: spalling brickwork (freeze-thaw), efflorescence (salts), bulging (lateral load), cavity bridge (insulation).',
  '2.3 Floor defects: springy timber (overspanned joists), cracked screed (insufficient thickness), uneven settlement.',
  '2.4 Window defects: condensation between panes (IGU seal failure), drafts (gasket deterioration), rot (timber not maintained).',
  '',
  'Section 3: Investigation Methods',
  '3.1 Visual survey: photographic record, mapping defects on elevations/plan, distinguishing cosmetic from structural.',
  '3.2 Moisture meter: protimeter survey at 500mm grid. Reading > 30% = suspect. Calcium carbide test for accurate MC.',
  '3.3 Invasive investigation: air取 sample, small openings to inspect cavity/structure, borescope for hidden voids.',
].join('\n')

export const BUILDING_PATHOLOGY_DOC: CodeDocument = parseCodeDocument({
  id: 'building-pathology-skill',
  code: 'pathology',
  jurisdiction: 'international',
  title: 'Building Pathology (Defect Diagnosis, Investigation Methods)',
  text: BUILDING_PATHOLOGY_SKILL,
})

// ---------------------------------------------------------------------------
// 19. Acoustic Design (Skills-Architects)
// ---------------------------------------------------------------------------

export const ACOUSTIC_DESIGN_SKILL = [
  'Acoustic Design',
  '',
  'Section 1: Sound Insulation',
  '1.1 Airborne: Rw dB weighted sound reduction index. Party walls Rw 50-60dB; party floors Rw 55-65dB.',
  '1.2 Impact: Ln,w dB weighted normalized impact sound level. Party floors Ln,w < 62dB (residential); < 56dB (luxury).',
  '1.3 Flanking transmission: sound travels through junctions. Dn,f,w flanking attenuation typically 5-15dB reduction.',
  '',
  'Section 2: Room Acoustics',
  '2.1 Reverberation time RT60: speech 0.5-0.8s; music 1.2-2.0s; cinema 0.4-0.6s. T20 measured per ISO 3382.',
  '2.2 Absorption materials: acoustic ceiling tiles 0.7-0.9 NRC; carpet 0.25-0.40; curtains 0.30-0.50; hard surface 0.01-0.03.',
  '2.3 Target noise levels: open office NR35-40 (35-40 dB(A)); private office NR30-35; library NR25-30; hospital ward NR25.',
  '',
  'Section 3: Environmental Noise',
  '3.1 Road traffic:BS 8233 guidance. Living room 35 dB LAr,16h; bedroom 30 dB LAeq,16h.',
  '3.2 Mechanical plant:BS 4142 assessment. Plant room 60-70 dB at source. Silencers reduce 15-25 dB.',
  '3.3 External noise barriers: 3m height solid barrier provides 10-15dB insertion loss at 50m distance.',
].join('\n')

export const ACOUSTIC_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'acoustic-design-skill',
  code: 'acoustics',
  jurisdiction: 'international',
  title: 'Acoustic Design (Sound Insulation, Room Acoustics, Environmental Noise)',
  text: ACOUSTIC_DESIGN_SKILL,
})

// ---------------------------------------------------------------------------
// 20. Lighting Design (Skills-Architects)
// ---------------------------------------------------------------------------

export const LIGHTING_DESIGN_SKILL = [
  'Lighting Design',
  '',
  'Section 1: Daylight Design',
  '1.1 Daylight factor DF: target 2% minimum for offices; 5% for factories; 1% for storage. DF = (Ag x T x M) / (Af x (1-R2)).',
  '1.2 Window sizing: sill height 800mm min; head height 2100mm min; glazed area 20-30% floor area for 2% DF.',
  '1.3 Light shelf: redirect daylight deeper into room. External shelf 600-900mm; internal shelf 300-600mm.',
  '',
  'Section 2: Artificial Lighting',
  '2.1 Lux levels by task: office desk 500 lux; meeting room 300 lux; corridor 100 lux; store 200 lux; stair 150 lux.',
  '2.2 LED technology: efficacy 100-200 lm/W; CRI 80-95; CCT 2700-6500K; lifespan 50,000-100,000 hours.',
  '2.3 Controls: occupancy sensors corridors/toilets; daylight dimming perimeter zones; scene setting meeting rooms.',
  '',
  'Section 3: Emergency Lighting',
  '3.1 Escape route: 1 lux minimum along centre line. Open areas 0.5 lux. Duration 3 hours minimum.',
  '3.2 Fire exit signs: ISO 7010 green running man. Illuminated or photoluminescent. Mounting 2000-2500mm.',
  '3.3 Power supply: central battery or self-contained battery. Three-hour duration with one-hour standby.',
  '',
  'Section 4: Exterior Lighting',
  '4.1 Car park: 20 lux general; 50 lux entrance. LED pole-mounted 4-6m height. 150W typical per head.',
  '4.2 Facade lighting: accent ratio 3:1 minimum. LED linear for cove; spot for feature elements. Dark-sky compliant.',
].join('\n')

export const LIGHTING_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'lighting-design-skill',
  code: 'lighting',
  jurisdiction: 'international',
  title: 'Lighting Design (Daylight, Artificial, Emergency, Exterior)',
  text: LIGHTING_DESIGN_SKILL,
})

// ---------------------------------------------------------------------------
// 21. Transportation Planning (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const TRANSPORTATION_PLANNING_SKILL = [
  'Transportation Planning',
  '',
  'Section 1: Trip Generation',
  '1.1 ITE Trip Generation Manual: residential 5-8 trips/unit/day; office 2.5-4.0 trips/100m2/day; retail 30-60 trips/100m2/day.',
  '1.2 Trip distribution: gravity model Tij = Pi x Aj x f(cij) / sum(Aj x f(cij)). Friction factor f(c) = c^(-2) typical.',
  '1.3 Mode split: transit mode share 10-40% depending on service quality. Walk mode target 15-25% within 400m of transit.',
  '',
  'Section 2: Road Design',
  '2.1 Lane widths: urban collector 3.0-3.3m; local street 2.7-3.0m; shared space 2.5m. Parking lane 2.4-2.5m.',
  '2.2 Intersection: signalized capacity 1600-1800 pcu/hr per approach; roundabout 2000-3000 pcu/hr total.',
  '2.3 Parking standards: residential 1.0-1.5 spaces/unit; office 1 space/3-4 employees; retail 1 space/25m2 GLA.',
  '',
  'Section 3: Public Transit',
  '3.1 Bus stop spacing: 300-500m urban; 500-800m suburban. Shelter, seating, real-time information.',
  '3.2 BRT: dedicated lane, level boarding, off-board fare collection, 20-35 km/h average speed.',
  '3.3 Rail station: 400-800m catchment walking distance. Interchange 200m maximum transfer walk.',
  '',
  'Section 4: Pedestrian and Cyclist',
  '4.1 Sidewalk width: 1.5m minimum; 2.4m preferred urban; 3.6m+ in city centres. Accessible route throughout.',
  '4.2 Cycle track: 1.5m one-way; 2.5m two-way. Protected from traffic. Junction treatments mandatory.',
  '4.3 Walkability: intersection density > 100/km2; block length < 200m; continuous sidewalks; street trees.',
].join('\n')

export const TRANSPORTATION_PLANNING_DOC: CodeDocument = parseCodeDocument({
  id: 'transportation-planning-skill',
  code: 'transport',
  jurisdiction: 'international',
  title: 'Transportation Planning (Trip Generation, Roads, Transit, Active Travel)',
  text: TRANSPORTATION_PLANNING_SKILL,
})

// ---------------------------------------------------------------------------
// 22. Stormwater Management (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const STORMWATER_MANAGEMENT_SKILL = [
  'Stormwater Management',
  '',
  'Section 1: SuDS Hierarchy',
  '1.1 Source control: rain gardens, green roofs, permeable paving, water butts. Manage first 5-15mm rainfall on-site.',
  '1.2 Site control: swales, bioretention, detention basins, infiltration trenches. Treat and attenuate runoff.',
  '1.3 Regional control: wetlands, retention ponds, sustainable drainage channels. Last line of defence.',
  '',
  'Section 2: Design Calculations',
  '2.1 Rational method: Q = C x i x A. Q peak discharge m3/s; C runoff coefficient 0.1-0.9; i rainfall intensity mm/hr; A catchment hectares.',
  '2.2 Green roof: retention 50-90% of annual rainfall. Extensive sedum 80-150mm substrate depth. Structural load 1.5-3.0 kN/m2.',
  '2.3 Rain garden: 5-10% of contributing drainage area. 300mm ponding depth, 300mm engineered soil, 200mm gravel drainage layer.',
  '',
  'Section 3: Pipe Design',
  '3.1 Gravity pipes: minimum velocity 0.75 m/s self-cleansing; maximum 4.0 m/s to prevent erosion. Min 100mm diameter.',
  '3.2 Pipe gradients: 100mm pipe min 1:40; 150mm min 1:60; 225mm min 1:100. Manning n = 0.013 concrete.',
  '3.3 Manholes: max spacing 100m; at junctions, direction changes, gradient changes. 1200mm min diameter.',
].join('\n')

export const STORMWATER_MANAGEMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'stormwater-management-skill',
  code: 'stormwater',
  jurisdiction: 'international',
  title: 'Stormwater Management (SuDS, Design, Pipe Systems)',
  text: STORMWATER_MANAGEMENT_SKILL,
})

// ---------------------------------------------------------------------------
// 23. Transit-Oriented Development (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const TOD_SKILL = [
  'Transit-Oriented Development',
  '',
  'Section 1: TOD Principles',
  '1.1 Density gradient: highest density 400m radius from station (FAR 3-6); medium 400-800m (FAR 1.5-3); transition 800-1200m (FAR 1-1.5).',
  '1.2 Mixed use: ground-floor retail within 200m station; residential/office above. 60/40 residential/commercial split typical.',
  '1.3 Walkability: 400m/5-minute walk catchment as primary TOD zone. 200m/2-minute core zone.',
  '',
  'Section 2: Station Area Design',
  '2.1 Station plaza: 2000-5000m2 depending on ridership. Wayfinding, seating, bicycle parking 50-200 spaces.',
  '2.2 Pedestrian priority: car-free zone within 100m station entrance. Wide crossings 3-4m. Traffic calming.',
  '2.3 Bicycle infrastructure: secure parking, bike-share docking, cycle lanes connecting to station.',
  '',
  'Section 3: Parking Strategy',
  '3.1 Reduced parking: 0.5-0.8 spaces/unit within 400m station (vs 1.0-1.5 standard). Shared parking.',
  '3.2 Park-and-ride: 200-1000 spaces at suburban/peri-urban stations. integrated with bus interchange.',
  '',
  'Section 4: Housing in TOD',
  '4.1 Affordable housing: 20-30% within station catchment. Mixed-income buildings. Universal design for accessibility.',
  '4.2 Unit mix: studio/1-bed 30-40% (transit users); 2-bed 30-40%; 3-bed 20-30% (families). Average 65-85m2.',
].join('\n')

export const TOD_DOC: CodeDocument = parseCodeDocument({
  id: 'transit-oriented-development-skill',
  code: 'tod',
  jurisdiction: 'international',
  title: 'Transit-Oriented Development (Density, Station Design, Parking)',
  text: TOD_SKILL,
})

// ---------------------------------------------------------------------------
// 24. Mixed-Use Development (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const MIXED_USE_SKILL = [
  'Mixed-Use Development',
  '',
  'Section 1: Typologies',
  '1.1 Vertical mixed use: retail ground floor, offices floors 1-3, residential above. Most common urban typology.',
  '1.2 Horizontal mixed use: adjacent parcels different uses connected by shared public realm.',
  '1.3 Megastructure: integrated multiple uses in single large building. 50,000-200,000m2 GFA.',
  '',
  'Section 2: Design Principles',
  '2.1 Separate entrances: residential lobbies distinct from commercial. Loading/service separated from pedestrian.',
  '2.2 Structural flexibility: flat slab 8-10m grid for residential; 9-12m for office; column-free retail 15-24m spans.',
  '2.3 Services separation: independent mechanical, electrical, plumbing risers per use. Separate metering.',
  '',
  'Section 3: Planning Standards',
  '3.1 Parking: residential 0.5-1.0 spaces/unit; office 1/3-4 employees; retail 1/25-50m2 GLA. Shared parking reduction 20-30%.',
  '3.2 Open space: 10-20% of site area. Ground-level public space 1m2 per 2m2 GFA minimum.',
  '3.3 Noise separation: residential units above commercial 45dB internal; 40dB for bedrooms. Acoustic isolation required.',
].join('\n')

export const MIXED_USE_DOC: CodeDocument = parseCodeDocument({
  id: 'mixed-use-development-skill',
  code: 'mixed-use',
  jurisdiction: 'international',
  title: 'Mixed-Use Development (Typologies, Design, Planning)',
  text: MIXED_USE_SKILL,
})

// ---------------------------------------------------------------------------
// 25. Resilience Planning (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const RESILIENCE_PLANNING_SKILL = [
  'Resilience Planning',
  '',
  'Section 1: Climate Resilience',
  '1.1 Flood resilience: design to 1:100 year + climate change allowance 20-40%. Property-level flood resilience.',
  '1.2 Heat resilience: urban tree canopy 30-40% coverage target. Cool roofs SRI > 78. Night ventilation strategy.',
  '1.3 Wind resilience: structural design to local wind codes. Shelterbelts for extreme wind events.',
  '',
  'Section 2: Infrastructure Resilience',
  '2.1 Redundancy: dual water supply routes; ring-main distribution; backup power for critical facilities.',
  '2.2 Decentralised systems: on-site water treatment; solar + battery microgrids; local food production.',
  '2.3 Grey infrastructure to green: bioswales replace concrete channels; green roofs replace conventional.',
  '',
  'Section 3: Community Resilience',
  '3.1 Evacuation routes: minimum 2 exit routes from every neighbourhood. Assembly points 200-400m walking distance.',
  '3.2 Emergency shelters: ICC 500 standard. 3.7m2/person. Safe room 150mm RC walls. 3-day water supply.',
  '3.3 Social infrastructure: community centres double as emergency hubs. Schools as shelter. Communication networks.',
].join('\n')

export const RESILIENCE_PLANNING_DOC: CodeDocument = parseCodeDocument({
  id: 'resilience-planning-skill',
  code: 'resilience',
  jurisdiction: 'international',
  title: 'Resilience Planning (Climate, Infrastructure, Community)',
  text: RESILIENCE_PLANNING_SKILL,
})

// ---------------------------------------------------------------------------
// 26. Public Space Design (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const PUBLIC_SPACE_DESIGN_SKILL = [
  'Public Space Design',
  '',
  'Section 1: Design Standards',
  '1.1 Minimum square: 1 hectare for district; 0.5 hectares for neighbourhood; 0.1 hectares for pocket park.',
  '1.2 Seating: 1 seat per 25m2 park area; bench spacing 15-30m along primary paths; 30% accessible seats.',
  '1.3 Lighting: 5-10 lux ground level parks; 20 lux at entrances and activity areas. Dark-sky compliant fixtures.',
  '',
  'Section 2: Activity Zones',
  '2.1 Active zone: playground, sports courts, exercise equipment. 30-50% of park area.',
  '2.2 Passive zone: lawn, gardens, seating areas. 40-60% of park area. Shade trees 30-40% canopy target.',
  '2.3 Service zone: maintenance access, waste collection, utility connections. 5-10% of park area.',
  '',
  'Section 3: Safety and Maintenance',
  '3.1 CPTED: natural surveillance (windows overlooking), access control, territorial reinforcement, maintenance.',
  '3.2 Planting maintenance: mowing regime, irrigation, pruning cycles, pest management. Annual cost 3-5% of capital.',
  '3.3 Community engagement: stewardship programs, events programming, feedback mechanisms. Co-design with residents.',
].join('\n')

export const PUBLIC_SPACE_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'public-space-design-skill',
  code: 'public-space',
  jurisdiction: 'international',
  title: 'Public Space Design (Standards, Activity Zones, Safety)',
  text: PUBLIC_SPACE_DESIGN_SKILL,
})

// ---------------------------------------------------------------------------
// 27. Housing Policy (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const HOUSING_POLICY_SKILL = [
  'Housing Policy',
  '',
  'Section 1: Housing Types and Standards',
  '1.1 Typology spectrum: detached > semi-detached > townhouse/row house > low-rise apartment (2-4 storey) > mid-rise (5-8) > high-rise (9+).',
  '1.2 Minimum dwelling sizes: studio 25-35m2; 1-bed 40-50m2; 2-bed 60-75m2; 3-bed 80-100m2; 4-bed 100-120m2.',
  '1.3 Room minimums: living room 12-15m2; kitchen 5-7m2; bedroom 9-12m2 (single) 12-16m2 (double); bathroom 3-4m2.',
  '',
  'Section 2: Affordable Housing',
  '2.1 Definitions: affordable < 80% market rent; social rent < 60% market; shared ownership 25-75% equity share.',
  '2.2 Planning obligations: 20-35% affordable on qualifying sites. Section 106 / inclusionary zoning.',
  '2.3 Cost-rental: Irish model 25% below market. Build-to-rent institutional. Community land trust permanent affordability.',
  '',
  'Section 3: Density Standards',
  '3.1 suburban: 15-30 DU/ha; urban: 50-100 DU/ha; city centre: 100-300 DU/ha. Net density excluding roads.',
  '3.2 Space standards: London Housing SPG 37m2 per person minimum (1-bed 2-person = 50m2 minimum).',
  '3.3 Outdoor space: private balcony minimum 5m2; communal garden 2m2 per unit; public open space per local plan.',
].join('\n')

export const HOUSING_POLICY_DOC: CodeDocument = parseCodeDocument({
  id: 'housing-policy-skill',
  code: 'housing',
  jurisdiction: 'international',
  title: 'Housing Policy (Types, Affordability, Density Standards)',
  text: HOUSING_POLICY_SKILL,
})

// ---------------------------------------------------------------------------
// 28. Community Engagement (Urban-Design-Skills)
// ---------------------------------------------------------------------------

export const COMMUNITY_ENGAGEMENT_SKILL = [
  'Community Engagement',
  '',
  'Section 1: Engagement Methods',
  '1.1 Inform: public notices, leaflets, websites, exhibitions. One-way communication. Low cost.',
  '1.2 Consult: questionnaires, public meetings, focus groups, online surveys. Two-way feedback.',
  '1.3 Involve: workshops, design charrettes, participatory mapping. Collaborative decision-making.',
  '1.4 Empower: community design, self-build, community land trusts. Community-led delivery.',
  '',
  'Section 2: Design Charrettes',
  '2.1 Duration: 3-5 days intensive. Day 1 context walk + issues; Day 2 visioning; Day 3-4 design; Day 5 presentation.',
  '2.2 Stakeholders: residents, businesses, youth, elderly, accessibility groups, statutory authorities.',
  '2.3 Output: preferred options report, design principles, planning brief, action plan with responsibilities.',
  '',
  'Section 3: Measuring Success',
  '3.1 Participation rate: target 10-20% of affected population. Digital tools extend reach 2-3x.',
  '3.2 Demographic representation: match local demographics. Over-represent under-served groups.',
  '3.3 Feedback loop: show how input influenced decisions. Publication of engagement summary within 28 days.',
].join('\n')

export const COMMUNITY_ENGAGEMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'community-engagement-skill',
  code: 'engagement',
  jurisdiction: 'international',
  title: 'Community Engagement (Methods, Charrettes, Measurement)',
  text: COMMUNITY_ENGAGEMENT_SKILL,
})

// ---------------------------------------------------------------------------
// 29-46. Computational Designers (18 skills)
// ---------------------------------------------------------------------------

export const PARAMETRIC_MODELING_SKILL = [
  'Parametric Modeling',
  '',
  'Section 1: Grasshopper Fundamentals',
  '1.1 Components: inputs/outputs connected by wires. Data matching: longest list, shortest list, cross reference.',
  '1.2 Data trees: structure hierarchical data. Graft for per-item operations. Flatten for single list.',
  '1.3 Solvers: Galapagos genetic solver (100-500 population); Octopus multi-objective; Kangaroo physics.',
  '',
  'Section 2: Architectural Applications',
  '2.1 Facade patterning: Voronoi, Delaunay, attractor-based grids. Parametric panelization of double-curved surfaces.',
  '2.2 Structural optimization: Karamba3D force-flow analysis. Cross-section sizing. Topology optimization.',
  '2.3 Environmental analysis: Ladybug/Honeybee solar radiation, daylight, wind comfort. Design iteration from performance.',
  '',
  'Section 3: Scripting Standards',
  '3.1 Naming: camelCase components, descriptive group names. Organize in clusters by function.',
  '3.2 Data management: internalize geometry at endpoints. Bake selectively. Reference external data via File Read.',
  '3.3 Version control: Human UI for snapshots. GHX plaintext for git. Plugin versions pinned per project.',
].join('\n')

export const PARAMETRIC_MODELING_DOC: CodeDocument = parseCodeDocument({
  id: 'parametric-modeling-skill',
  code: 'parametric',
  jurisdiction: 'international',
  title: 'Parametric Modeling (Grasshopper, Solvers, Scripting)',
  text: PARAMETRIC_MODELING_SKILL,
})

export const STRUCTURAL_COMPUTATION_SKILL = [
  'Structural Computation',
  '',
  'Section 1: Finite Element Analysis',
  '1.1 Modelling: beam, shell, solid elements. Mesh convergence study: 3 mesh refinements until < 5% change.',
  '1.2 Load cases: dead (1.0 DL), live (1.0 LL), wind (1.0 WL), seismic (1.0 EL). Load combinations per Eurocode/IBC.',
  '1.3 Results: stress < material strength / safety factor; deflection < span/250 (floors), span/500 (facade).',
  '',
  'Section 2: Parametric Structural Design',
  '2.1 Karamba3D: real-time structural analysis in Grasshopper. Cross-section optimization. Weight minimization.',
  '2.2 Force flow visualization: principal stress lines for material layout. Thrust line for masonry.',
  '2.3 Form-finding: Kangaroo physics relaxation for shell/tensile structures. Funicular geometry.',
  '',
  'Section 3: Code Compliance',
  '3.1 SANS 10160: South African loading code. imposed loads 1.5-10 kPa by occupancy. Wind 28 m/s Zimbabwe basic.',
  '3.2 Reinforcement: B500B/C steel. Cover 25-50mm. Min/max reinforcement ratios 0.13%-4%.',
  '3.3 Connection design: bolted/welded steel. Moment connections for moment frames. Shear connections for braced.',
].join('\n')

export const STRUCTURAL_COMPUTATION_DOC: CodeDocument = parseCodeDocument({
  id: 'structural-computation-skill',
  code: 'struct-comp',
  jurisdiction: 'international',
  title: 'Structural Computation (FEA, Parametric Design, Code Compliance)',
  text: STRUCTURAL_COMPUTATION_SKILL,
})

export const FACADE_COMPUTATION_SKILL = [
  'Facade Computation',
  '',
  'Section 1: Panelization Algorithms',
  '1.1 Planar quad mesh: Remesh + kangaroo planarity. Target planarity error < 2mm for glass panels.',
  '1.2 Triangulation: any surface can be triangulated. Glass tolerance higher. Cost 15-25% more than quad.',
  '1.3 Custom panels: attractor-based sizing, perforation patterns, adaptive shading depth based on solar angle.',
  '',
  'Section 2: Environmental Performance',
  '2.1 Solar response: panel tilt/orientation optimized per zone. South-facing vertical for temperate; horizontal overhangs for hot.',
  '2.2 Thermal performance: whole-facade U-value by zone. Opacity ratio 40-70% by climate. SHGC < 0.25 hot climate.',
  '2.3 Wind: facade pressure coefficients Cp -1.2 to +0.8. Cladding design wind load > 1.5 kN/m2 typical.',
  '',
  'Section 3: Fabrication Data',
  '3.1 CNC output: DXF/DWG panel schedules. Glass order list with dimensions and tolerances +/- 2mm.',
  '3.2 BIM integration: Revit/ArchiCAD curtain wall families. Parametric families driven by Grasshopper data.',
  '3.3 Cost optimization: panel standardization reduces waste < 8%. Flat glass cheaper than curved 5-10x.',
].join('\n')

export const FACADE_COMPUTATION_DOC: CodeDocument = parseCodeDocument({
  id: 'facade-computation-skill',
  code: 'facade',
  jurisdiction: 'international',
  title: 'Facade Computation (Panelization, Environmental, Fabrication)',
  text: FACADE_COMPUTATION_SKILL,
})

export const ENVIRONMENTAL_SIMULATION_SKILL = [
  'Environmental Simulation',
  '',
  'Section 1: Energy Modelling',
  '1.1 Tools: EnergyPlus, IES VE, DesignBuilder. Weather files: EPW format. Simulation period: typical year or design day.',
  '1.2 Building fabric: U-values by element. Infiltration rate 0.5-5 ACH depending on construction quality.',
  '1.3 Results: annual energy kWh/m2; peak heating/cooling load kW; EUI < 100 kWh/m2/yr for efficient office.',
  '',
  'Section 2: Daylight Simulation',
  '2.1 Radiance: ray-tracing engine. Annual Daylight Autonomy DA300/50% target: > 55% of floor area.',
  '2.2 Useful Daylight Illuminance UDI 100-2000 lux: > 60% of occupied hours. sDA/ASE per LEED v4.1.',
  '2.3 Glare analysis: DGP < 0.35 (imperceptible) at workstations. External shading design from sun path.',
  '',
  'Section 3: CFD Wind Analysis',
  '3.1 Pedestrian comfort: Lawson criteria. < 5 m/s walking; < 10 m/s sitting. 16 wind directions.',
  '3.2 Natural ventilation: pressure coefficients drive airflow. CFD validates stack/wind-driven ventilation.',
].join('\n')

export const ENVIRONMENTAL_SIMULATION_DOC: CodeDocument = parseCodeDocument({
  id: 'environmental-simulation-skill',
  code: 'env-sim',
  jurisdiction: 'international',
  title: 'Environmental Simulation (Energy, Daylight, CFD)',
  text: ENVIRONMENTAL_SIMULATION_SKILL,
})

export const BIM_SCRIPTING_SKILL = [
  'BIM Scripting',
  '',
  'Section 1: Revit API (C# / Python)',
  '1.1 Document model: Document > Application > UIDocument. FilteredElementCollector for element queries.',
  '1.2 Parameter manipulation: BuiltInParameter access; SharedParameter creation; Type vs Instance parameters.',
  '1.3 View creation: ViewPlan, ViewSection, View3D. ViewTemplate application. Crop region manipulation.',
  '',
  'Section 2: Dynamo for Revit',
  '2.1 Node-based visual scripting: packages (Clockwork, archi-lab, BimorphNodes). Custom node creation.',
  '2.2 Data exchange: Excel import/export. CSV scheduling. Database connectivity via ODBC.',
  '2.3 Automation: sheet creation from views; titleblock population; batch printing; model health checks.',
  '',
  'Section 3: IFC Interoperability',
  '3.1 IFC4 alignment: IfcWall, IfcSlab, IfcDoor, IfcWindow mapped to Revit categories.',
  '3.2 OpenBIM workflow: model coordination via Solibri/Navisworks. Clash detection < 25mm tolerance.',
  '3.3 BIM Execution Plan BEP: LOD 100-500 specification. Information exchange requirements per phase.',
].join('\n')

export const BIM_SCRIPTING_DOC: CodeDocument = parseCodeDocument({
  id: 'bim-scripting-skill',
  code: 'bim',
  jurisdiction: 'international',
  title: 'BIM Scripting (Revit API, Dynamo, IFC)',
  text: BIM_SCRIPTING_SKILL,
})

export const GENERATIVE_DESIGN_SKILL = [
  'Generative Design',
  '',
  'Section 1: Space Planning',
  '1.1 Constraint-based: adjacency matrix, minimum areas, circulation widths, structural grid alignment.',
  '1.2 Evolutionary: population 100-500, generations 50-200. Fitness = weighted sum of adjacency, daylight, compactness.',
  '1.3 Output: ranked floor plans with metrics. User selects preferred方案 from Pareto front.',
  '',
  'Section 2: Massing Optimization',
  '2.1 Variables: height, setback, rotation, footprint shape. Constraints: FAR, height limits, daylight access.',
  '2.2 Objectives: maximize GFA, minimize surface-to-volume ratio, maximize southern exposure, minimize wind load.',
  '2.3 Solar analysis integration: annual radiation per facade as objective. Optimize overhang depth.',
  '',
  'Section 3: Structural Optimization',
  '3.1 Topology optimization: remove material where stress < threshold. Target 30-50% material reduction.',
  '3.2 Column layout optimization: minimize deviation from regular grid while satisfying structural efficiency.',
  '3.3 Material distribution: multi-material optimization. Concrete core + steel frame + timber infill.',
].join('\n')

export const GENERATIVE_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'generative-design-skill',
  code: 'gen-design',
  jurisdiction: 'international',
  title: 'Generative Design (Space Planning, Massing, Structure)',
  text: GENERATIVE_DESIGN_SKILL,
})

export const TOPOLOGY_OPTIMIZATION_SKILL = [
  'Topology Optimization',
  '',
  'Section 1: Algorithms',
  '1.1 SIMP (Solid Isotropic Material with Penalization): penalize intermediate densities. Volume fraction 0.3-0.5.',
  '1.2 Level-set: evolve boundary via velocity field. Clean boundaries suitable for fabrication.',
  '1.3 ESO (Evolutionary Structural Optimization): iteratively remove low-stress elements. Converges to optimal.',
  '',
  'Section 2: Architectural Applications',
  '2.1 Structural form: floor slab optimization, roof shell, column head, facade bracket. 30-50% material saving.',
  '2.2 Min/compliance maximization: subject to volume constraint. Load paths become structural members.',
  '2.3 Multi-load: optimize for multiple load cases simultaneously. Weighted compliance objective.',
  '',
  'Section 3: Fabrication Constraints',
  '3.1 Minimum member size: 100-300mm depending on material. Prevents unrealistic thin members.',
  '3.2 Symmetry: enforce design symmetry for constructability. 2-fold or 4-fold symmetry options.',
  '3.3 Digital fabrication: STL output for 3D printing. 5-axis CNC for concrete formwork. Robot casting.',
].join('\n')

export const TOPOLOGY_OPTIMIZATION_DOC: CodeDocument = parseCodeDocument({
  id: 'topology-optimization-skill',
  code: 'topo-opt',
  jurisdiction: 'international',
  title: 'Topology Optimization (Algorithms, Architecture, Fabrication)',
  text: TOPOLOGY_OPTIMIZATION_SKILL,
})

export const COMPUTATIONAL_GEOMETRY_SKILL = [
  'Computational Geometry',
  '',
  'Section 1: Surface Operations',
  '1.1 NURBS: Non-Uniform Rational B-Splines. Control points, knots, weights. Degree 3 for smooth surfaces.',
  '1.2 Mesh operations: subdivision (Catmull-Clark), decimation, boolean (union/subtraction/intersection).',
  '1.3 Surface analysis: curvature, isocurves, contour lines, section analysis for fabrication.',
  '',
  'Section 2: Spatial Algorithms',
  '2.1 Voronoi: nearest-neighbour decomposition. Applications: facade patterning, urban catchment, spatial zoning.',
  '2.2 Delaunay triangulation: dual of Voronoi. Mesh generation for FEA. Delaunay = maximise min angle.',
  '2.3 Convex hull, alpha shapes: bounding geometry, organic form-finding, landscape contour generation.',
  '',
  'Section 3: Optimization',
  '3.1 Packing: rectangle packing for room layout. Circle packing for column placement. NP-hard, heuristics used.',
  '3.2 Shortest path: A* for circulation routing. Dijkstra for utility networks. Game-theory for evacuation.',
  '3.3 Convex optimization: quadratic programming for structural sizing. Interior-point methods.',
].join('\n')

export const COMPUTATIONAL_GEOMETRY_DOC: CodeDocument = parseCodeDocument({
  id: 'computational-geometry-skill',
  code: 'comp-geom',
  jurisdiction: 'international',
  title: 'Computational Geometry (Surfaces, Algorithms, Optimization)',
  text: COMPUTATIONAL_GEOMETRY_SKILL,
})

export const DATA_DRIVEN_DESIGN_SKILL = [
  'Data-Driven Design',
  '',
  'Section 1: Performance Data',
  '1.1 Sensor arrays: temperature, humidity, CO2, illuminance, occupancy. Granularity per-room per-15-min.',
  '1.2 Energy benchmarks: ENERGY STAR 1-100 score. Portfolio Manager for portfolio comparison.',
  '1.3 Post-occupancy evaluation POE: thermal comfort PMV/PPD, visual comfort DGP, satisfaction surveys.',
  '',
  'Section 2: Machine Learning for Design',
  '2.1 Regression: predict energy consumption from building parameters. Random forest R2 > 0.85 typical.',
  '2.2 Classification: occupancy pattern recognition for HVAC scheduling. K-means clustering of usage profiles.',
  '2.3 Generative: GAN for floor plan generation. VAE for facade design. Diffusion models for rendering.',
  '',
  'Section 3: Digital Twins',
  '3.1 Real-time model: BIM + IoT sensors + analytics. 3D visualization with live data overlay.',
  '3.2 Predictive maintenance: anomaly detection on equipment data. Forecast failures 2-4 weeks ahead.',
  '3.3 Optimization loop: automated setpoint adjustment. Reinforcement learning for HVAC control.',
].join('\n')

export const DATA_DRIVEN_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'data-driven-design-skill',
  code: 'data-design',
  jurisdiction: 'international',
  title: 'Data-Driven Design (Sensors, ML, Digital Twins)',
  text: DATA_DRIVEN_DESIGN_SKILL,
})

export const AI_ASSISTED_DESIGN_SKILL = [
  'AI-Assisted Design',
  '',
  'Section 1: LLM Applications',
  '1.1 Code generation: Revit API scripts from natural language. Grasshopper component definitions.',
  '1.2 Code review: automated building code compliance checking against IBC/Eurocode/ZBC.',
  '1.3 Specification writing: material specifications from performance requirements. BOQ generation.',
  '',
  'Section 2: Image Generation',
  '2.1 Stable Diffusion: architectural rendering from massing models. ControlNet for edge/depth control.',
  '2.2 Style transfer: apply architectural style to conceptual massing. Consistent style across views.',
  '2.3 Upscaling: 4x upscaling of AI renders for presentation. Detail enhancement for close-ups.',
  '',
  'Section 3: Classification and Detection',
  '3.1 Building element detection: object detection on floor plans. Door/window/schedule extraction.',
  '3.2 Defect detection: crack detection on concrete surfaces. Moisture pattern recognition from thermal images.',
  '3.3 Space classification: automatic room type classification from geometry + furniture layout.',
].join('\n')

export const AI_ASSISTED_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'ai-assisted-design-skill',
  code: 'ai-design',
  jurisdiction: 'international',
  title: 'AI-Assisted Design (LLMs, Image Gen, Classification)',
  text: AI_ASSISTED_DESIGN_SKILL,
})

export const DIGITAL_FABRICATION_SKILL = [
  'Digital Fabrication',
  '',
  'Section 1: Additive Manufacturing',
  '1.1 FDM: PLA/ABS/PETG. Layer height 0.1-0.3mm. Build volume 200-400mm. Arch. models at 1:100 to 1:200.',
  '1.2 SLA/DLP: resin, 25-50 micron resolution. High-detail facade models, intricate structural joints.',
  '1.3 Concrete printing: 3D printing with concrete. Layer height 10-30mm. Build rate 100-300 kg/hr.',
  '',
  'Section 2: Subtractive Manufacturing',
  '2.1 CNC milling: 3-axis for panels; 5-axis for complex geometry. Tolerance +/- 0.1mm. Material: timber, MDF, foam.',
  '2.2 Laser cutting: acrylic, plywood, cardboard, paper. 2D parts for assembly. Speed 100-500mm/s.',
  '2.3 Waterjet: 60,000 PSI. Cuts stone, metal, glass, composite. No heat-affected zone.',
  '',
  'Section 3: Robotic Fabrication',
  '3.1 6-axis robot arm: reach 1.5-3.0m. Payload 5-25kg. Milling, printing, welding, assembly.',
  '3.2 Multi-robot: coordinated robots for large-scale fabrication. 2-6 robots for spatial assembly.',
  '3.3 Timber fabrication: robotic milling of complex joints. CLT panel processing. Glulam post-processing.',
].join('\n')

export const DIGITAL_FABRICATION_DOC: CodeDocument = parseCodeDocument({
  id: 'digital-fabrication-skill',
  code: 'fab',
  jurisdiction: 'international',
  title: 'Digital Fabrication (3D Printing, CNC, Robotics)',
  text: DIGITAL_FABRICATION_SKILL,
})

export const PERFORMANCE_DRIVEN_DESIGN_SKILL = [
  'Performance-Driven Design',
  '',
  'Section 1: Multi-Objective Optimization',
  '1.1 Pareto front: non-dominated solutions. Trade-off between competing objectives (cost vs carbon vs comfort).',
  '1.2 Weighted sum: single objective from multiple. User preference weights. Sensitivity analysis on weights.',
  '1.3 NSGA-II: Non-dominated Sorting Genetic Algorithm. Population 100, generations 50-200 typical.',
  '',
  'Section 2: Performance Metrics',
  '2.1 Energy: EUI < 100 kWh/m2/yr (good); < 50 (excellent); < 15 (Passive House). COP > 3.5 HVAC.',
  '2.2 Daylight: sDA300/50% > 55% (good); > 75% (excellent). ASE1000,250 < 10%. DF 2-5% office.',
  '2.3 Structure: embodied carbon < 500 kgCO2e/m2 (residential); < 800 (office). Structural efficiency ratio > 0.7.',
  '',
  'Section 3: Design Iteration',
  '3.1 Workflow: parametric model > simulation > optimization > evaluation > selection > documentation.',
  '3.2 Sensitivity analysis: tornado diagrams for key parameters. Identify which variables drive performance.',
  '3.3 Trade-off visualization: parallel coordinate plots, spider/radar charts, scatter matrices.',
].join('\n')

export const PERFORMANCE_DRIVEN_DESIGN_DOC: CodeDocument = parseCodeDocument({
  id: 'performance-driven-design-skill',
  code: 'perf-driven',
  jurisdiction: 'international',
  title: 'Performance-Driven Design (Multi-Objective, Metrics, Iteration)',
  text: PERFORMANCE_DRIVEN_DESIGN_SKILL,
})

export const OPTIMIZATION_ALGORITHMS_SKILL = [
  'Optimization Algorithms',
  '',
  'Section 1: Metaheuristics',
  '1.1 Genetic algorithm GA: selection, crossover, mutation. Population 50-500. Tournament selection k=2-5.',
  '1.2 Particle swarm PSO: velocity update, personal/global best. Inertia weight 0.4-0.9. Cognitive/social c1=c2=2.',
  '1.3 Simulated annealing SA: temperature schedule T(k+1) = alpha x T(k). Alpha 0.85-0.99. Restart on plateau.',
  '',
  'Section 2: Gradient Methods',
  '2.1 Gradient descent: learning rate 0.001-0.1. Momentum 0.9. Adam optimizer adaptive learning rate.',
  '2.2 Interior point: constrained optimization. Barrier function for inequality constraints.',
  '2.3 Lagrange multipliers: equality constrained optimization. KKT conditions for optimality.',
  '',
  'Section 3: Architectural Applications',
  '3.1 Room layout: rectangle packing GA with adjacency constraints. 100-500 generations.',
  '3.2 Facade optimization: NSGA-II for panel types selection. Multi-objective: cost, carbon, thermal.',
  '3.3 Structural sizing: sequential quadratic programming for member cross-sections. Subject to stress/deflection.',
].join('\n')

export const OPTIMIZATION_ALGORITHMS_DOC: CodeDocument = parseCodeDocument({
  id: 'optimization-algorithms-skill',
  code: 'optimization',
  jurisdiction: 'international',
  title: 'Optimization Algorithms (Metaheuristics, Gradients, Applications)',
  text: OPTIMIZATION_ALGORITHMS_SKILL,
})

export const PROCEDURAL_MODELING_SKILL = [
  'Procedural Modeling',
  '',
  'Section 1: Grammar-Based Generation',
  '1.1 Shape grammar: production rules transform shapes. Terminal symbols = final geometry. Recursive application.',
  '1.2 L-system: string rewriting for organic forms. Axiom + rules + iterations. Plant growth, branching.',
  '1.3 Procedural texturing: Perlin noise, Voronoi, fractal patterns for material variation.',
  '',
  'Section 2: City and Building Generation',
  '2.1 Urban growth: agent-based models for street network. Lattice + randomness + constraints.',
  '2.2 Building massing: extrude+carve from footprint. Floor plates from story height rules. Facade subdivision.',
  '2.3 Interior layouts: space subdivision algorithms. BSP, quad-tree, recursive partitioning.',
  '',
  'Section 3: Houdini for Architecture',
  '3.1 VEX scripting: point wrangle, attribute manipulation. Performance 10-100x faster than nodes for loops.',
  '3.2 Terrain: heightfield for site modeling. Erosion, slope, drainage calculation.',
  '3.3 Crowd simulation: agent behavior for pedestrian flow validation. Social force model.',
].join('\n')

export const PROCEDURAL_MODELING_DOC: CodeDocument = parseCodeDocument({
  id: 'procedural-modeling-skill',
  code: 'procedural',
  jurisdiction: 'international',
  title: 'Procedural Modeling (Grammar, Urban Gen, Houdini)',
  text: PROCEDURAL_MODELING_SKILL,
})

export const SIMULATION_ANALYSIS_SKILL = [
  'Simulation and Analysis',
  '',
  'Section 1: Thermal Simulation',
  '1.1 EnergyPlus: whole-building energy. Input: IDF file (geometry, materials, schedules, HVAC). Output: hourly loads.',
  '1.2 Degree-day method: heating HDD x fabric U-value x area x 24/1000 = annual heat loss kWh.',
  '1.3 Thermal mass: decrement delay 8-12 hours for heavy masonry. Admittance method for dynamic analysis.',
  '',
  'Section 2: Structural Simulation',
  '2.1 Nonlinear analysis: material nonlinearity (cracking, yielding), geometric nonlinearity (P-delta).',
  '2.2 Dynamic analysis: response spectrum, time-history. Natural frequency f = 1/(2pi) x sqrt(k/m).',
  '2.3 Progressive collapse: removal of key column. Alternative load path. GSA guidelines.',
  '',
  'Section 3: Crowd and Traffic',
  '3.1 Pedestrian simulation: social force model. Evacuation time < 8 minutes for 1000 occupants.',
  '3.2 Vehicle traffic: microsimulation (AIMSUN, Vissim). Level of Service A-F for intersection design.',
  '3.3 Fire simulation: CFD fire dynamics (FDS). Smoke layer height > 2m at evacuation completion.',
].join('\n')

export const SIMULATION_ANALYSIS_DOC: CodeDocument = parseCodeDocument({
  id: 'simulation-analysis-skill',
  code: 'simulation',
  jurisdiction: 'international',
  title: 'Simulation and Analysis (Thermal, Structural, Crowd)',
  text: SIMULATION_ANALYSIS_SKILL,
})

export const ROBOTIC_FABRICATION_SKILL = [
  'Robotic Fabrication',
  '',
  'Section 1: Robot Kinematics',
  '1.1 6-axis industrial robot: 6 revolute joints. Forward/inverse kinematics. Workspace envelope 2-3m radius.',
  '1.2 Tool center point TCP: coordinate transformation end-effector to workpiece. Calibration for accuracy.',
  '1.3 Reach and singularity: avoid wrist singularity configurations. Payload derating at full extension.',
  '',
  'Section 2: Architectural Applications',
  '2.1 Timber joinery: CNC milling of complex joints (dovetail, mortise-tenon). Tolerance +/- 0.2mm.',
  '2.2 Bricklaying: robot arm + gripper + mortar. 300-500 bricks/day. Complex bond patterns from parametric model.',
  '2.3 Formwork: robot-cut foam/plywood formwork for freeform concrete. 5-axis hot-wire cutting.',
  '',
  'Section 3: Multi-Robot Systems',
  '3.1 Coordination: shared workspace planning. Collision avoidance. Task allocation algorithms.',
  '3.2 Assembly: robots as build tools for pre-fabricated components. On-site assembly of CLT panels.',
  '3.3 Safety: ISO 10218 robot safety. Collaborative robots ISO/TS 15066. Force limiting 150N.',
].join('\n')

export const ROBOTIC_FABRICATION_DOC: CodeDocument = parseCodeDocument({
  id: 'robotic-fabrication-skill',
  code: 'robotics',
  jurisdiction: 'international',
  title: 'Robotic Fabrication (Kinematics, Architecture, Multi-Robot)',
  text: ROBOTIC_FABRICATION_SKILL,
})

export const PARAMETRIC_STRUCTURES_SKILL = [
  'Parametric Structures',
  '',
  'Section 1: Shell Structures',
  '1.1 Form-finding: thrust network analysis TNA for funicular shells. Compression-only = minimal bending.',
  '1.2 Grid shell: geodesic, Schwedler, lamella patterns. Panel size 1-3m typical. Node connection design.',
  '1.3 Pneumatic: air-supported membranes. Internal pressure 200-500 Pa. Double-layer for insulation.',
  '',
  'Section 2: Tensile Structures',
  '2.1 Fabric architecture: PTFE-coated fiberglass 25-30 year life; ETFE cushions 3-layer; PVC-PES 10-15 year.',
  '2.2 Pre-stress: minimum 1-3 kN/m in both directions. Wind uplift 1.5-3x self-weight. Snow load accumulation.',
  '2.3 Cable systems: suspension, cable-stayed, tensegrity. High-strength steel 1570-1770 MPa.',
  '',
  'Section 3: Parametric Design Workflow',
  '3.1 Karamba3D: real-time shell analysis. Cross-section optimization. Load path visualization.',
  '3.2 Kangaroo physics: form-finding via goal-based solving. Compression, tension, mesh relaxation.',
  '3.3 Rationalization: convert NURBS to planar panels. Flatness tolerance < 2mm for glass; < 5mm for metal.',
].join('\n')

export const PARAMETRIC_STRUCTURES_DOC: CodeDocument = parseCodeDocument({
  id: 'parametric-structures-skill',
  code: 'param-struct',
  jurisdiction: 'international',
  title: 'Parametric Structures (Shells, Tensile, Design Workflow)',
  text: PARAMETRIC_STRUCTURES_SKILL,
})

export const CFD_SKILL = [
  'Computational Fluid Dynamics',
  '',
  'Section 1: Indoor Airflow',
  '1.1 HVAC distribution: diffuser throw, room air velocity 0.1-0.3 m/s occupied zone. Temperature uniformity +/- 1C.',
  '1.2 Natural ventilation: cross-ventilation 0.5-2.0 m/s. Stack effect height difference > 3m for 1Pa driving pressure.',
  '1.3 Displacement ventilation: low velocity 0.2 m/s at floor. Supply 18-20C. Stratification at 1.8m height.',
  '',
  'Section 2: Outdoor Wind',
  '2.1 Pedestrian comfort: Lawson criteria mapping. 5-10 wind directions. CFD domain 5H upstream, 15H downstream.',
  '2.2 Urban heat island: anthropogenic heat, reduced albedo, canyon effect. Green infrastructure mitigation.',
  '2.3 Wind energy: micro-siting of building-integrated turbines. Wake effects. 5-8 m/s annual average.',
  '',
  'Section 3: Fire Dynamics',
  '3.1 FDS (Fire Dynamics Simulator): LES turbulence, combustion, radiation. Smoke visibility > 10m.',
  '3.2 Sprinkler activation: RTI 50-300 (ms)^0.5. Operating temperature 57-79C. Water density 5-15 mm/min.',
  '3.3 Smoke control: mechanical exhaust rate for atrium. 10-15 ACH. Smoke layer maintain > highest occupied level.',
].join('\n')

export const CFD_DOC: CodeDocument = parseCodeDocument({
  id: 'cfd-skill',
  code: 'cfd',
  jurisdiction: 'international',
  title: 'Computational Fluid Dynamics (Indoor, Outdoor, Fire)',
  text: CFD_SKILL,
})

export const URBAN_FORESTRY_SKILL = [
  'Urban Forestry',
  '',
  'Section 1: Tree Canopy Assessment',
  '1.1 Canopy cover target: 25-40% for temperate cities; 15-25% tropical. Remote sensing LiDAR + aerial imagery for quantification.',
  '1.2 Species selection: street trees root spread < 2m hardscape conflict; clearance > 2.5m above footpath; mature height < 15m under overhead lines.',
  '1.3 Soil volume minimum: 12-15 m3 for large canopy; 8 m3 medium; 5 m3 small. Structural soil cells (Silva Cell, Stratavault) 300mm module depth.',
  '',
  'Section 2: Urban Tree Benefits Quantification',
  '2.1 i-Tree: canopy interception 15-40% rainfall; carbon sequestration 20-50 kg CO2/tree/year; energy savings 10-20% cooling from deciduous shade.',
  '2.2 Stormwater: bioretention tree pits capture 5-10 m3/runoff event. Root zone infiltration 10-50x lawn rate.',
  '2.3 Health: PM2.5 removal 0.5-2 kg/tree/year; noise attenuation 3-8 dB per 30m buffer; heat island reduction 2-4C under continuous canopy.',
  '',
  'Section 3: Planting & Maintenance',
  '3.1 Planting specification: B15 container minimum; root flare at grade; 100mm mulch ring; staking 12 months only.',
  '3.2 Establishment watering: 40-80L/week first 2 years; 20L/week years 3-5; bypass after year 5 in >800mm rainfall zones.',
  '3.3 Pruning: 1/3 rule (max 1/3 crown removal per cycle); 5-year pruning cycle urban street trees; clearance cut for traffic sightlines.',
].join('\n')

export const URBAN_FORESTRY_DOC: CodeDocument = parseCodeDocument({
  id: 'urban-forestry-skill',
  code: 'urban-forestry',
  jurisdiction: 'international',
  title: 'Urban Forestry (Canopy, Benefits, Planting)',
  text: URBAN_FORESTRY_SKILL,
})

export const ECONOMIC_DEVELOPMENT_SKILL = [
  'Economic Development Planning',
  '',
  'Section 1: Economic Impact Analysis',
  '1.1 Input-output modelling: Type I multiplier 1.5-2.5 construction; Type II 2.0-3.5 retail. IMPLAN or RIMS II regional coefficients.',
  '1.2 Employment: direct 1 job / 10-15 m2 retail; 1 / 50-80 m2 office; 1 / 100-200 m2 warehouse. Indirect 0.5-1.0x direct.',
  '1.3 Tax increment financing TIF: baseline assessed value frozen; incremental revenue funds infrastructure. 20-30 year term typical.',
  '',
  'Section 2: Commercial Viability Assessment',
  '2.1 Market area: primary 5 min / 3km drive; secondary 10 min / 6km. Trade area population density > 2000/km2 for retail viability.',
  '2.2 Anchor tenant: 30-40% of GLA; credit-rated national chain. Co-tenancy clause triggers rent reduction if anchor vacates.',
  '2.3 Yield: prime retail cap rate 5-7%; office 6-8%; industrial 7-9% (Southern Africa context). IRR target 15-20% for residential development.',
  '',
  'Section 3: Funding Mechanisms',
  '3.1 Public-private partnership PPP: DBFO contract; availability payment; revenue-sharing; BOT build-operate-transfer.',
  '3.2 Development finance: DFI concessionary rate 6-10% vs commercial 12-18%; blended finance structuring; feasibility study funding.',
  '3.3 Diaspora bonds: infrastructure-linked; 5-7% coupon; Zimbabwe example US$50-200M target. Risk mitigation via partial credit guarantee.',
].join('\n')

export const ECONOMIC_DEVELOPMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'economic-development-skill',
  code: 'economic-dev',
  jurisdiction: 'international',
  title: 'Economic Development Planning (Impact, Viability, Funding)',
  text: ECONOMIC_DEVELOPMENT_SKILL,
})

export const HISTORIC_URBAN_PRESERVATION_SKILL = [
  'Historic Urban Preservation',
  '',
  'Section 1: Heritage Assessment',
  '1.1 Significance evaluation: historic aesthetic social scientific spiritual values. grading I/II/III (national/provincial/local). Burra Charter process.',
  '1.2 Fabric mapping: original fabric (post-1900 steel frame), early alterations, later additions. Heritage Impact Assessment HIA for any change.',
  '1.3 Buffer zones: 50m immediate; 200m secondary. Height plane restrictions: parapet level + 3m within 50m.',
  '',
  'Section 2: Adaptive Reuse',
  '2.1 Structural assessment: load testing to current code; timber inspection; masonry repointing with lime mortar (NHL 3.5-5); steel reinforcement concealed.',
  '2.2 Services upgrade: fire detection BS 5839; sprinkler BS EN 12845; accessibility BS 8300 part M; acoustic upgrade 45dB Rw between units.',
  '2.3 Sustainability: embodied carbon preservation 50-70% lower than demolition + new build. thermal insulation internal (to preserve facade).',
  '',
  'Section 3: Regulatory Framework',
  '3.1 National Heritage Resources Act (South Africa) Section 34/38 permit; Zimbabwe National Museums declaration process.',
  '3.2 UNESCO World Heritage: Outstanding Universal Value OUV assessment; Management Plan 10-year cycle; State of Conservation reporting.',
  '3.3 Tax incentives: heritage listing tax deduction 10-20% restoration cost over 5 years; transferable development rights TDR.',
].join('\n')

export const HISTORIC_URBAN_PRESERVATION_DOC: CodeDocument = parseCodeDocument({
  id: 'historic-preservation-skill',
  code: 'historic-preservation',
  jurisdiction: 'international',
  title: 'Historic Urban Preservation (Heritage, Adaptive Reuse, Regulation)',
  text: HISTORIC_URBAN_PRESERVATION_SKILL,
})

export const URBAN_ECOLOGY_SKILL = [
  'Urban Ecology',
  '',
  'Section 1: Biodiversity in Cities',
  '1.1 Habitat connectivity: wildlife corridors 30-50m width minimum; green bridges 10-20m span; stepping stones < 500m apart.',
  '1.2 Native planting: 70% minimum local provenance species; pollinator-friendly 3-season bloom; avoid invasive alien species (IAS lists).',
  '1.3 Bird-safe design: fritted glass patterns < 50mm spacing; 2m vision band at bird height; reduce night lighting 80% after 11pm.',
  '',
  'Section 2: Ecosystem Services Valuation',
  '2.1 Urban tree canopy: US$150-300/tree/year stormwater + air quality + carbon + energy benefits. Benefit-cost ratio 2:1 to 5:1.',
  '2.2 Wetland retention: water quality improvement 60-80% TSS removal; flood attenuation 30-50% peak flow reduction; biodiversity habitat.',
  '2.3 Green infrastructure: life-cycle cost 40-60% lower than grey infrastructure for stormwater. Maintenance 2-4x/year inspection.',
  '',
  'Section 3: Urban Heat Island Mitigation',
  '3.1 Cool roofs: SRI > 78 for steep; > 29 for low-slope. Albedo 0.65-0.85. Reduces cooling load 10-40%.',
  '3.2 Urban canopy cover: 40% target reduces air temperature 3-5C. Evapotranspiration cooling effect 2-5 kW per mature tree.',
  '3.3 Permeable paving: albedo 0.3-0.5 vs asphalt 0.05-0.10; surface temperature 10-20C lower; stormwater infiltration 100-300 mm/hr.',
].join('\n')

export const URBAN_ECOLOGY_DOC: CodeDocument = parseCodeDocument({
  id: 'urban-ecology-skill',
  code: 'urban-ecology',
  jurisdiction: 'international',
  title: 'Urban Ecology (Biodiversity, Ecosystem Services, Heat Island)',
  text: URBAN_ECOLOGY_SKILL,
})

export const WATERFRONT_DEVELOPMENT_SKILL = [
  'Waterfront Development',
  '',
  'Section 1: Flood Risk & Resilience',
  '1.1 Flood plain: 1-in-100 year AEP + climate change allowance 20-40%. Freeboard 300-600mm above design flood level.',
  '1.2 Flood-resistant design: habitable floor FFL > DFL + freeboard; services above DFL; sacrificial ground floor (parking/lobby only).',
  '1.3 Defences: earth bund 1:3 slope vegetated; flood wall 1.2-2.0m; deployable barriers; slip-resistant paving flood zone > 65 PTV.',
  '',
  'Section 2: Waterfront Edge Design',
  '2.1 Hard edge: seawall, quay wall, revetment. Return period design 1:200 for hard structures; wave overtopping < 1 L/s/m.',
  '2.2 Soft edge: living shorelines, mangrove buffer 50-200m, constructed beach berm. Ecological uplift + recreation.',
  '2.3 Public access: waterfront promenade 6-8m width; setback 15-30m from HWL for ecological buffer; fishing platforms, kayak launch.',
  '',
  'Section 3: Mixed-Use Waterfront Programming',
  '3.1 Ground plane: retail/food beverage 40-60% active frontage; residential upper with balcony privacy 12-15m inter-block distance.',
  '3.2 Marina: berth 2.5-3.0m width for < 8m LOA; wave attenuation floating breakwater; fuel dock pollution containment.',
  '3.3 Environmental: EIA mandatory; marine ecology baseline 12-month; construction environmental management plan CEMP.',
].join('\n')

export const WATERFRONT_DEVELOPMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'waterfront-development-skill',
  code: 'waterfront',
  jurisdiction: 'international',
  title: 'Waterfront Development (Flood Risk, Edge Design, Programming)',
  text: WATERFRONT_DEVELOPMENT_SKILL,
})

export const PARKS_RECREATION_SKILL = [
  'Parks & Recreation Planning',
  '',
  'Section 1: Park Standards & Hierarchy',
  '1.1 Play space: pocket park < 0.2ha within 400m walk; neighbourhood 2-5ha 800m; district 10-30ha 2km; regional > 50ha 5km.',
  '1.2 Play equipment: EN 1176 safety zones 2m fall height < 1.5m; 3m fall height > 1.5m; impact-attenuating surface 300mm depth bark/rubber.',
  '1.3 Sport fields: soccer 100x65m; cricket oval 150m diameter; tennis 23.77x10.97m; basketball 28x15m. Surface tolerance < 1% crossfall.',
  '',
  'Section 2: Universal Access & Inclusion',
  '2.1 Pathways: 1.5m min width; 1:20 max gradient; 1:12 with handrails 850-950mm; tactile ground surface indicators TGSI at decisions.',
  '2.2 Sensory gardens: fragrant plants < 900mm raised beds; water feature sound masking; textured paths; shade seating every 50m.',
  '2.3 Playground inclusive: wheelchair-accessible swing, carousel; transfer platforms; ground-level play panels; quiet zone for neurodiverse users.',
  '',
  'Section 3: Operations & Maintenance',
  '3.1 Irrigation: sports field 6-8mm/week peak; garden beds 3-5mm/week; drip system 90% efficiency; smart controller weather-based.',
  '3.2 Lighting: pedestrian path 5-10 lux; sports field 200-500 lux (training/competition); dark sky compliant cut-off fixtures; timer/photocell.',
  '3.3 Waste management: bins per 50m path; recycling 3-stream; dog waste stations every 100m; composting green waste on-site.',
].join('\n')

export const PARKS_RECREATION_DOC: CodeDocument = parseCodeDocument({
  id: 'parks-recreation-skill',
  code: 'parks-recreation',
  jurisdiction: 'international',
  title: 'Parks & Recreation Planning (Standards, Access, Operations)',
  text: PARKS_RECREATION_SKILL,
})

export const EQUITABLE_DEVELOPMENT_SKILL = [
  'Equitable Development',
  '',
  'Section 1: Affordable Housing Integration',
  '1.1 Inclusionary zoning: 15-25% affordable units in market developments > 20 units; density bonus 20-30% FAR uplift for compliance.',
  '1.2 Housing typologies: social housing 25-35m2/unit; GAP housing 40-60m2; affordable ownership 60-80m2. Mixed-income 20/40/80 split.',
  '1.3 Land trust: community land trust CLT retains land ownership; leases 99-year peppercorn; resale formula limits capital gain 20-30%.',
  '',
  'Section 2: Spatial Justice',
  '2.1 Accessibility: 80% jobs within 45 min transit; healthcare within 30 min; school within 1.5km walk. Service deficit mapping.',
  '2.2 Participatory budgeting: 5-10% capital allocation community-directed; ward committee structure; transparent scoring criteria.',
  '2.3 Anti-displacement: rent control 3-5% annual cap; right of first refusal for existing tenants; community benefit agreement CBA.',
  '',
  'Section 3: Economic Empowerment',
  '3.1 Local procurement: 30-50% target local SMME spend on construction; 5 km radius priority; capacity building programme.',
  '3.2 Skills development: 1-2% construction budget bricklaying/electrical/plumbing apprenticeships; CETA/MICT SETA accreditation.',
  '3.3 Enterprise zones: reduced rates 5-10 years; simplified approvals; shared services (incubator kitchens, workshops); mentorship.',
].join('\n')

export const EQUITABLE_DEVELOPMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'equitable-development-skill',
  code: 'equitable-dev',
  jurisdiction: 'international',
  title: 'Equitable Development (Affordable Housing, Spatial Justice, Empowerment)',
  text: EQUITABLE_DEVELOPMENT_SKILL,
})

export const CIVIC_ENGAGEMENT_SKILL = [
  'Civic Engagement & Participatory Planning',
  '',
  'Section 1: Community Participation Framework',
  '1.1 IAP2 spectrum: inform (one-way); consult (feedback); involve (workshops); collaborate (co-design); empower (community decides).',
  '1.2 Stakeholder mapping: primary (directly affected); secondary (adjacent users); tertiary (advocacy/third party). 6-8 week consultation cycle.',
  '1.3 Language & access: translate materials 2-3 local languages; meetings at community times (evenings/Saturday); childcare + transport.',
  '',
  'Section 2: Digital Engagement Tools',
  '2.1 Online platforms: interactive mapping (Maptionnaire); survey (SurveyMonkey/Google Forms); virtual town hall (Zoom with interpretation).',
  '2.2 Data collection: participatory GIS (PGIS) community mapping; photo voice documentation; sentiment analysis social media.',
  '2.3 Transparency: open data portal for plans/reports; project dashboard real-time progress; feedback response within 14 days.',
  '',
  'Section 3: Conflict Resolution & Buy-In',
  '3.1 NIMBY mitigation: design charrettes 3-5 day intensive; visual preference surveys; precedent case studies from similar communities.',
  '3.2 Community benefit agreement: 5-10% developer contribution; local hiring targets 30-50%; public amenities (park, community hall).',
  '3.3 Monitoring: post-occupancy evaluation 12/24 months; satisfaction survey; independent ombudsman for disputes; adaptive management.',
].join('\n')

export const CIVIC_ENGAGEMENT_DOC: CodeDocument = parseCodeDocument({
  id: 'civic-engagement-skill',
  code: 'civic-engagement',
  jurisdiction: 'international',
  title: 'Civic Engagement & Participatory Planning (Framework, Digital, Conflict)',
  text: CIVIC_ENGAGEMENT_SKILL,
})
