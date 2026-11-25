import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Alert from '../components/Alert.jsx';

// One login page used for both customers and the factory owner.
export default function Login({ admin }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await signIn(admin ? '/auth/admin/login' : '/auth/login', form);
      navigate(admin ? '/admin' : '/dashboard');
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card p-4">
        <h2 className="h4 mb-3">{admin ? 'Factory owner login' : 'Customer login'}</h2>
        <Alert message={msg} />
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
        </form>
        {!admin && <p className="text-center mt-3 mb-0">New here? <Link to="/register">Create an account</Link></p>}
      </div>
    </div>
  );
}
