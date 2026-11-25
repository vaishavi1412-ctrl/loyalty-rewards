import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import Alert from '../components/Alert.jsx';
import Pagination from '../components/Pagination.jsx';

const REASONS = { ok: 'Success', invalid: 'Invalid code', already_used: 'Already used', disabled: 'Disabled code', locked: 'Locked out' };

export default function AdminMonitor() {
  const [tab, setTab] = useState('attempts');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 25 });
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    const path = tab === 'attempts'
      ? '/admin/attempts?' + new URLSearchParams({ reason: filter, page })
      : '/admin/transactions?' + new URLSearchParams({ type: filter, page });
    return api(path).then(setData).catch((e) => setMsg({ type: 'danger', text: e.message }));
  }, [tab, filter, page]);
  useEffect(() => { load(); }, [load]);

  function switchTab(t) { setTab(t); setFilter(''); setPage(1); }

  return (
    <>
      <h1 className="h3 mb-3">Monitoring</h1>
      <Alert message={msg} onClose={() => setMsg(null)} />
      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'attempts' ? 'active' : ''}`} onClick={() => switchTab('attempts')}>Code submissions</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'transactions' ? 'active' : ''}`} onClick={() => switchTab('transactions')}>Points transactions</button></li>
      </ul>

      <div className="card p-3">
        {tab === 'attempts' ? (
          <select className="form-select mb-3 w-auto" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">All results</option>
            {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : (
          <select className="form-select mb-3 w-auto" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">All types</option><option value="earn">Points earned</option><option value="spend">Points spent</option>
          </select>
        )}
        <div className="table-responsive">
          {tab === 'attempts' ? (
            <table className="table align-middle mb-0">
              <thead><tr><th>Time</th><th>Customer</th><th>Code entered</th><th>Result</th></tr></thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-3">Nothing to show.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.created_at)}</td><td>{r.name} ({r.email})</td>
                    <td className="code-input">{r.code_entered}</td>
                    <td><span className={`badge text-bg-${r.success ? 'success' : 'danger'}`}>{REASONS[r.reason] || r.reason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table align-middle mb-0">
              <thead><tr><th>Time</th><th>Customer</th><th>Description</th><th className="text-end">Points</th></tr></thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-3">Nothing to show.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.created_at)}</td><td>{r.name} ({r.email})</td><td>{r.description}</td>
                    <td className={`text-end fw-bold ${r.points > 0 ? 'text-success' : 'text-danger'}`}>{r.points > 0 ? '+' : ''}{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
      </div>
    </>
  );
}
