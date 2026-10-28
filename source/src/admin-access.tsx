import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, LoaderCircle } from 'lucide-react';
import { ADMIN_EMAIL, SUPABASE_URL, supabase } from './api';

type Props = {
  verifiedEmail: string | null;
  recovering: boolean;
  onSignedIn: (email: string) => void;
  onRecoveryVerified: (email: string) => void;
  onPasswordSaved: () => void;
};

function friendlyError(error: unknown, fallback: string) {
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials') return 'Senha incorreta. Tente novamente ou escolha “Definir ou recuperar senha”.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Aguarde um pouco antes de tentar novamente.';
  if (code === 'otp_expired') return 'O código ou link expirou. Solicite um novo e-mail de recuperação.';
  if (code === 'same_password') return 'Escolha uma senha diferente da senha atual.';
  if (code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos 12 caracteres.';
  if (code === 'reauthentication_needed') return 'Confirme novamente seu e-mail para poder alterar a senha.';
  return fallback;
}

export default function AdminAccess({ verifiedEmail, recovering, onSignedIn, onRecoveryVerified, onPasswordSaved }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [verification, setVerification] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verifyMode, setVerifyMode] = useState(false);
  const settingPassword = recovering && verifiedEmail === ADMIN_EMAIL;

  async function signIn() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
      if (error) throw error;
      if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('Este painel é exclusivo do organizador autorizado.');
        return;
      }
      setPassword('');
      onSignedIn(data.user.email);
    } catch (error) {
      setError(friendlyError(error, 'Não foi possível entrar. Confira a senha e tente novamente.'));
    } finally { setBusy(false); }
  }

  async function requestRecovery() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: ADMIN_EMAIL, options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}${location.pathname}#admin` } });
      if (error) throw error;
      setPassword(''); setConfirmation(''); setVerifyMode(true);
      setMessage('Enviamos a confirmação para ' + ADMIN_EMAIL + '. Abra o link do e-mail ou copie o endereço do botão recebido e cole-o abaixo. Depois, você poderá definir sua senha.');
    } catch (error) {
      setError(friendlyError(error, 'Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes.'));
    } finally { setBusy(false); }
  }

  async function verifyRecovery() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const value = verification.trim();
      let result;
      if (/^\d{6,10}$/.test(value)) {
        result = await supabase.auth.verifyOtp({ email: ADMIN_EMAIL, token: value, type: 'email' });
      } else {
        let link: URL;
        try { link = new URL(value); } catch { setError('Cole o link de recuperação recebido no seu e-mail ou digite o código.'); return; }
        if (link.origin !== new URL(SUPABASE_URL).origin || !['recovery','email','signup','magiclink'].includes(link.searchParams.get('type') || '')) {
          setError('Use o link de confirmação recebido no seu e-mail.'); return;
        }
        const token = link.searchParams.get('token_hash') || link.searchParams.get('token');
        if (!token) { setError('Link de recuperação inválido. Solicite um novo e-mail.'); return; }
        result = await supabase.auth.verifyOtp({ token_hash: token, type: link.searchParams.get('type') as 'recovery' | 'email' | 'signup' | 'magiclink' });
      }
      if (result.error) throw result.error;
      if (result.data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('Este painel é exclusivo do organizador autorizado.'); return;
      }
      setVerification(''); setMessage('');
      onRecoveryVerified(result.data.user.email);
    } catch (error) {
      setError(friendlyError(error, 'Código ou link inválido. Solicite um novo e-mail de recuperação.'));
    } finally { setBusy(false); }
  }

  async function savePassword() {
    if (!supabase || busy || !settingPassword) return;
    setError('');
    if (password.length < 12) { setError('A nova senha precisa ter pelo menos 12 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem. Digite a mesma senha nos dois campos.'); return; }
    setBusy(true);
    try {
      // The current Supabase session was obtained by verifying the recovery email.
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) { setError('Não foi possível confirmar o usuário autorizado.'); return; }
      setPassword(''); setConfirmation('');
      onPasswordSaved();
    } catch (error) {
      setError(friendlyError(error, 'Não foi possível salvar sua senha. Tente novamente ou solicite outro e-mail de recuperação.'));
    } finally { setBusy(false); }
  }

  return <main className="denied auth-card">
    <div className="auth-icon"><LockKeyhole size={28} /></div>
    <span className="eyebrow">ÁREA DOS ORGANIZADORES</span>
    <h1>{settingPassword ? 'Defina sua senha' : verifyMode ? 'Confirme seu e-mail' : 'Acessar o painel'}</h1>
    <p>{settingPassword ? 'Escolha a senha que você usará para acessar o painel administrativo.' : verifyMode ? 'Confirme que este e-mail é seu para definir ou recuperar a senha.' : 'Entre com seu e-mail e senha para consultar as indicações de férias.'}</p>
    <label className="field" htmlFor="admin-email">Login (e-mail)<input id="admin-email" type="email" name="username" autoComplete="username" value={ADMIN_EMAIL} readOnly /></label>

    {verifyMode && !settingPassword ? <>
      {message && <div className="info-box" role="status">{message}</div>}
      <form onSubmit={event => { event.preventDefault(); void verifyRecovery(); }}>
        <label className="field" htmlFor="verification">Código ou link de recuperação<input id="verification" autoComplete="one-time-code" required value={verification} onChange={event => setVerification(event.target.value)} placeholder="Cole o link ou digite o código" /></label>
        <button className="primary auth-submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : null}Confirmar e-mail</button>
      </form>
    </> : <form onSubmit={event => { event.preventDefault(); void (settingPassword ? savePassword() : signIn()); }}>
      <label className="field" htmlFor="admin-password">{settingPassword ? 'Nova senha' : 'Senha'}
        <div className="password-field"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={settingPassword ? 'new-password' : 'current-password'} required minLength={settingPassword ? 12 : undefined} value={password} onChange={event => setPassword(event.target.value)} placeholder={settingPassword ? 'Pelo menos 12 caracteres' : 'Digite sua senha'} /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
      </label>
      {settingPassword && <label className="field" htmlFor="password-confirmation">Confirmar nova senha<input id="password-confirmation" type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Digite novamente a nova senha" /></label>}
      <button className="primary auth-submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : null}{busy ? 'Aguarde…' : settingPassword ? 'Salvar senha e acessar o painel' : 'Entrar no painel'}</button>
    </form>}

    {error && <div className="error" role="alert">{error}</div>}
    {!settingPassword && <button className="text-button auth-reset" disabled={busy} onClick={() => void requestRecovery()}>{verifyMode ? 'Enviar outro e-mail de recuperação' : 'Definir ou recuperar senha'}</button>}
    {verifyMode && !settingPassword && <button className="text-button auth-reset" disabled={busy} onClick={() => { setVerifyMode(false); setError(''); setVerification(''); }}>Voltar ao login</button>}
    <p className="auth-back"><a href="./">Voltar ao formulário</a></p>
  </main>;
}

