import { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Users,
  Plug,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X,
  LogOut,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';

export type Page = 'dashboard' | 'customizer' | 'knowledge' | 'leads' | 'integration' | 'profile' | 'admin';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  isAdmin: boolean;
}

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customizer', label: 'Bot Customizer', icon: Bot },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'integration', label: 'Integration', icon: Plug },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ activePage, onNavigate, onSignOut, isAdmin }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const allNavItems = isAdmin
    ? [...navItems, { id: 'admin' as Page, label: 'Admin Panel', icon: ShieldCheck }]
    : navItems;

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 glass border-b border-white/5 z-50 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-400 to-emerald-400 flex items-center justify-center">
            <Zap className="w-3 h-3 text-dark-900" />
          </div>
          <span className="text-sm font-semibold">
            AgentFlow <span className="text-accent-400">AI</span>
          </span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-out glass border-r border-white/5
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-emerald-400 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-dark-900" />
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="text-base font-semibold tracking-tight whitespace-nowrap">
                AgentFlow <span className="text-accent-400">AI</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isAdminItem = item.id === 'admin';
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? isAdminItem
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? isAdminItem ? 'text-rose-400' : 'text-accent-400'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {(!collapsed || mobileOpen) && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block px-3 pb-4 space-y-1">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
