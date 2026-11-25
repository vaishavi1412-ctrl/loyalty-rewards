import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile menu

  const links = !user
    ? [['/login', 'Customer login'], ['/register', 'Register'], ['/admin/login', 'Factory owner']]
    : user.role === 'admin'
    ? [['/admin', 'Dashboard'], ['/admin/customers', 'Customers'], ['/admin/codes', 'Codes'], ['/admin/rewards', 'Rewards'], ['/admin/monitor', 'Monitoring']]
    : [['/dashboard', 'My points'], ['/rewards', 'Rewards']];

  async function logout() {
    await signOut();
    navigate(user.role === 'admin' ? '/admin/login' : '/login');
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <span className="navbar-brand brand">Loyalty Rewards{user && user.role === 'admin' ? ' · Admin' : ''}</span>
        <button className="navbar-toggler" type="button" aria-label="Menu" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto">
            {links.map(([to, label]) => (
              <li className="nav-item" key={to}>
                <NavLink end to={to} className="nav-link" onClick={() => setOpen(false)}>{label}</NavLink>
              </li>
            ))}
          </ul>
          {user && (
            <div className="d-flex align-items-center gap-3 text-light">
              <span className="small">{user.name}</span>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
