import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  X,
  Bot,
  Palette,
  Type,
  MessageCircle,
  Save,
  CheckCircle2,
  Loader2,
  BookOpen,
  FileText,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Code2,
  Lock,
  Minus,
  Globe,
  MoveHorizontal,
  Zap,
  MousePointer2,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type WidgetPosition = 'bottom-right' | 'bottom-left';

interface BotConfig {
  bot_name: string;
  welcome_message: string;
  theme_color: string;
  position: WidgetPosition;
  bottom_offset: number;
  enable_pulse: boolean;
  open_on_hover: boolean;
}

const DEFAULT_CONFIG: BotConfig = {
  bot_name: 'AgentFlow Assistant',
  welcome_message: 'Hi there! How can I help you today?',
  theme_color: '#0ea5e9',
  position: 'bottom-right',
  bottom_offset: 20,
  enable_pulse: true,
  open_on_hover: false,
};

const OFFSET_MIN = 10;
const OFFSET_MAX = 150;

interface StudioProps {
  userId: string;
  initialTab?: StudioTab;
}

type StudioTab = 'settings' | 'knowledge';

const colorPresets = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#0284c7',
  '#059669',
  '#e11d48',
  '#0891b2',
];

const AUTOSAVE_DELAY = 1500;
const KB_MAX = 50000;

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full || '0ea5e9', 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function BotCustomizer({ userId, initialTab = 'settings' }: StudioProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [knowledge, setKnowledge] = useState('');
  const [initialKnowledge, setInitialKnowledge] = useState('');
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const kbInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [settingsRes, kbRes] = await Promise.all([
        supabase
          .from('bot_settings')
          .select(
            'bot_name, welcome_message, theme_color, position, bottom_offset, enable_pulse, open_on_hover'
          )
          .eq('client_id', userId)
          .maybeSingle(),
        supabase
          .from('knowledge_base')
          .select('content')
          .eq('client_id', userId)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      if (settingsRes.data) {
        const d = settingsRes.data as Partial<BotConfig>;
        setConfig({
          bot_name: d.bot_name || DEFAULT_CONFIG.bot_name,
          welcome_message: d.welcome_message || DEFAULT_CONFIG.welcome_message,
          theme_color: d.theme_color || DEFAULT_CONFIG.theme_color,
          position: (d.position as WidgetPosition) || DEFAULT_CONFIG.position,
          bottom_offset:
            typeof d.bottom_offset === 'number' ? d.bottom_offset : DEFAULT_CONFIG.bottom_offset,
          enable_pulse:
            typeof d.enable_pulse === 'boolean' ? d.enable_pulse : DEFAULT_CONFIG.enable_pulse,
          open_on_hover:
            typeof d.open_on_hover === 'boolean' ? d.open_on_hover : DEFAULT_CONFIG.open_on_hover,
        });
      }
      const kbContent = kbRes.data?.content || '';
      setKnowledge(kbContent);
      setInitialKnowledge(kbContent);
      kbInitialized.current = true;
      setLoadingData(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const persistKnowledge = useCallback(
    async (content: string) => {
      setAutosaveState('saving');
      const { error: err } = await supabase.from('knowledge_base').upsert(
        {
          client_id: userId,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      );
      if (err) {
        setAutosaveState('error');
      } else {
        setInitialKnowledge(content);
        setAutosaveState('saved');
        window.setTimeout(() => setAutosaveState('idle'), 2200);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!kbInitialized.current) return;
    if (knowledge === initialKnowledge) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      persistKnowledge(knowledge);
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [knowledge, initialKnowledge, persistKnowledge]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const [settingsRes, kbRes] = await Promise.all([
      supabase.from('bot_settings').upsert(
        {
          client_id: userId,
          bot_name: config.bot_name,
          welcome_message: config.welcome_message,
          theme_color: config.theme_color,
          position: config.position,
          bottom_offset: config.bottom_offset,
          enable_pulse: config.enable_pulse,
          open_on_hover: config.open_on_hover,
        },
        { onConflict: 'client_id' }
      ),
      supabase.from('knowledge_base').upsert(
        {
          client_id: userId,
          content: knowledge,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      ),
    ]);
    if (settingsRes.error || kbRes.error) {
      setError('Failed to save changes. Please try again.');
    } else {
      setInitialKnowledge(knowledge);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    }
    setSaving(false);
  };

  const embedCode = `<script src="https://yourdomain.com/widget.js" data-client-id="${userId}" data-position="${config.position}" data-offset="${config.bottom_offset}" data-pulse="${config.enable_pulse}" data-hover="${config.open_on_hover}"></script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = knowledge.trim() ? knowledge.trim().split(/\s+/).length : 0;
  const charCount = knowledge.length;
  const kbPercent = Math.min(100, (charCount / KB_MAX) * 100);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Studio</h1>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            Craft your bot's identity, knowledge, and appearance — with live preview.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-emerald-500 text-white text-sm font-medium shadow-lg shadow-accent-500/20 hover:shadow-accent-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 transition-all"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1 p-1.5 border-b border-white/5 bg-dark-800/40">
              <TabButton
                active={tab === 'settings'}
                onClick={() => setTab('settings')}
                icon={<Type className="w-3.5 h-3.5" />}
                label="Bot Settings"
              />
              <TabButton
                active={tab === 'knowledge'}
                onClick={() => setTab('knowledge')}
                icon={<BookOpen className="w-3.5 h-3.5" />}
                label="Knowledge Base"
              />
              {tab === 'knowledge' && (
                <div className="ml-auto pr-2">
                  <AutosaveIndicator state={autosaveState} />
                </div>
              )}
            </div>

            {tab === 'settings' ? (
              <SettingsPanel config={config} setConfig={setConfig} />
            ) : (
              <KnowledgePanel
                value={knowledge}
                onChange={setKnowledge}
                wordCount={wordCount}
                charCount={charCount}
                percent={kbPercent}
              />
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Code2 className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">Install on your website</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Paste before <code className="text-accent-300">&lt;/body&gt;</code> on Hostinger,
                    WordPress or any HTML page.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:border-accent-500/40 text-xs text-slate-300 hover:text-white transition-all shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="bg-dark-900 border border-white/10 rounded-lg p-4 text-[12px] leading-relaxed font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
              <code>{embedCode}</code>
            </pre>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Widget auto-connects using your client ID and syncs with your saved settings.
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Live Preview
            </span>
          </div>

          <BrowserMockup
            config={config}
            previewOpen={previewOpen}
            setPreviewOpen={setPreviewOpen}
          />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-accent-500/15 text-accent-300 shadow-inner shadow-accent-500/10'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AutosaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Auto-saved
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-400">
        <AlertCircle className="w-3 h-3" /> Save failed
      </span>
    );
  }
  return <span className="text-[11px] text-slate-500">Autosave ready</span>;
}

function SettingsPanel({
  config,
  setConfig,
}: {
  config: BotConfig;
  setConfig: (c: BotConfig) => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Bot Name
        </label>
        <div className="relative">
          <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={config.bot_name}
            onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
            maxLength={40}
            className="w-full bg-dark-800 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all"
            placeholder="e.g., Sunset Realty Assistant"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Appears in the widget header. {config.bot_name.length}/40
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Welcome Message
        </label>
        <textarea
          value={config.welcome_message}
          onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
          rows={3}
          maxLength={280}
          className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all resize-none leading-relaxed"
          placeholder="First message visitors see when they open the chat."
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          {config.welcome_message.length}/280 characters
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Primary Theme Color
          </span>
        </div>
        <div className="grid grid-cols-8 gap-2.5 mb-4">
          {colorPresets.map((color) => {
            const active = config.theme_color.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                onClick={() => setConfig({ ...config, theme_color: color })}
                className={`group relative aspect-square rounded-lg transition-all duration-200 ${
                  active ? 'ring-2 ring-white/70 scale-105' : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: color,
                  boxShadow: active ? `0 4px 20px ${hexToRgba(color, 0.5)}` : undefined,
                }}
                title={color}
              >
                {active && (
                  <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white drop-shadow" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={config.theme_color}
              onChange={(e) => setConfig({ ...config, theme_color: e.target.value })}
              className="w-11 h-11 rounded-lg cursor-pointer border-0 bg-transparent"
            />
          </div>
          <input
            type="text"
            value={config.theme_color}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                setConfig({ ...config, theme_color: v.startsWith('#') ? v : `#${v}` });
              }
            }}
            className="flex-1 bg-dark-800 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-accent-500/50 transition-all"
          />
        </div>
      </div>

      <div className="border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <MoveHorizontal className="w-3.5 h-3.5 text-accent-300" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Widget Layout & Behavior
          </span>
        </div>

        <div className="mb-5">
          <label className="block text-[11px] font-medium text-slate-400 mb-2">Alignment</label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-dark-800 border border-white/10 rounded-lg">
            <button
              type="button"
              onClick={() => setConfig({ ...config, position: 'bottom-left' })}
              className={`inline-flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                config.position === 'bottom-left'
                  ? 'bg-accent-500/20 text-accent-200 shadow-inner shadow-accent-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
              Bottom Left
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, position: 'bottom-right' })}
              className={`inline-flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                config.position === 'bottom-right'
                  ? 'bg-accent-500/20 text-accent-200 shadow-inner shadow-accent-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignHorizontalJustifyEnd className="w-3.5 h-3.5" />
              Bottom Right
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-slate-400">Bottom Offset</label>
            <span className="text-[11px] text-slate-500">Raise above other buttons</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={OFFSET_MIN}
              max={OFFSET_MAX}
              value={config.bottom_offset}
              onChange={(e) => setConfig({ ...config, bottom_offset: Number(e.target.value) })}
              className="flex-1 cursor-pointer"
              style={{ accentColor: config.theme_color }}
            />
            <div className="flex items-center gap-1 bg-dark-800 border border-white/10 rounded-md px-2 py-1.5 w-24">
              <input
                type="number"
                min={OFFSET_MIN}
                max={OFFSET_MAX}
                value={config.bottom_offset}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    setConfig({
                      ...config,
                      bottom_offset: Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, n)),
                    });
                  }
                }}
                className="w-full bg-transparent text-sm text-white text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-slate-500">px</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setConfig({ ...config, bottom_offset: 20 })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                config.bottom_offset === 20
                  ? 'bg-accent-500/15 border-accent-500/30 text-accent-200'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              Standard (20px)
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, bottom_offset: 80 })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                config.bottom_offset === 80
                  ? 'bg-accent-500/15 border-accent-500/30 text-accent-200'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              Above WhatsApp (80px)
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <ToggleRow
            icon={<Zap className="w-4 h-4" />}
            title="Attention Pulse Effect"
            subtitle="Draws visitor attention with a soft glowing pulse"
            checked={config.enable_pulse}
            onChange={(v) => setConfig({ ...config, enable_pulse: v })}
            accent={config.theme_color}
          />
          <ToggleRow
            icon={<MousePointer2 className="w-4 h-4" />}
            title="Auto-Open on Hover"
            subtitle="Expands the chat window when a visitor hovers over the launcher"
            checked={config.open_on_hover}
            onChange={(v) => setConfig({ ...config, open_on_hover: v })}
            accent={config.theme_color}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-white/5 bg-dark-800/40">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
            checked ? 'border-transparent text-white' : 'border-white/10 bg-dark-900 text-slate-400'
          }`}
          style={checked ? { backgroundColor: accent } : undefined}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? '' : 'bg-white/10'
        }`}
        style={checked ? { backgroundColor: accent } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function KnowledgePanel({
  value,
  onChange,
  wordCount,
  charCount,
  percent,
}: {
  value: string;
  onChange: (v: string) => void;
  wordCount: number;
  charCount: number;
  percent: number;
}) {
  const bar =
    percent >= 90
      ? 'from-rose-400 to-rose-500'
      : percent >= 70
      ? 'from-amber-400 to-orange-500'
      : 'from-accent-400 to-emerald-400';

  return (
    <div className="p-6 space-y-5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, KB_MAX))}
        className="w-full h-[380px] bg-dark-900 border border-white/10 rounded-xl px-5 py-4 text-sm text-slate-200 leading-relaxed placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all resize-none font-mono"
        placeholder={`Paste your business info here...\n\n## About Us\nWe're a boutique agency...\n\n## Services & Pricing\n- Consulting: $250/hr\n\n## Hours\nMon-Fri, 9am-6pm ET\n\n## FAQs\nQ: Do you offer refunds?\nA: Yes, within 14 days.`}
      />

      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {wordCount.toLocaleString()} words
            </span>
            <span>
              {charCount.toLocaleString()} / {KB_MAX.toLocaleString()} chars
            </span>
          </div>
          <span className="text-slate-500">{Math.round(percent)}% used</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${bar} transition-all duration-500 ease-out`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-accent-400/15 bg-accent-400/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-300" />
          <span className="text-xs font-semibold text-white">Tips for great AI answers</span>
        </div>
        <ul className="space-y-2 text-[12px] text-slate-300 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-accent-400 mt-0.5">•</span>
            Use short, clear headings like <span className="text-white">## Pricing</span> or{' '}
            <span className="text-white">## Hours</span> to help the AI find answers.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-400 mt-0.5">•</span>
            Include exact numbers — prices, phone, address, opening times — not vague ranges.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-400 mt-0.5">•</span>
            Add a <span className="text-white">FAQ</span> section with real customer questions and
            plain-language answers.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-400 mt-0.5">•</span>
            Refresh it whenever your services, prices or policies change.
          </li>
        </ul>
      </div>
    </div>
  );
}

function BrowserMockup({
  config,
  previewOpen,
  setPreviewOpen,
}: {
  config: BotConfig;
  previewOpen: boolean;
  setPreviewOpen: (v: boolean) => void;
}) {
  const accent = config.theme_color || '#0ea5e9';
  const isLeft = config.position === 'bottom-left';
  const offset = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, config.bottom_offset));

  const handleLauncherHover = () => {
    if (config.open_on_hover && !previewOpen) setPreviewOpen(true);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-slate-200/80 backdrop-blur px-4 py-2.5 flex items-center gap-3 border-b border-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 max-w-md mx-auto bg-white/80 rounded-md px-3 py-1 flex items-center gap-2 border border-slate-300">
          <Lock className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] text-slate-600 font-mono truncate">yourbusiness.com</span>
        </div>
        <div className="w-16" />
      </div>

      <div className="relative bg-white h-[560px] overflow-hidden">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-white" />
        <div className="relative px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md"
                style={{ backgroundColor: accent, opacity: 0.9 }}
              />
              <div className="h-2.5 w-24 rounded bg-slate-300" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-10 rounded bg-slate-300" />
              <div className="h-2 w-10 rounded bg-slate-300" />
              <div className="h-2 w-10 rounded bg-slate-300" />
              <div className="h-6 w-16 rounded-md" style={{ backgroundColor: accent }} />
            </div>
          </div>

          <div className="mt-10 max-w-md">
            <div className="h-3 w-20 rounded bg-slate-200 mb-4" />
            <div className="h-6 w-64 rounded bg-slate-300 mb-2.5" />
            <div className="h-6 w-56 rounded bg-slate-300 mb-5" />
            <div className="h-2.5 w-full rounded bg-slate-200 mb-1.5" />
            <div className="h-2.5 w-11/12 rounded bg-slate-200 mb-1.5" />
            <div className="h-2.5 w-4/5 rounded bg-slate-200 mb-6" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-28 rounded-md" style={{ backgroundColor: accent }} />
              <div className="h-8 w-24 rounded-md border border-slate-300" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div
                  className="w-6 h-6 rounded mb-2"
                  style={{ backgroundColor: hexToRgba(accent, 0.15) }}
                />
                <div className="h-2 w-16 rounded bg-slate-300 mb-1.5" />
                <div className="h-1.5 w-full rounded bg-slate-200 mb-1" />
                <div className="h-1.5 w-4/5 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Sample WhatsApp button anchored to the opposite corner */}
        <div
          className={`absolute z-0 w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg ${
            isLeft ? 'right-5' : 'left-5'
          }`}
          style={{ bottom: '20px' }}
          title="Existing WhatsApp button"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </div>

        {/* Widget launcher + chat window */}
        <div
          className={`absolute z-10 flex flex-col gap-3 transition-[bottom,left,right] duration-300 ease-out ${
            isLeft ? 'items-start' : 'items-end'
          }`}
          style={{
            bottom: `${offset}px`,
            left: isLeft ? '20px' : undefined,
            right: isLeft ? undefined : '20px',
          }}
        >
          {previewOpen && (
            <div
              className="w-[340px] rounded-2xl overflow-hidden shadow-2xl border bg-white transition-all duration-300"
              style={{
                boxShadow: `0 25px 50px -12px ${hexToRgba(accent, 0.35)}`,
                borderColor: hexToRgba(accent, 0.2),
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.85)})`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">
                      {config.bot_name || 'Assistant'}
                    </p>
                    <p className="text-[10px] text-white/80">Online now</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="w-6 h-6 rounded flex items-center justify-center text-white/80 hover:bg-white/10"
                    onClick={() => setPreviewOpen(false)}
                    title="Minimize"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="w-6 h-6 rounded flex items-center justify-center text-white/80 hover:bg-white/10"
                    onClick={() => setPreviewOpen(false)}
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 h-64 flex flex-col gap-3 bg-slate-50 overflow-hidden">
                <div className="flex items-end gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[80%] shadow-sm border border-slate-200">
                    <p className="text-[13px] text-slate-800 leading-relaxed">
                      {config.welcome_message || '...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-end gap-2 ml-auto flex-row-reverse">
                  <div
                    className="rounded-2xl rounded-br-md px-3.5 py-2.5 max-w-[75%] shadow-sm"
                    style={{ backgroundColor: accent, color: 'white' }}
                  >
                    <p className="text-[13px] leading-relaxed">Hi! Do you offer online demos?</p>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: accent, animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: accent, animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: accent, animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 border border-slate-200">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none"
                    readOnly
                  />
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: accent }}
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  Powered by AgentFlow AI
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            {config.enable_pulse && !previewOpen && (
              <>
                <span
                  className="absolute inset-0 rounded-full animate-widget-pulse pointer-events-none"
                  style={{ backgroundColor: accent }}
                />
                <span
                  className="absolute inset-0 rounded-full animate-widget-pulse pointer-events-none"
                  style={{ backgroundColor: accent, animationDelay: '0.9s' }}
                />
              </>
            )}
            <button
              onClick={() => setPreviewOpen(!previewOpen)}
              onMouseEnter={handleLauncherHover}
              className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
              style={{
                backgroundColor: accent,
                boxShadow: `0 10px 30px -8px ${hexToRgba(accent, 0.55)}`,
              }}
              title={previewOpen ? 'Close chat' : 'Open chat'}
            >
              {previewOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <MessageCircle className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
