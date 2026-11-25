import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import Alert from '../components/Alert.jsx';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(
    () => api('/admin/customers?' + new URLSearchParams({ q }))
      .then((d) => setCustomers(d.customers))
      .catch((e) => setMsg({ type: 'danger', text: e.message })),
    [q]
  );
  useEffect(() => { load(); }, [load]);

  async function toggle(c) {
    setMsg(null);
    try {
      await api(`/admin/customers/${c.id}`, { method: 'PATCH', body: { isActive: !c.is_active } });
      setMsg({ type: 'success', text: `${c.name} has been ${c.is_active ? 'disabled' : 'enabled'}.` });
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Customers</h1>
      <Alert message={msg} onClose={() => setMsg(null)} />
      <input className="form-control mb-3" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card p-3">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th className="text-end">Codes</th><th className="text-end">Points</th><th>Status</th><th /></tr></thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-4">No customers found.</td></tr>}
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{fmtDate(c.created_at)}</td>
                  <td className="text-end">{c.codes_redeemed}</td>
                  <td className="text-end">{c.balance}</td>
                  <td><span className={`badge text-bg-${c.is_active ? 'success' : 'secondary'}`}>{c.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td className="text-end">
                    <button className={`btn btn-sm btn-outline-${c.is_active ? 'danger' : 'success'}`} onClick={() => toggle(c)}>
                      {c.is_active ? 'Disable' : 'Enable'}
                    </button>
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
