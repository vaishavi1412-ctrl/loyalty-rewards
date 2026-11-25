import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';

const EMPTY = { name: '', description: '', pointsCost: 100, stock: 10, isActive: true };

export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(
    () => api('/admin/rewards').then((d) => setRewards(d.rewards)).catch((e) => setMsg({ type: 'danger', text: e.message })),
    []
  );
  useEffect(() => { load(); }, [load]);

  function startEdit(r) {
    setEditingId(r.id);
    setForm({ name: r.name, description: r.description, pointsCost: r.points_cost, stock: r.stock, isActive: Boolean(r.is_active) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY); }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = editingId
        ? await api(`/admin/rewards/${editingId}`, { method: 'PUT', body: form })
        : await api('/admin/rewards', { method: 'POST', body: form });
      setMsg({ type: 'success', text: r.message });
      cancelEdit();
      load();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Rewards</h1>
      <Alert message={msg} onClose={() => setMsg(null)} />
      <div className="card p-3 mb-4">
        <h2 className="h5">{editingId ? 'Edit reward' : 'Add a reward'}</h2>
        <form className="row g-2" onSubmit={submit}>
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-md-8">
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Points cost</label>
            <input className="form-control" type="number" min="1" required value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Stock</label>
            <input className="form-control" type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          {editingId && (
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label className="form-check-label" htmlFor="active">Visible to customers</label>
              </div>
            </div>
          )}
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary">{editingId ? 'Save changes' : 'Add reward'}</button>
            {editingId && <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Description</th><th className="text-end">Cost</th><th className="text-end">Stock</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rewards.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-3">No rewards yet.</td></tr>}
              {rewards.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td><td>{r.description}</td>
                  <td className="text-end">{r.points_cost}</td><td className="text-end">{r.stock}</td>
                  <td><span className={`badge text-bg-${r.is_active ? 'success' : 'secondary'}`}>{r.is_active ? 'Active' : 'Hidden'}</span></td>
                  <td className="text-end"><button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(r)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
