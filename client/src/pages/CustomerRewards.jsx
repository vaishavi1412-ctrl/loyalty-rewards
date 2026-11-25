import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';

export default function CustomerRewards() {
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([api('/customer/dashboard'), api('/customer/rewards')]);
      setBalance(d.balance);
      setRewards(r.rewards);
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function redeem(reward) {
    if (!window.confirm(`Redeem "${reward.name}" for ${reward.points_cost} points?`)) return;
    setMsg(null);
    try {
      const r = await api(`/customer/rewards/${reward.id}/redeem`, { method: 'POST' });
      setMsg({ type: 'success', text: r.message });
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    } finally {
      load();
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Rewards</h1>
        <span className="badge text-bg-primary fs-6">{balance} points</span>
      </div>
      <Alert message={msg} onClose={() => setMsg(null)} />
      <div className="row g-3">
        {rewards.length === 0 && <p className="text-muted">No rewards are available right now.</p>}
        {rewards.map((r) => {
          const soldOut = r.stock < 1;
          const tooExpensive = balance < r.points_cost;
          return (
            <div className="col-sm-6 col-lg-4" key={r.id}>
              <div className="card h-100 p-3">
                <h2 className="h5">{r.name}</h2>
                <p className="text-muted flex-grow-1">{r.description || 'No description.'}</p>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{r.points_cost} points</div>
                    <div className="small text-muted">{soldOut ? 'Out of stock' : `${r.stock} left`}</div>
                  </div>
                  <button className="btn btn-primary" disabled={soldOut || tooExpensive} onClick={() => redeem(r)}>
                    {soldOut ? 'Sold out' : tooExpensive ? 'Not enough points' : 'Redeem'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
