import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Users,
  Bot,
  Clock,
  ThumbsUp,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalLeads: number;
  botName: string | null;
  hasBotConfigured: boolean;
  knowledgeCharCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [leadsRes, botRes, kbRes] = await Promise.all([
      supabase.from('bot_leads').select('id', { count: 'exact', head: true }),
      supabase.from('bot_settings').select('bot_name').maybeSingle(),
      supabase.from('knowledge_base').select('content').maybeSingle(),
    ]);

    setStats({
      totalLeads: leadsRes.count || 0,
      botName: botRes.data?.bot_name || null,
      hasBotConfigured: !!botRes.data,
      knowledgeCharCount: botRes.data ? (kbRes.data?.content?.length || 0) : 0,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
      </div>
    );
  }

  const dashboardCards = [
    {
      label: 'Total Leads',
      value: (stats?.totalLeads || 0).toString(),
      description: 'Captured by your chatbot',
      icon: Users,
      color: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'Bot Status',
      value: stats?.hasBotConfigured ? 'Active' : 'Not Set',
      description: stats?.botName || 'Configure your bot',
      icon: Bot,
      color: 'from-accent-400 to-blue-500',
    },
    {
      label: 'Knowledge Base',
      value: stats?.knowledgeCharCount
        ? `${Math.round(stats.knowledgeCharCount / 1000)}k chars`
        : 'Empty',
      description: 'Business context loaded',
      icon: MessageSquare,
      color: 'from-amber-400 to-orange-500',
    },
    {
      label: 'Response Quality',
      value: stats?.knowledgeCharCount && stats.knowledgeCharCount > 500 ? 'High' : 'Low',
      description: stats?.knowledgeCharCount && stats.knowledgeCharCount > 500
        ? 'Good knowledge base coverage'
        : 'Add more to your knowledge base',
      icon: ThumbsUp,
      color: 'from-rose-400 to-pink-500',
    },
    {
      label: 'Avg Response Time',
      value: '< 2s',
      description: 'AI-powered responses',
      icon: Clock,
      color: 'from-cyan-400 to-sky-500',
    },
    {
      label: 'Conversion Rate',
      value: stats?.totalLeads && stats.totalLeads > 0 ? 'Tracking' : '--',
      description: 'Leads from conversations',
      icon: TrendingUp,
      color: 'from-violet-400 to-fuchsia-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back. Here's your chatbot performance overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dashboardCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px] group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-slate-500">{stat.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border transition-all ${stats?.hasBotConfigured ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${stats?.hasBotConfigured ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                {stats?.hasBotConfigured ? '\u2713' : '1'}
              </div>
              <span className="text-sm font-medium text-white">Configure Bot</span>
            </div>
            <p className="text-xs text-slate-500">Set your bot name, welcome message, and theme color</p>
          </div>
          <div className={`p-4 rounded-lg border transition-all ${stats?.knowledgeCharCount && stats.knowledgeCharCount > 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${stats?.knowledgeCharCount && stats.knowledgeCharCount > 0 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                {stats?.knowledgeCharCount && stats.knowledgeCharCount > 0 ? '\u2713' : '2'}
              </div>
              <span className="text-sm font-medium text-white">Add Knowledge</span>
            </div>
            <p className="text-xs text-slate-500">Upload your business info for AI-powered responses</p>
          </div>
          <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">3</div>
              <span className="text-sm font-medium text-white">Embed Widget</span>
            </div>
            <p className="text-xs text-slate-500">Copy the embed code and add it to your website</p>
          </div>
        </div>
      </div>
    </div>
  );
}
