import { generateFree } from '@/lib/llm/freeRouter';
import type { ChatMessage } from '@/lib/ai/remote-providers';
import { DEFAULT_SYSTEM_PROMPT, XML_GUIDE, buildDiagramContext } from './drawioSystemPrompts';

export interface DrawioMessage {
  role: 'user' | 'assistant';
  content: string;
  xml?: string;
  tool?: 'display_diagram' | 'edit_diagram' | 'append_diagram' | null;
}

export interface DrawioChatResult {
  message: DrawioMessage;
  xml: string | null;
  error?: string;
}

const XML_BLOCK_RE = /```xml\s*\n([\s\S]*?)```/g;
const MXGRAPH_RE = /<mxGraphModel[\s\S]*<\/mxGraphModel>/;

function extractXmlFromText(text: string): string | null {
  const blocks = [...text.matchAll(XML_BLOCK_RE)];
  for (const block of blocks) {
    const inner = block[1].trim();
    if (MXGRAPH_RE.test(inner)) return inner;
  }
  const direct = text.match(MXGRAPH_RE);
  if (direct) return direct[0];
  return null;
}

function detectTool(text: string, currentXml: string | null): DrawioMessage['tool'] {
  const hasXml = XML_BLOCK_RE.test(text) || MXGRAPH_RE.test(text);
  if (!hasXml) return null;
  XML_BLOCK_RE.lastIndex = 0;
  if (!currentXml) return 'display_diagram';
  const lower = text.toLowerCase();
  if (lower.includes('append_diagram') || lower.includes('add to') || lower.includes('add these'))
    return 'append_diagram';
  if (lower.includes('edit_diagram') || lower.includes('modify') || lower.includes('update'))
    return 'edit_diagram';
  return 'edit_diagram';
}

function mergeXml(currentXml: string | null, newXml: string, tool: DrawioMessage['tool']): string {
  if (!currentXml || tool === 'display_diagram') return newXml;
  if (tool === 'append_diagram') {
    const rootMatch = currentXml.match(/<root>([\s\S]*?)<\/root>/);
    const newRootMatch = newXml.match(/<root>([\s\S]*?)<\/root>/);
    if (rootMatch && newRootMatch) {
      const existingCells = rootMatch[1];
      const newCells = newRootMatch[1];
      return currentXml.replace(
        /<root>[\s\S]*?<\/root>/,
        `<root>${existingCells}\n${newCells}</root>`,
      );
    }
    return currentXml;
  }
  return newXml;
}

function quotaCheck(messages: DrawioMessage[]): { allowed: boolean; reason?: string } {
  const userCount = messages.filter((m) => m.role === 'user').length;
  if (userCount > 50) return { allowed: false, reason: 'Message limit reached (50). Clear chat to continue.' };
  const totalXmlChars = messages.reduce((sum, m) => sum + (m.xml?.length ?? 0), 0);
  if (totalXmlChars > 500_000) return { allowed: false, reason: 'XML size limit reached. Clear chat to free memory.' };
  return { allowed: true };
}

function fileValidation(fileName: string): { valid: boolean; reason?: string } {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'drawio' || ext === 'xml' || ext === 'svg' || ext === 'png' || ext === 'vsdx') {
    return { valid: true };
  }
  return { valid: false, reason: `Unsupported file type: .${ext}. Supported: .drawio, .xml, .svg, .png` };
}

export async function sendDrawioMessage(
  userMessage: string,
  history: DrawioMessage[],
  currentXml: string | null,
): Promise<DrawioChatResult> {
  const quota = quotaCheck(history);
  if (!quota.allowed) {
    return {
      message: { role: 'assistant', content: quota.reason! },
      xml: currentXml,
      error: quota.reason,
    };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    { role: 'system', content: XML_GUIDE },
  ];

  if (currentXml) {
    messages.push({
      role: 'system',
      content: buildDiagramContext(currentXml),
    });
  }

  for (const msg of history.slice(-20)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userMessage });

  const result = await generateFree(messages, { temperature: 0.3 });

  if (result.error || !result.text) {
    return {
      message: { role: 'assistant', content: `Error: ${result.error ?? 'No response from AI'}` },
      xml: currentXml,
      error: result.error,
    };
  }

  const text = result.text;
  const extractedXml = extractXmlFromText(text);
  const tool = detectTool(text, currentXml);
  const updatedXml = extractedXml ? mergeXml(currentXml, extractedXml, tool) : currentXml;

  return {
    message: { role: 'assistant', content: text, xml: updatedXml ?? undefined, tool },
    xml: updatedXml,
  };
}

export { extractXmlFromText, detectTool, mergeXml, quotaCheck, fileValidation };