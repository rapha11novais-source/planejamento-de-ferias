import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoaderCircle } from 'lucide-react';
import RSVP from './rsvp';
import Admin from './panel';
import AdminAccess from './admin-access';
import { ADMIN_EMAIL, configured, supabase } from './api';
import './globals.css';

const authReturn = location.hash.includes('access_token=') || new URLSearchParams(location.search).has('code');
const recoveryReturn = ['recovery','signup','magiclink','email'].includes(new URLSearchParams(location.hash.slice(1)).get('type') || '');

function App() {
  const [admin, setAdmin] = useState(location.hash === '#admin' || authReturn);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(admin);
  const [recovery, setRecovery] = useState(recoveryReturn);

  useEffect(() => {
    const changed = () => setAdmin(location.hash === '#admin' || location.hash.includes('access_token='));
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const update = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!alive) return;
      setEmail(user?.email?.toLowerCase() === ADMIN_EMAIL ? user.email : null);
      setLoading(false);
    };
    void update();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
        setAdmin(true);
        window.history.replaceState(null, '', `${location.pathname}#admin`);
      }
      if (event === 'SIGNED_OUT') setRecovery(false);
      // Defer Auth API calls until the auth event callback has released its lock.
      setTimeout(() => void update(), 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  if (!configured) return <main className="denied"><h1>Configuração em andamento</h1><p>O formulário será liberado assim que a organização concluir a conexão com o banco de dados.</p></main>;
  if (!admin) return <RSVP />;
  if (loading) return <div className="loading" role="status"><LoaderCircle className="spin" />Verificando acesso…</div>;
  if (email && !recovery) return <Admin email={email} />;
  return <AdminAccess
    verifiedEmail={email}
    recovering={recovery}
    onSignedIn={setEmail}
    onRecoveryVerified={owner => { setEmail(owner); setRecovery(true); }}
    onPasswordSaved={() => setRecovery(false)}
  />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

