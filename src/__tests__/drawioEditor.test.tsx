// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DEFAULT_SYSTEM_PROMPT,
  XML_GUIDE,
  SITE_PLAN_PROMPT,
  FLOOR_PLAN_PROMPT,
  COUNCIL_SUBMISSION_PROMPT,
  buildDiagramContext,
} from '@/engine/bim/drawioSystemPrompts';
import {
  extractXmlFromText,
  detectTool,
  mergeXml,
  quotaCheck,
  fileValidation,
} from '@/engine/bim/drawioChat';
import { DrawIoEditor } from '@/components/bim/DrawIoEditor';

vi.mock('react-drawio', () => ({
  DrawIoEmbed: Object.assign(
    React.forwardRef(
      (
        props: Record<string, unknown>,
        ref: React.Ref<unknown>,
      ) => {
        React.useImperativeHandle(ref, () => ({}));
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

describe('drawioSystemPrompts', () => {
  it('DEFAULT_SYSTEM_PROMPT references DzeNhare brand navy', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#1a365d');
  });

  it('DEFAULT_SYSTEM_PROMPT references DzeNhare brand brass', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#d4a574');
  });

  it('DEFAULT_SYSTEM_PROMPT contains CRITICAL RULES', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('CRITICAL RULES');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('mxCell');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('mxGraphModel');
  });

  it('DEFAULT_SYSTEM_PROMPT references Zimbabwean codes', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Model Building By-Laws 1977');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('SANS 10400');
  });

  it('DEFAULT_SYSTEM_PROMPT includes zone color system', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#E6F1FB');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#EAF3DE');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#FAEEDA');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('#F1EFE8');
  });

  it('DEFAULT_SYSTEM_PROMPT describes tool call formats', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('display_diagram');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('edit_diagram');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('append_diagram');
  });

  it('XML_GUIDE contains mxGraphModel skeleton', () => {
    expect(XML_GUIDE).toContain('<mxGraphModel>');
    expect(XML_GUIDE).toContain('mxCell id="0"');
    expect(XML_GUIDE).toContain('mxCell id="1"');
  });

  it('XML_GUIDE documents zone color table', () => {
    expect(XML_GUIDE).toContain('#E6F1FB');
    expect(XML_GUIDE).toContain('#378ADD');
    expect(XML_GUIDE).toContain('#639922');
  });

  it('XML_GUIDE documents coordinate system', () => {
    expect(XML_GUIDE).toContain('0-800');
    expect(XML_GUIDE).toContain('0-600');
  });

  it('SITE_PLAN_PROMPT references Zimbabwe setbacks', () => {
    expect(SITE_PLAN_PROMPT).toContain('6m');
    expect(SITE_PLAN_PROMPT).toContain('3m');
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

describe('extractXmlFromText', () => {
  it('extracts mxGraphModel from xml code block', () => {
    const text =
      'Here is the diagram:\n```xml\n' + SAMPLE_XML + '\n```';
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
    const bare =
      '<mxGraphModel><root><mxCell id="bare"/></root></mxGraphModel>';
    const fenced =
      '<mxGraphModel><root><mxCell id="fenced"/></root></mxGraphModel>';
    const text = bare + '\n```xml\n' + fenced + '\n```';
    const result = extractXmlFromText(text);
    expect(result).toContain('fenced');
  });
});

describe('detectTool', () => {
  it('returns null when no XML in response', () => {
    expect(detectTool('No diagram', null)).toBeNull();
  });

  it('returns display_diagram when no current XML', () => {
    expect(
      detectTool('```xml\n<mxGraphModel/>```', null),
    ).toBe('display_diagram');
  });

  it('returns append_diagram when text mentions append', () => {
    const text =
      'I will append_diagram:\n```xml\n<mxGraphModel/>```';
    expect(detectTool(text, SAMPLE_XML)).toBe('append_diagram');
  });

  it('returns edit_diagram as default when current XML exists', () => {
    const text =
      'Here is the updated diagram:\n```xml\n<mxGraphModel/>```';
    expect(detectTool(text, SAMPLE_XML)).toBe('edit_diagram');
  });
});

describe('mergeXml', () => {
  it('returns newXml when no current XML', () => {
    const result = mergeXml(null, NEW_CELLS_XML, 'display_diagram');
    expect(result).toBe(NEW_CELLS_XML);
  });

  it('replaces on display_diagram', () => {
    const result = mergeXml(
      SAMPLE_XML,
      NEW_CELLS_XML,
      'display_diagram',
    );
    expect(result).toBe(NEW_CELLS_XML);
  });

  it('appends cells on append_diagram', () => {
    const result = mergeXml(
      SAMPLE_XML,
      NEW_CELLS_XML,
      'append_diagram',
    );
    expect(result).toContain('room1');
    expect(result).toContain('room2');
  });

  it('replaces on edit_diagram', () => {
    const result = mergeXml(
      SAMPLE_XML,
      NEW_CELLS_XML,
      'edit_diagram',
    );
    expect(result).toBe(NEW_CELLS_XML);
  });
});

describe('quotaCheck', () => {
  it('allows under limit', () => {
    const msgs = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: 'msg ' + String(i),
    }));
    expect(quotaCheck(msgs).allowed).toBe(true);
  });

  it('blocks over 50 user messages', () => {
    const msgs = Array.from({ length: 55 }, (_, i) => ({
      role: 'user' as const,
      content: 'msg ' + String(i),
    }));
    const result = quotaCheck(msgs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('50');
  });

  it('blocks when XML total exceeds 500KB', () => {
    const bigXml = 'x'.repeat(300_000);
    const msgs = [
      { role: 'user' as const, content: 'a', xml: bigXml },
      { role: 'assistant' as const, content: 'b', xml: bigXml },
    ];
    const result = quotaCheck(msgs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('XML size');
  });
});

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

  it('rejects .pdf', () => {
    const result = fileValidation('plan.pdf');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('.pdf');
  });

  it('rejects .docx', () => {
    expect(fileValidation('plan.docx').valid).toBe(false);
  });
});

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
    expect(
      screen.getAllByText('Site Plan').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Floor Plan').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Council Pack').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders chat input', () => {
    const { container } = render(<DrawIoEditor />);
    expect(
      container.querySelector(
        'textarea[placeholder="Describe your diagram..."]',
      ),
    ).toBeTruthy();
  });

  it('renders toolbar buttons', () => {
    render(<DrawIoEditor />);
    expect(
      screen.getAllByTitle('Chat history').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTitle('Toggle theme').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTitle('Upload file').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTitle('Export .drawio').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTitle('Clear chat').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders with initial xml', () => {
    render(<DrawIoEditor initialXml={SAMPLE_XML} />);
    expect(screen.getByTestId('mock-drawio')).toBeTruthy();
  });

  it('has data-component attribute', () => {
    const { container } = render(<DrawIoEditor />);
    expect(
      container.querySelector(
        '[data-component="drawio-editor"]',
      ),
    ).toBeTruthy();
  });
});