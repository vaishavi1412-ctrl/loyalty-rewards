import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import CustomerRewards from './pages/CustomerRewards.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCustomers from './pages/AdminCustomers.jsx';
import AdminCodes from './pages/AdminCodes.jsx';
import AdminRewards from './pages/AdminRewards.jsx';
import AdminMonitor from './pages/AdminMonitor.jsx';

const Spinner = () => <div className="text-center p-5"><div className="spinner-border" /></div>;

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

// Only lets the right kind of user see a page. (The server checks again on every request.)
function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== role) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />;
  return children;
}

export default function App() {
  const customer = (el) => <RequireRole role="customer">{el}</RequireRole>;
  const admin = (el) => <RequireRole role="admin">{el}</RequireRole>;
  return (
    <>
      <Navbar />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login admin={false} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={customer(<CustomerDashboard />)} />
          <Route path="/rewards" element={customer(<CustomerRewards />)} />
          <Route path="/admin/login" element={<Login admin />} />
          <Route path="/admin" element={admin(<AdminDashboard />)} />
          <Route path="/admin/customers" element={admin(<AdminCustomers />)} />
          <Route path="/admin/codes" element={admin(<AdminCodes />)} />
          <Route path="/admin/rewards" element={admin(<AdminRewards />)} />
          <Route path="/admin/monitor" element={admin(<AdminMonitor />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
