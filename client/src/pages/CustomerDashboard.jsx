import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import Alert from '../components/Alert.jsx';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api('/customer/dashboard').then(setData).catch((e) => setMsg({ type: 'danger', text: e.message })),
    []
  );
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api('/customer/codes/redeem', { method: 'POST', body: { code } });
      setMsg({ type: 'success', text: r.message });
      setCode('');
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    } finally {
      setBusy(false);
      load(); // refresh balance and history, also after a failed attempt
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Welcome, {user.name}</h1>
      <div className="row g-3 mb-4">
        <div className="col-md-5">
          <div className="card hero-card p-4 h-100">
            <div className="opacity-75">Your points balance</div>
            <div className="points">{data ? data.balance : '…'}</div>
            <div className="mt-3 small opacity-75">
              Earned {data ? data.totalEarned : 0} · Spent {data ? data.totalSpent : 0}
            </div>
            <Link to="/rewards" className="btn btn-light btn-sm mt-3 align-self-start">Browse rewards</Link>
          </div>
        </div>
        <div className="col-md-7">
          <div className="card p-4 h-100">
            <h2 className="h5">Enter your product code</h2>
            <p className="text-muted small">Find the code printed inside your product box (format XXXX-XXXX-XXXX).</p>
            <Alert message={msg} onClose={() => setMsg(null)} />
            <form onSubmit={submit} className="d-flex gap-2">
              <input className="form-control code-input" placeholder="XXXX-XXXX-XXXX" required maxLength={20}
                value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Submit'}</button>
            </form>
          </div>
        </div>
      </div>

      <div className="card p-3">
        <h2 className="h5">Transaction history</h2>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Date</th><th>Description</th><th className="text-end">Points</th></tr></thead>
            <tbody>
              {data && data.transactions.length === 0 && (
                <tr><td colSpan="3" className="text-center text-muted py-4">No transactions yet. Submit your first code!</td></tr>
              )}
              {data && data.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.created_at)}</td>
                  <td>{t.description}</td>
                  <td className={`text-end fw-bold ${t.points > 0 ? 'text-success' : 'text-danger'}`}>
                    {t.points > 0 ? '+' : ''}{t.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
