// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  DEFAULT_SYSTEM_PROMPT,
  XML_GUIDE,
  SHAPE_LIBRARY,
  SITE_PLAN_PROMPT,
  FLOOR_PLAN_PROMPT,
  COUNCIL_SUBMISSION_PROMPT,
  buildDiagramContext,
} from '@/engine/bim/drawioSystemPrompts';
import {
  extractXmlFromText,
  detectTool,
  mergeXml,
  repairXml,
  quotaCheck,
  fileValidation,
  sendDrawioMessage,
  type DrawioMessage,
} from '@/engine/bim/drawioChat';
import { DrawIoEditor } from '@/components/bim/DrawIoEditor';

vi.mock('react-drawio', () => ({
  DrawIoEmbed: Object.assign(
    React.forwardRef(
      (
        props: Record<string, unknown>,
        ref: React.Ref<unknown>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          load: vi.fn(),
          exportDiagram: vi.fn(),
        }));
        return (
          <div data-testid="mock-drawio">
            {props.xml ? 'diagram-loaded' : 'empty'}
          </div>
        );
      },
    ),
    { displayName: 'DrawIoEmbed' },
  ),
}));

const mockGenerateFree = vi.fn();
vi.mock('@/lib/llm/freeRouter', () => ({
  generateFree: (...args: unknown[]) => mockGenerateFree(...args),
}));

const SAMPLE_XML =
  '<mxGraphModel>' +
  '<root>' +
  '<mxCell id="0"/>' +
  '<mxCell id="1" parent="0"/>' +
  '<mxCell id="room1" value="Living Room 18.0m2" style="rounded=1;fill=#E6F1FB;stroke=#378ADD;" vertex="1" parent="1">' +
  '<mxGeometry x="100" y="100" width="150" height="120" as="geometry"/>' +
  '</mxCell>' +
  '</root>' +
  '</mxGraphModel>';

const NEW_CELLS_XML =
  '<mxGraphModel>' +
  '<root>' +
  '<mxCell id="room2" value="Kitchen 9.0m2" style="rounded=1;fill=#FAEEDA;stroke=#BA7517;" vertex="1" parent="1">' +
  '<mxGeometry x="250" y="100" width="120" height="100" as="geometry"/>' +
  '</mxCell>' +
  '</root>' +
  '</mxGraphModel>';

// ──────────────────────────────────────
// 1. drawioSystemPrompts
// ──────────────────────────────────────
describe('drawioSystemPrompts', () => {
  it('DEFAULT_SYSTEM_PROMPT references DzeNhare brand navy', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#1a365d');
  });

  it('DEFAULT_SYSTEM_PROMPT references DzeNhare brand brass', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#d4a574');
  });

  it('does NOT use forest green or gold palette', () => {
    expect(DEFAULT_SYSTEM_PROMPT).not.toContain('#0B3D2E');
    expect(DEFAULT_SYSTEM_PROMPT).not.toContain('#C9A227');
  });

  it('contains CRITICAL RULES', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('CRITICAL RULES');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('mxCell');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('mxGraphModel');
  });

  it('references Zimbabwean codes', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Model Building By-Laws 1977');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('SANS 10400');
  });

  it('includes zone color system', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#E6F1FB');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#EAF3DE');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#FAEEDA');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#F1EFE8');
  });

  it('describes all 4 tool call formats', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('display_diagram');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('edit_diagram');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('append_diagram');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('get_shape_library');
  });

  it('contains Grade A-D fire resistance', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Grade A');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Grade D');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('4 hrs');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('0.5 hrs');
  });

  it('contains SAZ 7 MPa brick specification', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('7 MPa');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('400x200x200');
  });

  it('contains ZIQS SMM measurement rules', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('ZIQS SMM');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('115mm');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('230mm');
  });

  it('contains SI 56/2025 ACZ registration', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('SI 56/2025');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('ACZ');
  });

  it('references room-standards registry', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('room-standards');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('2.7x3.0m');
  });

  it('references construction details library', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('construction details');
  });

  it('references 18-sheet SADC council package', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('A-001');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('A-701');
  });

  it('Ch2 setbacks are front3 rear2 side1.5', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('front 3m');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('rear 2m');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('side 1.5m');
  });
});

// ──────────────────────────────────────
// 2. XML_GUIDE structure
// ──────────────────────────────────────
describe('xml_guide structure', () => {
  it('contains mxfile wrapper', () => {
    expect(XML_GUIDE).toContain('<mxfile>');
    expect(XML_GUIDE).toContain('</mxfile>');
  });

  it('contains Page-1 diagram reference', () => {
    expect(XML_GUIDE).toContain('Page-1');
  });

  it('contains diagram tag with name and id', () => {
    expect(XML_GUIDE).toContain('<diagram');
    expect(XML_GUIDE).toContain('name=');
    expect(XML_GUIDE).toContain('id=');
  });

  it('contains mxGraphModel with dx/dy/grid', () => {
    expect(XML_GUIDE).toContain('dx=');
    expect(XML_GUIDE).toContain('dy=');
    expect(XML_GUIDE).toContain('grid=');
  });

  it('contains pageWidth 850 and pageHeight 1100', () => {
    expect(XML_GUIDE).toContain('pageWidth="850"');
    expect(XML_GUIDE).toContain('pageHeight="1100"');
  });

  it('contains mxGraphModel skeleton', () => {
    expect(XML_GUIDE).toContain('<mxGraphModel>');
    expect(XML_GUIDE).toContain('mxCell id="0"');
    expect(XML_GUIDE).toContain('mxCell id="1"');
  });

  it('documents zone color table', () => {
    expect(XML_GUIDE).toContain('#E6F1FB');
    expect(XML_GUIDE).toContain('#378ADD');
    expect(XML_GUIDE).toContain('#639922');
  });

  it('documents coordinate system', () => {
    expect(XML_GUIDE).toContain('0-800');
    expect(XML_GUIDE).toContain('0-600');
  });

  it('contains gridSize', () => {
    expect(XML_GUIDE).toContain('gridSize="10"');
  });
});

// ──────────────────────────────────────
// 3. SHAPE_LIBRARY
// ──────────────────────────────────────
describe('shape_library', () => {
  it('has floor plan shapes', () => {
    expect(SHAPE_LIBRARY).toContain('swingDoor');
    expect(SHAPE_LIBRARY).toContain('window');
    expect(SHAPE_LIBRARY).toContain('stairs');
  });

  it('has site plan shapes', () => {
    expect(SHAPE_LIBRARY).toContain('tree');
    expect(SHAPE_LIBRARY).toContain('car');
  });

  it('has annotation shapes', () => {
    expect(SHAPE_LIBRARY).toContain('archiTag');
  });
});

// ──────────────────────────────────────
// 4. Preset prompts
// ──────────────────────────────────────
describe('preset prompts', () => {
  it('SITE_PLAN_PROMPT references Zimbabwe setbacks', () => {
    expect(SITE_PLAN_PROMPT).toContain('front: 3m');
    expect(SITE_PLAN_PROMPT).toContain('rear: 2m');
    expect(SITE_PLAN_PROMPT).toContain('sides: 1.5m');
    expect(SITE_PLAN_PROMPT).toContain('1:200');
  });

  it('FLOOR_PLAN_PROMPT requests room areas', () => {
    expect(FLOOR_PLAN_PROMPT).toContain('1:100');
    expect(FLOOR_PLAN_PROMPT).toContain('display_diagram');
  });

  it('COUNCIL_SUBMISSION_PROMPT lists all 18 sheets', () => {
    expect(COUNCIL_SUBMISSION_PROMPT).toContain('A-001');
    expect(COUNCIL_SUBMISSION_PROMPT).toContain('A-701');
  });

  it('buildDiagramContext returns empty for null xml', () => {
    expect(buildDiagramContext(null)).toBe('');
  });

  it('buildDiagramContext wraps xml in code block', () => {
    const ctx = buildDiagramContext(SAMPLE_XML);
    expect(ctx).toContain('Current Diagram');
    expect(ctx).toContain(SAMPLE_XML);
  });
});

// ──────────────────────────────────────
// 5. extractXmlFromText
// ──────────────────────────────────────
describe('extractXmlFromText', () => {
  it('extracts mxGraphModel from xml code block', () => {
    const text = 'Here is the diagram:\n```xml\n' + SAMPLE_XML + '\n```';
    const result = extractXmlFromText(text);
    expect(result).toContain('<mxGraphModel>');
    expect(result).toContain('room1');
  });

  it('extracts bare mxGraphModel without code fence', () => {
    const result = extractXmlFromText('Diagram: ' + SAMPLE_XML);
    expect(result).toContain('<mxGraphModel>');
  });

  it('returns null when no XML present', () => {
    expect(extractXmlFromText('No diagram here')).toBeNull();
  });

  it('prefers xml code block over bare mxGraphModel', () => {
    const bare = '<mxGraphModel><root><mxCell id="bare"/></root></mxGraphModel>';
    const fenced = '<mxGraphModel><root><mxCell id="fenced"/></root></mxGraphModel>';
    const text = bare + '\n```xml\n' + fenced + '\n```';
    const result = extractXmlFromText(text);
    expect(result).toContain('fenced');
  });
});

// ──────────────────────────────────────
// 6. detectTool
// ──────────────────────────────────────
describe('detectTool', () => {
  it('returns null when no XML in response', () => {
    expect(detectTool('No diagram', null)).toBeNull();
  });

  it('returns display_diagram when no current XML', () => {
    expect(detectTool('```xml\n<mxGraphModel/>```', null)).toBe('display_diagram');
  });

  it('returns append_diagram when text mentions append', () => {
    const text = 'I will append_diagram:\n```xml\n<mxGraphModel/>```';
    expect(detectTool(text, SAMPLE_XML)).toBe('append_diagram');
  });

  it('returns edit_diagram as default when current XML exists', () => {
    const text = 'Here is the updated diagram:\n```xml\n<mxGraphModel/>```';
    expect(detectTool(text, SAMPLE_XML)).toBe('edit_diagram');
  });

  it('returns get_shape_library when text has no XML but mentions shapes', () => {
    expect(detectTool('show me get_shape_library', SAMPLE_XML)).toBe('get_shape_library');
  });
});

// ──────────────────────────────────────
// 7. mergeXml
// ──────────────────────────────────────
describe('mergeXml', () => {
  it('returns newXml when no current XML', () => {
    const result = mergeXml(null, NEW_CELLS_XML, 'display_diagram');
    expect(result).toBe(NEW_CELLS_XML);
  });

  it('replaces on display_diagram', () => {
    const result = mergeXml(SAMPLE_XML, NEW_CELLS_XML, 'display_diagram');
    expect(result).toBe(NEW_CELLS_XML);
  });

  it('appends cells on append_diagram', () => {
    const result = mergeXml(SAMPLE_XML, NEW_CELLS_XML, 'append_diagram');
    expect(result).toContain('room1');
    expect(result).toContain('room2');
  });

  it('replaces on edit_diagram', () => {
    const result = mergeXml(SAMPLE_XML, NEW_CELLS_XML, 'edit_diagram');
    expect(result).toBe(NEW_CELLS_XML);
  });
});

// ──────────────────────────────────────
// 8. repairXml
// ──────────────────────────────────────
describe('repairXml', () => {
  it('wraps bare cells in mxGraphModel', () => {
    const result = repairXml('<mxCell id="1"/>');
    expect(result).toContain('<mxGraphModel>');
    expect(result).toContain('<mxCell id="1"/>');
  });

  it('passes through valid mxGraphModel', () => {
    const result = repairXml(SAMPLE_XML);
    expect(result).toBe(SAMPLE_XML);
  });
});

// ──────────────────────────────────────
// 9. quotaCheck
// ──────────────────────────────────────
describe('quotaCheck', () => {
  it('allows under limit', () => {
    const msgs: DrawioMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: 'user',
      content: 'msg ' + String(i),
    }));
    expect(quotaCheck(msgs).allowed).toBe(true);
  });

  it('blocks over 50 user messages', () => {
    const msgs: DrawioMessage[] = Array.from({ length: 55 }, (_, i) => ({
      role: 'user',
      content: 'msg ' + String(i),
    }));
    const result = quotaCheck(msgs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('50');
  });

  it('blocks when XML total exceeds 500KB', () => {
    const bigXml = 'x'.repeat(300_000);
    const msgs: DrawioMessage[] = [
      { role: 'user', content: 'a', xml: bigXml },
      { role: 'assistant', content: 'b', xml: bigXml },
    ];
    const result = quotaCheck(msgs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('XML size');
  });
});

// ──────────────────────────────────────
// 10. fileValidation
// ──────────────────────────────────────
describe('fileValidation', () => {
  it('accepts .drawio', () => {
    expect(fileValidation('plan.drawio').valid).toBe(true);
  });

  it('accepts .xml', () => {
    expect(fileValidation('plan.xml').valid).toBe(true);
  });

  it('accepts .svg', () => {
    expect(fileValidation('plan.svg').valid).toBe(true);
  });

  it('accepts .png', () => {
    expect(fileValidation('plan.png').valid).toBe(true);
  });

  it('accepts .pdf', () => {
    expect(fileValidation('plan.pdf').valid).toBe(true);
  });

  it('accepts .vsdx', () => {
    expect(fileValidation('plan.vsdx').valid).toBe(true);
  });

  it('rejects .pdf with reason', () => {
    const result = fileValidation('bad.exe');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('.exe');
  });
});

// ──────────────────────────────────────
// 11. sendDrawioMessage
// ──────────────────────────────────────
describe('sendDrawioMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns quota error when over message limit', async () => {
    const msgs: DrawioMessage[] = Array.from({ length: 55 }, (_, i) => ({
      role: 'user',
      content: 'msg ' + String(i),
    }));
    const result = await sendDrawioMessage('test', msgs, null);
    expect(result.error).toContain('50');
  });

  it('returns shape library when requested', async () => {
    const result = await sendDrawioMessage('show me get_shape_library', [], null);
    expect(result.message.content).toContain('shape library');
    expect(result.xml).toBeNull();
  });

  it('returns shape library on "available shapes"', async () => {
    const result = await sendDrawioMessage('what available shapes do I have', [], null);
    expect(result.message.content).toContain('shape library');
  });

  it('calls generateFree with system prompts and history', async () => {
    mockGenerateFree.mockResolvedValueOnce({ text: 'Sure!', error: undefined });
    const history: DrawioMessage[] = [
      { role: 'user', content: 'Create a room' },
      { role: 'assistant', content: 'Here it is.' },
    ];
    await sendDrawioMessage('add a door', history, SAMPLE_XML);
    expect(mockGenerateFree).toHaveBeenCalled();
    const messages = mockGenerateFree.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(messages[0].content).toContain('DzeNhare');
    expect(messages.some((m) => m.content.includes('Current Diagram'))).toBe(true);
  });

  it('handles generateFree error', async () => {
    mockGenerateFree.mockResolvedValueOnce({ text: null, error: 'API key missing' });
    const result = await sendDrawioMessage('test', [], null);
    expect(result.error).toContain('API key missing');
  });

  it('extracts XML from response and merges', async () => {
    const aiResponse = 'Here is the floor plan:\n```xml\n' + NEW_CELLS_XML + '\n```';
    mockGenerateFree.mockResolvedValueOnce({ text: aiResponse, error: undefined });
    const result = await sendDrawioMessage('create kitchen', [], null);
    expect(result.xml).toContain('room2');
    expect(result.message.tool).toBe('display_diagram');
  });

  it('extracts reasoning from response', async () => {
    const aiResponse = '\n\nThinking: I need to add a room\n\n```xml\n' + SAMPLE_XML + '\n```';
    mockGenerateFree.mockResolvedValueOnce({ text: aiResponse, error: undefined });
    const result = await sendDrawioMessage('add room', [], null);
    expect(result.message.reasoning).toContain('add a room');
  });

  it('repairs broken XML', async () => {
    const brokenXml = '<mxGraphModel><mxCell id="x" value="test"><mxGeometry width="100" as="geometry"/></mxGraphModel>';
    const aiResponse = '```xml\n' + brokenXml + '\n```';
    mockGenerateFree.mockResolvedValueOnce({ text: aiResponse, error: undefined });
    const result = await sendDrawioMessage('test', [], null);
    expect(result.xml).toContain('<mxGraphModel>');
    expect(result.xml).toContain('</mxCell>');
  });
});

// ──────────────────────────────────────
// 12. DrawIoEditor component
// ──────────────────────────────────────
describe('DrawIoEditor component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty state', () => {
    render(<DrawIoEditor />);
    expect(screen.getByText('AI Diagram Editor')).toBeTruthy();
    expect(screen.getByText('No diagram yet')).toBeTruthy();
  });

  it('renders preset buttons', () => {
    render(<DrawIoEditor />);
    expect(screen.getAllByText('Site Plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Floor Plan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Council Pack').length).toBeGreaterThanOrEqual(1);
  });

  it('renders chat input', () => {
    const { container } = render(<DrawIoEditor />);
    expect(
      container.querySelector('textarea[placeholder="Describe your diagram..."]'),
    ).toBeTruthy();
  });

  it('renders toolbar buttons', () => {
    render(<DrawIoEditor />);
    expect(screen.getAllByTitle('Chat history').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle(/Theme:/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Upload file').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Export .drawio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Clear chat').length).toBeGreaterThanOrEqual(1);
  });

  it('renders with initial xml', () => {
    render(<DrawIoEditor initialXml={SAMPLE_XML} />);
    expect(screen.getByTestId('mock-drawio')).toBeTruthy();
  });

  it('has data-component attribute', () => {
    const { container } = render(<DrawIoEditor />);
    expect(
      container.querySelector('[data-component="drawio-editor"]'),
    ).toBeTruthy();
  });

  it('cycles theme through dark/light/sketch', () => {
    render(<DrawIoEditor />);
    const themeBtn = screen.getAllByTitle(/Theme:/)[0];
    expect(themeBtn.getAttribute('title')).toContain('Dark');
    fireEvent.click(themeBtn);
    expect(screen.getAllByTitle(/Theme:/)[0].getAttribute('title')).toContain('Light');
    fireEvent.click(screen.getAllByTitle(/Theme:/)[0]);
    expect(screen.getAllByTitle(/Theme:/)[0].getAttribute('title')).toContain('Sketch');
    fireEvent.click(screen.getAllByTitle(/Theme:/)[0]);
    expect(screen.getAllByTitle(/Theme:/)[0].getAttribute('title')).toContain('Dark');
  });

  it('shows empty history panel', () => {
    render(<DrawIoEditor />);
    fireEvent.click(screen.getAllByTitle('Chat history')[0]);
    expect(screen.getByText('Diagram History')).toBeTruthy();
    expect(screen.getByText('No snapshots yet')).toBeTruthy();
  });

  it('populates history after AI message with XML', async () => {
    mockGenerateFree.mockResolvedValueOnce({
      text: '```xml\n' + SAMPLE_XML + '\n```',
      error: undefined,
    });
    const { container } = render(<DrawIoEditor />);
    const textarea = container.querySelector('textarea[placeholder="Describe your diagram..."]') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Create a floor plan' } });
    });
    const sendBtn = container.querySelector('button.self-end') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(sendBtn);
    });
    fireEvent.click(screen.getAllByTitle('Chat history')[0]);
    expect(screen.queryByText('No snapshots yet')).toBeNull();
  });

  it('clears chat and history on clear', async () => {
    const { container } = render(<DrawIoEditor />);
    fireEvent.click(screen.getAllByTitle('Clear chat')[0]);
    const allPs = container.querySelectorAll('p');
    const askDiagram = Array.from(allPs).find(p => p.textContent === 'Ask me to create a diagram');
    expect(askDiagram).toBeTruthy();
    expect(screen.getAllByText('No diagram yet').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error for unsupported file type', () => {
    render(<DrawIoEditor />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.exe', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'name', { value: 'test.exe' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);
    expect(screen.getByText(/Unsupported file type/)).toBeTruthy();
  });
});
