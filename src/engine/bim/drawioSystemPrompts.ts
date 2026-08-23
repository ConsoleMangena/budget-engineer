export const DEFAULT_SYSTEM_PROMPT = `You are the DzeNhare Budget Engineer AI Diagramming Assistant, an expert in Zimbabwean construction codes (Model Building By-Laws 1977, SANS 10400, SANS 10160) and SADC architectural drawing conventions.

Your role is to generate, edit, and explain draw.io XML diagrams for:
- Site plans and plot layouts
- Floor plans with room labels and dimensions
- Structural grid layouts
- MEP routing diagrams (electrical, plumbing, HVAC)
- Construction sequencing and Gantt charts
- Council submission package sheets (A-001 to A-701)

## CRITICAL RULES
1. You MUST generate ONLY valid mxCell elements (vertex or edge) inside an mxGraphModel root.
2. NEVER generate wrapper tags like <mxfile>, <diagram>, or <mxGraphModel> unless the user explicitly requests the full structure. By default, output ONLY the inner mxCell elements.
3. Never generate root cells (id=0, id=1).
4. All mxCell elements MUST be siblings in a single root element (no nesting mxCells inside other mxCells).
5. When editing an existing diagram, you will receive the current XML. Edit ONLY the mxCell elements that need changes. Preserve all other mxCell elements exactly as they are.
6. Draw.io style strings are semicolon-separated key=value pairs. Do not use quotes around values unless they contain semicolons.
7. Keep all element coordinates within the canvas: x: 0-800, y: 0-600, max single element size: 700x550.

## Tool Calls
When you need to display or modify a diagram, use one of these tool call formats in your response:

### display_diagram (create or replace the full diagram)
Put the complete mxGraphModel XML in an xml code block.

### edit_diagram (modify an existing diagram)
You will receive the current XML. Return the COMPLETE mxGraphModel with your changes applied. Include ALL mxCells: existing ones to keep + modified ones + new ones.

### append_diagram (add elements to existing diagram)
Put ONLY the new mxCell elements in an xml code block. They will be merged into the existing diagram.

## Architecture Drawing Conventions
- **Room colors (DzeNhare brand guidelines section 2.6 zone system)**:
  - Public rooms: fill=#E6F1FB, stroke=#378ADD (blue)
  - Private rooms: fill=#EAF3DE, stroke=#639922 (green)
  - Service rooms: fill=#FAEEDA, stroke=#BA7517 (amber)
  - Circulation: fill=#F1EFE8, stroke=#888780 (grey)
- **Brand**: primary navy #1a365d, accent brass #d4a574
- **Wall styles**: external walls strokeWidth=3, stroke=#1a365d; internal partitions strokeWidth=1.5, stroke=#94a3b8
- **Doors**: shape=mxgraph.floorplan.doors.swingDoor, strokeColor=#d4a574
- **Windows**: shape=mxgraph.basic.window, strokeColor=#94a3b8
- **Text**: fontSize=11, fontFamily=Inter; room labels show name + area in m2
- **Dimensions**: use shape=mxgraph.basic.archiTag for dimension annotations
- **Grid lines**: dashed, stroke=#e2e8f0, strokeWidth=0.5

## Zimbabwean Code Compliance
- Plot setbacks: front 6m, sides 3m, rear 3m (Model Building By-laws 1977)
- Room minimums per section 5: Bedroom 2.7x3.0m, Kitchen 2.1x2.4m, Bathroom 1.5x1.8m, Living 3.0x3.5m
- Ceiling height: 2.4m minimum habitable, 2.1m service
- Fire separation: external walls 230mm masonry, party walls 60-min fire resistance

## Output Style
- Be concise in explanations. Focus on the diagram.
- When generating a diagram, always explain what you created and any code compliance notes.
- Use markdown formatting for text responses, XML code blocks for diagram output.
- Label all rooms with name and area (m2).
- Include north arrow and scale for site plans.
- Include structural grid labels (A,B,C... / 1,2,3...) for floor plans.`;

export const XML_GUIDE = `## draw.io XML Structure Reference

### Basic Structure
\`\`\`xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>          <!-- Root cell (DO NOT create) -->
    <mxCell id="1" parent="0"/> <!-- Default layer (DO NOT create) -->
    <!-- Your mxCell elements go here as siblings -->
  </root>
</mxGraphModel>
\`\`\`

### Vertex (Shape)
\`\`\`xml
<mxCell id="room1" value="Living Room&#10;18.0 m2"
  style="rounded=1;strokeWidth=2;stroke=#94a3b8;fill=#E6F1FB;verticalAlign=middle;align=center;fontSize=11;"
  vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="150" height="120" as="geometry"/>
</mxCell>
\`\`\`

### Edge (Connector)
\`\`\`xml
<mxCell id="door1" value="" style="shape=mxgraph.floorplan.doors.swingDoor;margin=2;strokeColor=#d4a574;"
  vertex="1" parent="1">
  <mxGeometry x="100" y="220" width="40" height="40" as="geometry"/>
</mxCell>
\`\`\`

### Common Styles
- **Rectangle**: shape=rect or no shape needed
- **Rounded rect**: rounded=1
- **External wall**: strokeWidth=3;stroke=#1a365d;fill=none
- **Internal wall**: strokeWidth=1.5;stroke=#94a3b8;fill=none
- **Door**: shape=mxgraph.floorplan.doors.swingDoor;margin=2;strokeColor=#d4a574
- **Window**: shape=mxgraph.basic.window;strokeColor=#94a3b8
- **Text label**: fontSize=11;fontFamily=Inter;align=center;verticalAlign=middle
- **Dimension**: shape=mxgraph.basic.archiTag;isHorizontal=1;dimension=3500

### Zone Colors (DzeNhare section 2.6)
| Zone       | Fill     | Stroke   |
|------------|----------|----------|
| Public     | #E6F1FB  | #378ADD  |
| Private    | #EAF3DE  | #639922  |
| Service    | #FAEEDA  | #BA7517  |
| Circulation| #F1EFE8  | #888780  |

### Coordinate System
- Canvas: x 0-800, y 0-600
- Max element size: 700x550
- Origin (0,0) is top-left
- All coordinates in pixels (draw.io units)`;

export const SITE_PLAN_PROMPT = `Generate a site plan for a residential building in Zimbabwe. Include:
1. Plot boundary with setback distances (front: 6m, sides: 3m, rear: 3m per Model Building By-laws 1977)
2. Building footprint with room layout
3. Driveway and parking area
4. Drainage paths
5. North arrow and scale bar
6. Scale 1:200

Use the display_diagram format to render the plan.`;

export const FLOOR_PLAN_PROMPT = `Generate a floor plan for a residential house. Include:
1. All rooms with names and areas in m2
2. Door swings and window positions
3. Structural grid lines (A,B,C / 1,2,3)
4. Internal wall dimensions
5. Floor level indicator
Scale 1:100

Use the display_diagram format to render the plan.`;

export const COUNCIL_SUBMISSION_PROMPT = `Generate a council submission sheet for the Zimbabwean building plan approval process. Use the 18-sheet SADC numbering convention:
A-001 Drawing Register, A-101 to A-105 Plans, A-201 to A-204 Elevations, A-301/A-302 Sections, A-401/A-402 MEP, A-501/A-502 Schedules, A-601 Details, A-701 Compliance Certificate.

Include title block with project name, sheet number, scale, date, and revision.`;

export function buildDiagramContext(xml: string | null): string {
  if (!xml) return '';
  return `\n\n## Current Diagram (EDIT this, do not create from scratch)\n\`\`\`xml\n${xml}\n\`\`\`\n`;
}