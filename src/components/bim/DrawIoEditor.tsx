import { useState, useCallback, useRef, useEffect } from 'react';
import { DrawIoEmbed, type DrawIoEmbedRef } from 'react-drawio';
import { Button } from '@/components/ui/Button';
import {
  Send,
  Clock,
  Palette,
  Paperclip,
  Download,
  Trash2,
  FileCode,
  Sparkles,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import {
  sendDrawioMessage,
  fileValidation,
  type DrawioMessage,
} from '@/engine/bim/drawioChat';
import {
  SITE_PLAN_PROMPT,
  FLOOR_PLAN_PROMPT,
  COUNCIL_SUBMISSION_PROMPT,
} from '@/engine/bim/drawioSystemPrompts';

export interface DrawIoEditorProps {
  initialXml?: string;
  onXmlChange?: (xml: string) => void;
  height?: number;
}

interface HistorySnapshot {
  id: number;
  timestamp: number;
  xml: string;
  label: string;
}

const PRESET_PROMPTS = [
  { label: 'Site Plan', prompt: SITE_PLAN_PROMPT, icon: '🏡' },
  { label: 'Floor Plan', prompt: FLOOR_PLAN_PROMPT, icon: '🏠' },
  { label: 'Council Pack', prompt: COUNCIL_SUBMISSION_PROMPT, icon: '📋' },
];

const TOOL_LABELS: Record<string, string> = {
  display_diagram: 'New Diagram',
  edit_diagram: 'Edit',
  append_diagram: 'Append',
  get_shape_library: 'Shapes',
};

type ThemeMode = 'dark' | 'light' | 'sketch';

export function DrawIoEditor({
  initialXml = '',
  onXmlChange,
  height = 600,
}: DrawIoEditorProps) {
  const [messages, setMessages] = useState<DrawioMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [xml, setXml] = useState<string | null>(initialXml || null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [nextId, setNextId] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawioRef = useRef<DrawIoEmbedRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const pushHistory = useCallback(
    (xmlContent: string, label: string) => {
      if (!xmlContent) return;
      setHistory((prev) => [
        ...prev,
        { id: nextId, timestamp: Date.now(), xml: xmlContent, label },
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  const restoreHistory = useCallback(
    (snapshot: HistorySnapshot) => {
      setXml(snapshot.xml);
      onXmlChange?.(snapshot.xml);
      drawioRef.current?.load({ xml: snapshot.xml });
      setShowHistory(false);
    },
    [onXmlChange],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput('');
    setError(null);
    const userMsg: DrawioMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    if (xml) {
      pushHistory(xml, `Before: ${text.slice(0, 40)}`);
    }

    try {
      const result = await sendDrawioMessage(text, messages, xml);
      setMessages((prev) => [...prev, result.message]);
      if (result.xml && result.xml !== xml) {
        setXml(result.xml);
        onXmlChange?.(result.xml);
        drawioRef.current?.load({ xml: result.xml });
      }
      if (result.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsGenerating(false);
    }
  }, [input, messages, xml, isGenerating, onXmlChange, pushHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handlePreset = useCallback((preset: string) => {
    setInput(preset);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) =>
      prev === 'dark' ? 'light' : prev === 'light' ? 'sketch' : 'dark',
    );
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validation = fileValidation(file.name);
      if (!validation.valid) {
        setError(validation.reason!);
        return;
      }

      try {
        const text = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'drawio' || ext === 'xml') {
          pushHistory(xml ?? '', `Before upload: ${file.name}`);
          setXml(text);
          onXmlChange?.(text);
          drawioRef.current?.load({ xml: text });
        } else if (ext === 'svg') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Uploaded ${file.name}. I can see this SVG file. Would you like me to recreate it as a draw.io diagram with editable elements?`,
            },
          ]);
        } else if (ext === 'png' || ext === 'pdf') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Uploaded ${file.name}. I can analyze this image. Describe what diagram you would like me to create based on it, and I will generate the draw.io XML.`,
            },
          ]);
        }
      } catch {
        setError('Failed to read file');
      }
      e.target.value = '';
    },
    [onXmlChange, xml, pushHistory],
  );

  const handleExportXml = useCallback(() => {
    const content = xml ?? '';
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.drawio';
    a.click();
    URL.revokeObjectURL(url);
  }, [xml]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setXml(null);
    setError(null);
    setHistory([]);
    onXmlChange?.('');
  }, [onXmlChange]);

  const handleAutoSave = useCallback(
    (data: { xml: string }) => {
      if (data.xml) {
        setXml(data.xml);
        onXmlChange?.(data.xml);
      }
    },
    [onXmlChange],
  );

  const darkMode = themeMode === 'dark' || themeMode === 'sketch';

  const THEME_LABELS: Record<ThemeMode, string> = {
    dark: 'Dark',
    light: 'Light',
    sketch: 'Sketch',
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 overflow-hidden ${
        darkMode ? 'bg-slate-950/80' : 'bg-white'
      } ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      data-component="drawio-editor"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-[var(--brand-accent)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            AI Diagram Editor
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="h-8 w-8 p-0"
            title="Chat history"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            className="h-8 w-8 p-0"
            title={`Theme: ${THEME_LABELS[themeMode]}`}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 p-0"
            title="Upload file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportXml}
            className="h-8 w-8 p-0"
            title="Export .drawio"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 p-0"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="h-8 w-8 p-0"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".drawio,.xml,.svg,.png,.pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Preset prompts */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        {PRESET_PROMPTS.map((p) => (
          <Button
            key={p.label}
            variant="ghost"
            size="sm"
            onClick={() => handlePreset(p.prompt)}
            className="text-xs h-7"
          >
            <span className="mr-1">{p.icon}</span>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Main area: diagram + chat */}
      <div className="flex flex-1 min-h-0">
        {/* Draw.io canvas */}
        <div
          className="flex-1 bg-white relative"
          style={{ height: isFullscreen ? 'calc(100vh - 140px)' : height }}
          data-testid="drawio-canvas"
        >
          {xml ? (
            <DrawIoEmbed
              ref={drawioRef}
              xml={xml}
              autosave={true}
              onAutoSave={handleAutoSave}
              configuration={{
                ui: themeMode === 'sketch' ? 'sketch' : darkMode ? 'dark' : 'kennedy',
                grid: true,
                autosave: true,
              }}
              urlParameters={{
                ui: themeMode === 'sketch' ? 'sketch' : darkMode ? 'dark' : 'kennedy',
                dark: darkMode,
                spin: true,
                grid: true,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No diagram yet</p>
                <p className="text-xs mt-1 opacity-60">
                  Use the AI prompt below or choose a preset to create one
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <div
          className={`w-80 border-l border-white/10 flex flex-col ${
            darkMode ? 'bg-slate-900/60' : 'bg-slate-50'
          } ${showHistory ? '' : 'hidden lg:flex'}`}
          style={{ height: isFullscreen ? 'calc(100vh - 140px)' : height }}
        >
          {/* History panel */}
          {showHistory && (
            <div className="border-b border-white/10 p-3 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Diagram History
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  ×
                </Button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-2">
                  No snapshots yet
                </p>
              ) : (
                <div className="space-y-1">
                  {history
                    .slice()
                    .reverse()
                    .map((snap) => (
                      <button
                        key={snap.id}
                        onClick={() => restoreHistory(snap)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2"
                      >
                        <RotateCcw className="h-3 w-3 text-[var(--brand-accent)] shrink-0" />
                        <span className="text-[var(--text-secondary)] truncate">
                          {snap.label}
                        </span>
                        <span className="text-[var(--text-muted)] ml-auto shrink-0">
                          {new Date(snap.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-xs py-8">
                <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-30" />
                <p>Ask me to create a diagram</p>
                <p className="mt-1 opacity-60">
                  e.g. &quot;Create a floor plan for a 3-bedroom house&quot;
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg p-2.5 text-xs ${
                  msg.role === 'user'
                    ? 'bg-[var(--brand-primary)]/20 ml-4'
                    : 'bg-white/5 mr-4'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium text-[var(--text-primary)]">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  {msg.tool && msg.tool !== 'get_shape_library' && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] text-[10px]">
                      {TOOL_LABELS[msg.tool] ?? msg.tool}
                    </span>
                  )}
                </div>
                {msg.reasoning && (
                  <div className="mb-1.5 px-2 py-1 rounded bg-[var(--brand-accent)]/5 border border-[var(--brand-accent)]/10 text-[10px] text-[var(--text-muted)] italic">
                    💭 {msg.reasoning}
                  </div>
                )}
                <div className="text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                  {msg.content.length > 500
                    ? msg.content.slice(0, 500) + '...'
                    : msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your diagram..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-slate-400 resize-none"
                rows={2}
              />
              <Button
                variant="brand"
                size="sm"
                onClick={handleSend}
                disabled={isGenerating || !input.trim()}
                className="self-end h-8 w-8 p-0"
              >
                {isGenerating ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
