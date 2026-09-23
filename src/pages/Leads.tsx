import {
  Search,
  Download,
  Loader2,
  Inbox,
  Users,
  TrendingUp,
  Sparkles,
  Gauge,
  MessageCircle,
  Eye,
  Trash2,
  X,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  StickyNote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service_requested: string | null;
  created_at: string;
  status: string | null;
  notes: string | null;
}

interface LeadsProps {
  leadLimit: number | null;
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'qualified' | 'converted';

const STATUS_OPTIONS: Exclude<StatusFilter, 'all'>[] = ['new', 'contacted', 'qualified', 'converted'];

const statusStyles: Record<string, string> = {
  new: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  contacted: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  qualified: 'bg-violet-400/10 text-violet-300 border-violet-400/30',
  converted: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
};

const cleanPhone = (raw: string | null): string => (raw || '').replace(/[^\d]/g, '');

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toCSV = (rows: Lead[]): string => {
  const headers = ['Date Captured', 'Name', 'Email', 'Phone', 'Service Requested', 'Status', 'Notes'];
  const escape = (v: string | null) => {
    const s = (v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map((r) =>
    [
      escape(r.created_at),
      escape(r.name),
      escape(r.email),
      escape(r.phone),
      escape(r.service_requested),
      escape(r.status),
      escape(r.notes),
    ].join(',')
  );
  return [headers.join(','), ...lines].join('\n');
};

interface ToastMsg {
  id: number;
  kind: 'success' | 'info' | 'error';
  text: string;
}

export default function Leads({ leadLimit }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((kind: ToastMsg['kind'], text: string) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('bot_leads')
        .select('id, name, email, phone, service_requested, created_at, status, notes')
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (err) setError('Failed to load leads');
      else setLeads(data || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('bot_leads_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bot_leads' },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
          });
          pushToast('success', `New lead: ${newLead.name || 'Anonymous'}`);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bot_leads' },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bot_leads' },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pushToast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const status = (lead.status || 'new').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!term) return true;
      return (
        (lead.name || '').toLowerCase().includes(term) ||
        (lead.email || '').toLowerCase().includes(term) ||
        (lead.phone || '').toLowerCase().includes(term) ||
        (lead.service_requested || '').toLowerCase().includes(term)
      );
    });
  }, [leads, search, statusFilter]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = leads.filter((l) => new Date(l.created_at) >= today).length;
    const converted = leads.filter((l) => (l.status || '').toLowerCase() === 'converted').length;
    const conversion = total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;
    return { total, newToday, conversion, converted };
  }, [leads]);

  const usagePercent = leadLimit && leadLimit > 0 ? Math.min(100, (metrics.total / leadLimit) * 100) : 0;
  const usageColor =
    usagePercent >= 90
      ? 'from-rose-400 to-rose-500'
      : usagePercent >= 70
      ? 'from-amber-400 to-orange-500'
      : 'from-emerald-400 to-emerald-500';

  const handleStatusChange = async (lead: Lead, next: string) => {
    const prev = lead.status;
    setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, status: next } : l)));
    const { error: err } = await supabase.from('bot_leads').update({ status: next }).eq('id', lead.id);
    if (err) {
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, status: prev } : l)));
      pushToast('error', 'Could not update status');
    }
  };

  const handleDelete = async (lead: Lead) => {
    const snapshot = leads;
    setLeads((cur) => cur.filter((l) => l.id !== lead.id));
    setConfirmDelete(null);
    const { error: err } = await supabase.from('bot_leads').delete().eq('id', lead.id);
    if (err) {
      setLeads(snapshot);
      pushToast('error', 'Could not delete lead');
    } else {
      pushToast('info', 'Lead deleted');
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      pushToast('info', 'Nothing to export');
      return;
    }
    const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast('success', `Exported ${filtered.length} leads`);
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Lead Management</h1>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            Track, qualify, and convert every visitor captured by your chatbots.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-emerald-500 text-white text-sm font-medium shadow-lg shadow-accent-500/20 hover:shadow-accent-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Leads"
          value={metrics.total.toLocaleString()}
          accent="from-sky-400/20 to-sky-500/5"
          iconColor="text-sky-300"
        />
        <MetricCard
          icon={<Sparkles className="w-5 h-5" />}
          label="New Today"
          value={metrics.newToday.toLocaleString()}
          accent="from-emerald-400/20 to-emerald-500/5"
          iconColor="text-emerald-300"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Conversion Rate"
          value={`${metrics.conversion}%`}
          sub={`${metrics.converted} converted`}
          accent="from-amber-400/20 to-amber-500/5"
          iconColor="text-amber-300"
        />
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-400/10 to-emerald-500/5 opacity-60" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-dark-800/70 border border-white/10 flex items-center justify-center text-accent-300">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Usage
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-white">{metrics.total}</span>
              <span className="text-sm text-slate-400">/ {leadLimit ?? '∞'}</span>
            </div>
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${usageColor} transition-all duration-700 ease-out`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {leadLimit ? `${Math.round(usagePercent)}% of monthly quota` : 'Unlimited plan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone or service..."
              className="w-full bg-dark-800 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all capitalize"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-dark-800/40">
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th className="hidden md:table-cell">Phone</Th>
                  <Th className="hidden lg:table-cell">Email</Th>
                  <Th className="hidden lg:table-cell">Service</Th>
                  <Th>Status</Th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((lead) => {
                  const status = (lead.status || 'new').toLowerCase();
                  const phoneDigits = cleanPhone(lead.phone);
                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400/30 to-emerald-400/20 flex items-center justify-center text-xs font-semibold text-accent-300 shrink-0">
                            {(lead.name || '?')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {lead.name || 'Anonymous'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 hidden md:table-cell whitespace-nowrap">
                        {phoneDigits ? (
                          <a
                            href={`https://wa.me/${phoneDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 hidden lg:table-cell">
                        {lead.email || <span className="text-slate-600">--</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 hidden lg:table-cell">
                        {lead.service_requested || <span className="text-slate-600">--</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(lead, e.target.value)}
                            className={`appearance-none pl-3 pr-7 py-1 rounded-full text-[11px] font-medium border capitalize cursor-pointer focus:outline-none transition-all ${statusStyles[status] || statusStyles.new}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-dark-800 text-white capitalize">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewLead(lead)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-accent-300 hover:bg-white/5 transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(lead)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-20 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-dark-800 border border-white/5 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-300 font-medium">
              {leads.length === 0 ? 'No leads captured yet' : 'No leads match your filters'}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              {leads.length === 0
                ? 'Leads will appear here in real time as visitors chat with your bot.'
                : 'Try adjusting your search or clearing the status filter.'}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <span className="text-slate-300 font-medium">{filtered.length}</span> of{' '}
              <span className="text-slate-300 font-medium">{leads.length}</span> leads
            </span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              Live
            </span>
          </div>
        )}
      </div>

      {viewLead && <LeadDetailsModal lead={viewLead} onClose={() => setViewLead(null)} />}
      {confirmDelete && (
        <ConfirmDeleteModal
          lead={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[240px] max-w-sm px-4 py-3 rounded-lg border backdrop-blur-lg shadow-2xl flex items-center gap-2.5 text-sm animate-[float_0.3s_ease-out] ${
              t.kind === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
                : t.kind === 'error'
                ? 'bg-rose-500/15 border-rose-400/30 text-rose-100'
                : 'bg-sky-500/15 border-sky-400/30 text-sky-100'
            }`}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : t.kind === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
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

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function LeadDetailsModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const phoneDigits = cleanPhone(lead.phone);
  const status = (lead.status || 'new').toLowerCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[float_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg glass-card rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-500 via-emerald-400 to-accent-500" />
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400/30 to-emerald-400/20 flex items-center justify-center text-sm font-semibold text-accent-300">
              {(lead.name || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-white font-semibold">{lead.name || 'Anonymous Lead'}</h3>
              <span
                className={`inline-flex mt-0.5 items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${statusStyles[status] || statusStyles.new}`}
              >
                {status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Captured" value={formatDate(lead.created_at)} />
          <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email || '--'} />
          <DetailRow
            icon={<Phone className="w-4 h-4" />}
            label="Phone"
            value={
              phoneDigits ? (
                <a
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {lead.phone}
                </a>
              ) : (
                '--'
              )
            }
          />
          <DetailRow
            icon={<Briefcase className="w-4 h-4" />}
            label="Service Requested"
            value={lead.service_requested || '--'}
          />
          {lead.notes && (
            <DetailRow icon={<StickyNote className="w-4 h-4" />} label="Notes" value={lead.notes} />
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            Close
          </button>
          {phoneDigits && (
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-dark-800/70 border border-white/5 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
        <div className="text-sm text-slate-200 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: Lead;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm glass-card rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-rose-400" />
        </div>
        <h3 className="text-white font-semibold text-lg">Delete this lead?</h3>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
          <span className="text-slate-200 font-medium">{lead.name || 'Anonymous'}</span> will be
          removed from your list. This action can't be undone.
        </p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
