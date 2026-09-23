import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Bot,
  Target,
  Loader2,
  Ban,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Eye,
  X,
  MessageCircle,
  Sparkles,
  Calendar,
  FileText,
  TrendingUp,
  Package,
  Mail,
  Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  package_id: number;
  packages: { name: string; price: string } | null;
  banned: boolean;
  created_at: string;
}

interface GlobalStats {
  totalUsers: number;
  totalBots: number;
  totalLeads: number;
  mrr: number;
  paidTenants: number;
}

interface TenantDetails {
  profile: {
    id: string;
    full_name: string | null;
    role: string;
    created_at: string;
    packages: { name: string; price: string; bot_limit: number; lead_limit: number } | null;
  } | null;
  bot_settings: {
    bot_name: string | null;
    welcome_message: string | null;
    theme_color: string | null;
    created_at: string;
  } | null;
  knowledge_base: {
    preview: string;
    char_count: number;
    word_count: number;
    updated_at: string | null;
  };
  stats: {
    leads_count: number;
    new_leads_today: number;
    has_bot: boolean;
    has_knowledge: boolean;
  };
  recent_leads: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    service_requested: string | null;
    status: string | null;
    created_at: string;
  }>;
}

const packages = [
  { id: 1, name: 'Free' },
  { id: 2, name: 'Starter' },
  { id: 3, name: 'Pro' },
];

const packageStyles: Record<number, string> = {
  1: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
  2: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  3: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; userName: string } | null>(null);
  const [inspectUser, setInspectUser] = useState<AdminUser | null>(null);
  const [inspectData, setInspectData] = useState<TenantDetails | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectMode, setInspectMode] = useState<'stats' | 'inspect'>('stats');

  const callAdmin = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Request failed (${response.status})`);
    }
    return response.json();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        callAdmin({ action: 'get_global_stats' }),
        callAdmin({ action: 'get_all_users' }),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [callAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (action: string, userId: string, extra?: Record<string, unknown>) => {
    setActionLoading(userId);
    setError('');
    try {
      await callAdmin({ action, userId, ...extra });
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const openTenantModal = async (user: AdminUser, mode: 'stats' | 'inspect') => {
    setInspectUser(user);
    setInspectMode(mode);
    setInspectData(null);
    setInspectLoading(true);
    try {
      const data = await callAdmin({ action: 'get_tenant_details', userId: user.id });
      setInspectData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspect = () => {
    setInspectUser(null);
    setInspectData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-accent-500/10 border border-rose-500/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-rose-300" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">SuperAdmin Console</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform-wide analytics and tenant control</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Global Analytics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsCard
            label="Registered Tenants"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="w-5 h-5" />}
            tint="from-accent-400/20 to-sky-500/5"
            iconColor="text-sky-300"
          />
          <AnalyticsCard
            label="Active Bots"
            value={stats.totalBots.toLocaleString()}
            icon={<Bot className="w-5 h-5" />}
            tint="from-emerald-400/20 to-emerald-500/5"
            iconColor="text-emerald-300"
          />
          <AnalyticsCard
            label="Total Leads Generated"
            value={stats.totalLeads.toLocaleString()}
            icon={<Target className="w-5 h-5" />}
            tint="from-amber-400/20 to-orange-500/5"
            iconColor="text-amber-300"
          />
          <AnalyticsCard
            label="Monthly Recurring Revenue"
            value={`$${stats.mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={`${stats.paidTenants} paid ${stats.paidTenants === 1 ? 'tenant' : 'tenants'}`}
            icon={<DollarSign className="w-5 h-5" />}
            tint="from-rose-400/20 to-rose-500/5"
            iconColor="text-rose-300"
          />
        </div>
      )}

      {/* Tenant Management Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Tenant Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {users.length} registered {users.length === 1 ? 'tenant' : 'tenants'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-dark-800/40">
                <Th>Tenant</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th className="hidden md:table-cell">Role</Th>
                <Th>Package</Th>
                <Th className="hidden lg:table-cell">Status</Th>
                <Th className="hidden lg:table-cell">Joined</Th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400/25 to-emerald-400/20 flex items-center justify-center text-xs font-semibold text-accent-300 shrink-0">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate max-w-[160px]">
                          {user.full_name || 'Unnamed'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[160px] md:hidden">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 hidden md:table-cell truncate max-w-[220px]">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize ${
                        user.role === 'super_admin'
                          ? 'bg-rose-400/10 text-rose-300 border-rose-400/20'
                          : 'bg-slate-400/10 text-slate-400 border-slate-400/20'
                      }`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.package_id}
                      onChange={(e) =>
                        handleAction('update_package', user.id, { packageId: Number(e.target.value) })
                      }
                      disabled={actionLoading === user.id}
                      className={`appearance-none pl-3 pr-7 py-1 rounded-full text-[11px] font-medium border capitalize cursor-pointer focus:outline-none transition-all disabled:opacity-50 ${
                        packageStyles[user.package_id] || packageStyles[1]
                      }`}
                    >
                      {packages.map((pkg) => (
                        <option
                          key={pkg.id}
                          value={pkg.id}
                          className="bg-dark-800 text-white capitalize"
                        >
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {user.banned ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-400/10 text-rose-300 border border-rose-400/20">
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 hidden lg:table-cell whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <button
                            onClick={() => openTenantModal(user, 'stats')}
                            title="View tenant stats"
                            className="p-1.5 rounded-md text-slate-400 hover:text-accent-300 hover:bg-accent-400/10 transition-all"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openTenantModal(user, 'inspect')}
                            title="Inspect bot setup"
                            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-emerald-400/10 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {user.banned ? (
                            <button
                              onClick={() => handleAction('unban_user', user.id)}
                              title="Unban tenant"
                              className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  type: 'ban_user',
                                  userId: user.id,
                                  userName: user.full_name || user.email,
                                })
                              }
                              title="Ban tenant"
                              className="p-1.5 rounded-md text-amber-400 hover:bg-amber-400/10 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction('reset_limits', user.id)}
                            title="Reset to Free plan"
                            className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'delete_user',
                                userId: user.id,
                                userName: user.full_name || user.email,
                              })
                            }
                            title="Delete tenant"
                            className="p-1.5 rounded-md text-rose-400 hover:bg-rose-400/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-500">No tenants found</p>
          </div>
        )}
      </div>

      {inspectUser && (
        <TenantModal
          user={inspectUser}
          data={inspectData}
          loading={inspectLoading}
          mode={inspectMode}
          onClose={closeInspect}
          onSwitchMode={setInspectMode}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Confirm Action</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to{' '}
              <span className="text-rose-400 font-medium">
                {confirmAction.type === 'ban_user' ? 'ban' : 'permanently delete'}
              </span>{' '}
              <span className="text-white font-medium">{confirmAction.userName}</span>?
              {confirmAction.type === 'delete_user' && (
                <span className="block mt-2 text-xs text-slate-500">
                  This action cannot be undone. All tenant data will be removed.
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction.type, confirmAction.userId)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
              >
                {confirmAction.type === 'ban_user' ? 'Ban Tenant' : 'Delete Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function AnalyticsCard({
  label,
  value,
  sub,
  icon,
  tint,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tint: string;
  iconColor: string;
}) {
  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group transition-all hover:translate-y-[-2px]">
      <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-9 h-9 rounded-lg bg-dark-800/70 border border-white/10 flex items-center justify-center ${iconColor}`}
          >
            {icon}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            {label}
          </span>
        </div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        {sub && <p className="text-[11px] text-slate-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function TenantModal({
  user,
  data,
  loading,
  mode,
  onClose,
  onSwitchMode,
}: {
  user: AdminUser;
  data: TenantDetails | null;
  loading: boolean;
  mode: 'stats' | 'inspect';
  onClose: () => void;
  onSwitchMode: (m: 'stats' | 'inspect') => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const accent = data?.bot_settings?.theme_color || '#0ea5e9';
  const pkg = data?.profile?.packages;
  const usagePercent =
    pkg && pkg.lead_limit > 0
      ? Math.min(100, ((data?.stats.leads_count || 0) / pkg.lead_limit) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl glass-card rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-500 via-emerald-400 to-rose-400" />

        <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400/30 to-emerald-400/20 flex items-center justify-center text-sm font-semibold text-accent-300 shrink-0">
              {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{user.full_name || 'Unnamed Tenant'}</h3>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-white/5">
          <div className="inline-flex items-center gap-1 p-1 bg-dark-800/70 rounded-lg">
            <button
              onClick={() => onSwitchMode('stats')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'stats' ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Tenant Stats
            </button>
            <button
              onClick={() => onSwitchMode('inspect')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'inspect'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Inspect Bot
            </button>
          </div>
          <div className="pb-4" />
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-sm text-slate-400 text-center py-10">No data available</p>
          ) : mode === 'stats' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MiniStat
                  icon={<Target className="w-4 h-4" />}
                  label="Total Leads"
                  value={data.stats.leads_count.toLocaleString()}
                  color="text-amber-300"
                />
                <MiniStat
                  icon={<Sparkles className="w-4 h-4" />}
                  label="New Today"
                  value={data.stats.new_leads_today.toLocaleString()}
                  color="text-emerald-300"
                />
                <MiniStat
                  icon={<Package className="w-4 h-4" />}
                  label="Current Plan"
                  value={pkg?.name || 'Free'}
                  color="text-sky-300"
                />
              </div>

              {pkg && (
                <div className="rounded-xl border border-white/5 bg-dark-800/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300">Lead Quota Usage</span>
                    <span className="text-[11px] text-slate-400">
                      {data.stats.leads_count} / {pkg.lead_limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        usagePercent >= 90
                          ? 'from-rose-400 to-rose-500'
                          : usagePercent >= 70
                          ? 'from-amber-400 to-orange-500'
                          : 'from-accent-400 to-emerald-400'
                      } transition-all duration-500`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                    <span>Bot limit: {pkg.bot_limit}</span>
                    <span>Monthly: ${pkg.price}</span>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recent Leads
                </h4>
                {data.recent_leads.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center rounded-lg border border-dashed border-white/10">
                    This tenant hasn't captured any leads yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.recent_leads.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-lg border border-white/5 bg-dark-800/40 px-3 py-2.5 text-sm flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {l.name || 'Anonymous'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {l.service_requested || l.email || l.phone || 'No service specified'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                              (l.status || 'new') === 'converted'
                                ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                                : (l.status || 'new') === 'qualified'
                                ? 'bg-violet-400/10 text-violet-300 border-violet-400/30'
                                : (l.status || 'new') === 'contacted'
                                ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                                : 'bg-sky-400/10 text-sky-300 border-sky-400/30'
                            }`}
                          >
                            {l.status || 'new'}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(l.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                className="rounded-xl overflow-hidden border shadow-lg"
                style={{ borderColor: accent + '33' }}
              >
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {data.bot_settings?.bot_name || 'No bot configured'}
                    </p>
                    <p className="text-[11px] text-white/70">Live preview of tenant's widget</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4">
                  {data.bot_settings?.welcome_message ? (
                    <div className="flex items-end gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accent }}
                      >
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[80%] shadow-sm border border-slate-200">
                        <p className="text-[13px] text-slate-800 leading-relaxed">
                          {data.bot_settings.welcome_message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-3">
                      Tenant hasn't set up their bot yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoRow
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label="Email"
                  value={user.email}
                />
                <InfoRow
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Joined"
                  value={new Date(user.created_at).toLocaleDateString()}
                />
                <InfoRow
                  icon={<MessageCircle className="w-3.5 h-3.5" />}
                  label="Theme Color"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: accent }}
                      />
                      <span className="font-mono text-[11px]">{accent}</span>
                    </span>
                  }
                />
                <InfoRow
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Leads captured"
                  value={data.stats.leads_count.toLocaleString()}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Knowledge Base
                  </h4>
                  <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {data.knowledge_base.word_count.toLocaleString()} words ·{' '}
                    {data.knowledge_base.char_count.toLocaleString()} chars
                  </span>
                </div>
                {data.knowledge_base.char_count === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center rounded-lg border border-dashed border-white/10">
                    No knowledge base content yet.
                  </p>
                ) : (
                  <pre className="bg-dark-900 border border-white/10 rounded-lg p-4 text-[12px] leading-relaxed text-slate-300 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap break-words">
                    {data.knowledge_base.preview}
                    {data.knowledge_base.char_count > data.knowledge_base.preview.length && (
                      <span className="text-slate-500">
                        {'\n\n… truncated'}
                      </span>
                    )}
                  </pre>
                )}
              </div>

              {data.recent_leads.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Latest Capture
                  </h4>
                  <div className="rounded-lg border border-white/5 bg-dark-800/40 px-4 py-3 text-sm space-y-1">
                    <p className="text-white font-medium">
                      {data.recent_leads[0].name || 'Anonymous'}
                    </p>
                    {data.recent_leads[0].email && (
                      <p className="text-slate-400 text-xs inline-flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {data.recent_leads[0].email}
                      </p>
                    )}
                    {data.recent_leads[0].phone && (
                      <p className="text-slate-400 text-xs inline-flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {data.recent_leads[0].phone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-dark-800/40 p-4">
      <div className={`inline-flex items-center gap-1.5 ${color} mb-1.5`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-dark-800/40 px-3 py-2.5">
      <div className="inline-flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-sm text-white break-words">{value}</div>
    </div>
  );
}
