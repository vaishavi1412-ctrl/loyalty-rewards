import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Alert from '../components/Alert.jsx';

const CARDS = [
  ['totalCustomers', 'Total customers'],
  ['submittedCodes', 'Codes submitted (all attempts)'],
  ['redeemedCodes', 'Codes redeemed'],
  ['pointsAwarded', 'Points awarded'],
  ['pointsSpent', 'Points spent on rewards'],
  ['rewardsRedeemed', 'Rewards redeemed'],
  ['failedAttempts', 'Failed / rejected attempts'],
  ['totalCodes', 'Codes generated'],
  ['unusedCodes', 'Codes still unused'],
  ['disabledCodes', 'Codes disabled'],
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    api('/admin/stats').then(setStats).catch((e) => setMsg({ type: 'danger', text: e.message }));
  }, []);

  return (
    <>
      <h1 className="h3 mb-4">Factory dashboard</h1>
      <Alert message={msg} />
      <div className="row g-3">
        {CARDS.map(([key, label]) => (
          <div className="col-6 col-lg-3" key={key}>
            <div className="card stat-card p-3 h-100">
              <div className="text-muted small">{label}</div>
              <div className="value">{stats ? stats[key] : '…'}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
