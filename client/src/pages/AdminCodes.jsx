import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import Alert from '../components/Alert.jsx';
import Pagination from '../components/Pagination.jsx';

const STATUS_BADGE = { unused: 'primary', used: 'success', disabled: 'secondary' };

export default function AdminCodes() {
  const [form, setForm] = useState({ label: '', quantity: 10, pointsValue: 100 });
  const [generated, setGenerated] = useState([]);
  const [batches, setBatches] = useState([]);
  const [list, setList] = useState({ rows: [], total: 0, page: 1, pageSize: 25 });
  const [filters, setFilters] = useState({ status: '', q: '', page: 1 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadBatches = useCallback(
    () => api('/admin/batches').then((d) => setBatches(d.batches)).catch(() => {}), []
  );
  const loadCodes = useCallback(
    () => api('/admin/codes?' + new URLSearchParams(filters))
      .then(setList)
      .catch((e) => setMsg({ type: 'danger', text: e.message })),
    [filters]
  );
  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadCodes(); }, [loadCodes]);

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api('/admin/batches', { method: 'POST', body: form });
      setGenerated(r.codes);
      setMsg({ type: 'success', text: r.message + ' Copy them or download the CSV for printing.' });
      loadBatches();
      loadCodes();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleCode(row) {
    setMsg(null);
    try {
      await api(`/admin/codes/${row.id}`, { method: 'PATCH', body: { status: row.status === 'unused' ? 'disabled' : 'unused' } });
      loadCodes();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(generated.join('\n'));
      setMsg({ type: 'success', text: 'Codes copied to the clipboard.' });
    } catch {
      setMsg({ type: 'danger', text: 'Could not copy. Please download the CSV instead.' });
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Product codes</h1>
      <Alert message={msg} onClose={() => setMsg(null)} />

      <div className="card p-3 mb-4">
        <h2 className="h5">Generate a new batch</h2>
        <form className="row g-2 align-items-end" onSubmit={generate}>
          <div className="col-md-4">
            <label className="form-label">Batch label</label>
            <input className="form-control" required placeholder="e.g. March production" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">How many codes (1-1000)</label>
            <input className="form-control" type="number" min="1" max="1000" required value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Points per code</label>
            <input className="form-control" type="number" min="1" required value={form.pointsValue}
              onChange={(e) => setForm({ ...form, pointsValue: e.target.value })} />
          </div>
          <div className="col-md-2"><button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Working…' : 'Generate'}</button></div>
        </form>
        {generated.length > 0 && (
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <strong>New codes ({generated.length})</strong>
              <button className="btn btn-outline-secondary btn-sm" onClick={copyAll}>Copy all</button>
            </div>
            <div className="code-list border rounded p-2 bg-light">{generated.map((c) => <div key={c}>{c}</div>)}</div>
          </div>
        )}
      </div>

      <div className="card p-3 mb-4">
        <h2 className="h5">Batches</h2>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Label</th><th>Created</th><th className="text-end">Codes</th><th className="text-end">Used</th><th className="text-end">Points each</th><th /></tr></thead>
            <tbody>
              {batches.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-3">No batches yet.</td></tr>}
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.label}</td><td>{fmtDate(b.created_at)}</td>
                  <td className="text-end">{b.quantity}</td><td className="text-end">{b.used}</td><td className="text-end">{b.points_value}</td>
                  <td className="text-end"><a className="btn btn-outline-primary btn-sm" href={`/api/admin/batches/${b.id}/csv`}>Download CSV</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-3">
        <h2 className="h5">All codes</h2>
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
              <option value="">All statuses</option><option value="unused">Unused</option><option value="used">Used</option><option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="col-md-8">
            <input className="form-control" placeholder="Search for a code" value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} />
          </div>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Code</th><th>Batch</th><th className="text-end">Points</th><th>Status</th><th>Redeemed by</th><th>Redeemed at</th><th /></tr></thead>
            <tbody>
              {list.rows.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-3">No codes found.</td></tr>}
              {list.rows.map((r) => (
                <tr key={r.id}>
                  <td className="code-input">{r.code}</td>
                  <td>{r.batch_label}</td>
                  <td className="text-end">{r.points_value}</td>
                  <td><span className={`badge text-bg-${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  <td>{r.redeemed_by_name ? `${r.redeemed_by_name} (${r.redeemed_by_email})` : '-'}</td>
                  <td>{fmtDate(r.redeemed_at)}</td>
                  <td className="text-end">
                    {r.status !== 'used' && (
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => toggleCode(r)}>
                        {r.status === 'unused' ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} total={list.total} pageSize={list.pageSize} onPage={(p) => setFilters({ ...filters, page: p })} />
      </div>
    </>
  );
}
