import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Package,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Bot,
  Users,
  LogOut,
  Mail,
  Calendar,
  Activity,
  AlertTriangle,
  Trash2,
  BookOpen,
  Target,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  package_id: number;
}

interface PackageInfo {
  id: number;
  name: string;
  price: string;
  bot_limit: number;
  lead_limit: number;
}

interface ProfileSettingsProps {
  profile: Profile;
  packageInfo: PackageInfo | null;
  onProfileUpdate: (profile: Profile) => void;
  onSignOut: () => void;
}

interface UsageStats {
  leadsUsed: number;
  botsConfigured: number;
  knowledgeBaseSize: number;
}

export default function ProfileSettings({ profile, packageInfo, onProfileUpdate, onSignOut }: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [usage, setUsage] = useState<UsageStats>({ leadsUsed: 0, botsConfigured: 0, knowledgeBaseSize: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadAccountInfo();
    loadUsageStats();
  }, []);

  const loadAccountInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      setJoinDate(new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
    }
  };

  const loadUsageStats = async () => {
    const [leadsRes, botsRes, kbRes] = await Promise.all([
      supabase.from('bot_leads').select('id', { count: 'exact', head: true }),
      supabase.from('bot_settings').select('client_id', { count: 'exact', head: true }),
      supabase.from('knowledge_base').select('content').maybeSingle(),
    ]);

    setUsage({
      leadsUsed: leadsRes.count || 0,
      botsConfigured: botsRes.count || 0,
      knowledgeBaseSize: kbRes.data?.content?.length || 0,
    });
  };

  const handleSaveName = async () => {
    setSavingName(true);
    setError('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) {
      setError('Failed to update name');
    } else {
      setSavedName(true);
      onProfileUpdate({ ...profile, full_name: fullName });
      setTimeout(() => setSavedName(false), 3000);
    }
    setSavingName(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
    } else {
      setSavedPassword(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSavedPassword(false), 3000);
    }
    setSavingPassword(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const planFeatures: Record<string, { color: string; icon: typeof Zap; gradient: string }> = {
    Free: { color: 'from-slate-400 to-slate-500', icon: Package, gradient: 'from-slate-500/20 to-slate-600/10' },
    Starter: { color: 'from-accent-400 to-blue-500', icon: Zap, gradient: 'from-accent-500/20 to-blue-500/10' },
    Pro: { color: 'from-emerald-400 to-teal-500', icon: Shield, gradient: 'from-emerald-500/20 to-teal-500/10' },
  };

  const currentPlan = planFeatures[packageInfo?.name || 'Free'] || planFeatures.Free;
  const PlanIcon = currentPlan.icon;

  const leadPercentage = packageInfo ? Math.min((usage.leadsUsed / packageInfo.lead_limit) * 100, 100) : 0;
  const botPercentage = packageInfo ? Math.min((usage.botsConfigured / packageInfo.bot_limit) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Profile Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account, subscription, and preferences.</p>
        </div>
        <button
          onClick={handleSignOut}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Account Overview Card */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400/20 to-emerald-400/20 border border-accent-500/20 flex items-center justify-center text-xl font-bold text-accent-400">
            {(profile.full_name || email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{profile.full_name || 'Unnamed User'}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                {email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Joined {joinDate}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20 capitalize">
            <Shield className="w-3 h-3" />
            {profile.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Full Name */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-accent-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Personal Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-dark-800/50 border border-white/5 rounded-lg px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-600 mt-1.5">Email cannot be changed</p>
              </div>
              <button
                onClick={handleSaveName}
                disabled={savingName || fullName === profile.full_name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedName ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                {savedName ? 'Saved' : 'Update Name'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Security</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition-all"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedPassword ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {savedPassword ? 'Password Updated' : 'Change Password'}
              </button>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Usage & Limits</h3>
            </div>

            <div className="space-y-5">
              {/* Leads Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-300">Leads Captured</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {usage.leadsUsed} <span className="text-slate-500">/ {packageInfo?.lead_limit || 50}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      leadPercentage > 90 ? 'bg-rose-500' : leadPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${leadPercentage}%` }}
                  />
                </div>
              </div>

              {/* Bots Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-300">Bots Configured</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {usage.botsConfigured} <span className="text-slate-500">/ {packageInfo?.bot_limit || 1}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      botPercentage > 90 ? 'bg-rose-500' : botPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(botPercentage, 0)}%` }}
                  />
                </div>
              </div>

              {/* Knowledge Base */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-300">Knowledge Base</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {usage.knowledgeBaseSize > 0
                      ? `${(usage.knowledgeBaseSize / 1000).toFixed(1)}k characters`
                      : 'Empty'}
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all duration-500"
                    style={{ width: `${Math.min((usage.knowledgeBaseSize / 10000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-xl p-6 border border-rose-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold text-rose-400">Danger Zone</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 border-t border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Sign out of your account</p>
                <p className="text-xs text-slate-500 mt-0.5">You will need to sign in again to access your dashboard</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 border-t border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Delete account</p>
                <p className="text-xs text-slate-500 mt-0.5">Permanently remove your account and all associated data</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-sm font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          </div>

          {/* Mobile sign out button */}
          <button
            onClick={handleSignOut}
            className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Right column - Package Card */}
        <div className="space-y-6">
          <div className={`glass-card rounded-xl p-6 gradient-border bg-gradient-to-br ${currentPlan.gradient}`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPlan.color} flex items-center justify-center mb-4`}>
              <PlanIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{packageInfo?.name || 'Free'} Plan</h3>
            <p className="text-2xl font-bold text-white mt-1">
              ${packageInfo?.price || '0'}
              <span className="text-sm font-normal text-slate-400">/month</span>
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Bot className="w-4 h-4" />
                  Bot Limit
                </div>
                <span className="text-sm font-semibold text-white">{packageInfo?.bot_limit || 1}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Users className="w-4 h-4" />
                  Lead Limit
                </div>
                <span className="text-sm font-semibold text-white">{packageInfo?.lead_limit?.toLocaleString() || '50'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield className="w-4 h-4" />
                  Role
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20 capitalize">
                  {profile.role}
                </span>
              </div>
            </div>

            {packageInfo?.name === 'Free' && (
              <div className="mt-6 p-3 rounded-lg bg-accent-500/5 border border-accent-500/10">
                <p className="text-xs text-accent-400 font-medium">Upgrade Available</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Get more bots and leads with Starter or Pro plans</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Account Summary</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Member since</span>
                <span className="text-sm text-white font-medium">{joinDate || '...'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total leads</span>
                <span className="text-sm text-white font-medium">{usage.leadsUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Bots active</span>
                <span className="text-sm text-white font-medium">{usage.botsConfigured}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-sm mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Delete Account</h3>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              This action is <span className="text-rose-400 font-medium">permanent and irreversible</span>.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              All your data including bots, leads, and knowledge base will be permanently deleted. Please contact support if you need assistance.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
