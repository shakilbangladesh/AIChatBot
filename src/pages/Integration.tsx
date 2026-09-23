import { useState } from 'react';
import { Copy, Check, Code2, Globe, Plug } from 'lucide-react';

interface IntegrationProps {
  userId: string;
}

export default function Integration({ userId }: IntegrationProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'embed' | 'wordpress'>('embed');

  const embedCode = `<!-- AgentFlow AI Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AgentFlow']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;
    fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','af','https://cdn.agentflow.ai/widget.js'));
  af('init', { clientId: '${userId}' });
</script>`;

  const wordpressInstructions = `1. Go to your WordPress Admin Dashboard
2. Navigate to Appearance > Theme Editor (or use a plugin like "Insert Headers and Footers")
3. Paste the embed code just before the closing </body> tag
4. Save your changes
5. The chat widget will now appear on all pages of your site

Alternatively, use the AgentFlow WordPress Plugin:
1. Go to Plugins > Add New
2. Search for "AgentFlow AI"
3. Install and Activate
4. Go to Settings > AgentFlow AI
5. Enter your Client ID: ${userId}
6. Click Save`;

  const copyToClipboard = (text: string, type: 'id' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integration</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect AgentFlow AI to your website with a simple code snippet.
        </p>
      </div>

      {/* Client ID */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Plug className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Your Client ID</h3>
            <p className="text-xs text-slate-500 mt-0.5">This is your unique identifier for all integrations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-accent-400 truncate">
            {userId}
          </div>
          <button
            onClick={() => copyToClipboard(userId, 'id')}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-accent-500/30 text-slate-300 hover:text-white text-sm transition-all flex-shrink-0"
          >
            {copiedId ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Embed Code */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-accent-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Installation</h3>
              <p className="text-xs text-slate-500 mt-0.5">Add the chat widget to your website</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 bg-dark-900 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'embed'
                ? 'bg-accent-500/10 text-accent-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Embed Code
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'wordpress'
                ? 'bg-accent-500/10 text-accent-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            WordPress
          </button>
        </div>

        {activeTab === 'embed' ? (
          <div>
            <div className="relative">
              <pre className="bg-dark-900 border border-white/10 rounded-xl p-5 text-sm text-slate-300 overflow-x-auto leading-relaxed font-mono">
                <code>{embedCode}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(embedCode, 'code')}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:border-accent-500/30 text-xs text-slate-400 hover:text-white transition-all"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Paste this code just before the closing <code className="text-accent-400/80">&lt;/body&gt;</code> tag on every page you want the chat widget to appear.
            </p>
          </div>
        ) : (
          <div className="bg-dark-900 border border-white/10 rounded-xl p-5">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
              {wordpressInstructions}
            </pre>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse-glow" />
        <div>
          <p className="text-sm font-medium text-white">Widget Status: Active</p>
          <p className="text-xs text-slate-500 mt-0.5">Your chat widget is live and responding to visitors</p>
        </div>
      </div>
    </div>
  );
}
