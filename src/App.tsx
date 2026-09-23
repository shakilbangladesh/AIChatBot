import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import type { Page } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BotCustomizer from './pages/BotCustomizer';
import Leads from './pages/Leads';
import Integration from './pages/Integration';
import AuthPage from './pages/AuthPage';
import ProfileSettings from './pages/ProfileSettings';
import AdminDashboard from './pages/AdminDashboard';

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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, role, package_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);

        const { data: pkgData } = await supabase
          .from('packages')
          .select('id, name, price, bot_limit, lead_limit')
          .eq('id', profileData.package_id)
          .maybeSingle();
        if (pkgData) setPackageInfo(pkgData);

        return profileData;
      }

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      if (currentSession) {
        setProfileLoading(true);
        await fetchProfile(currentSession.user.id);
        if (mounted) setProfileLoading(false);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        setProfileLoading(true);
        fetchProfile(newSession.user.id).then(() => {
          if (mounted) setProfileLoading(false);
        });
      } else {
        setProfile(null);
        setPackageInfo(null);
        setActivePage('dashboard');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuth={() => {}} />;
  }

  if (profileLoading && !profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'super_admin';

  const handleNavigate = (page: Page) => {
    if (page === 'admin' && !isAdmin) {
      setActivePage('dashboard');
      return;
    }
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'customizer':
        return <BotCustomizer userId={session.user.id} initialTab="settings" />;
      case 'knowledge':
        return <BotCustomizer userId={session.user.id} initialTab="knowledge" />;
      case 'leads':
        return <Leads leadLimit={packageInfo?.lead_limit ?? null} />;
      case 'integration':
        return <Integration userId={session.user.id} />;
      case 'profile':
        return profile ? (
          <ProfileSettings
            profile={profile}
            packageInfo={packageInfo}
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
            onSignOut={() => supabase.auth.signOut()}
          />
        ) : null;
      case 'admin':
        return isAdmin ? <AdminDashboard /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onSignOut={() => supabase.auth.signOut()}
        isAdmin={isAdmin}
      />
      <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-6xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
