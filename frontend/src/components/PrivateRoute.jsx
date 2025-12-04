import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles = [], requireCompleteProfile = true }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[hsl(var(--color-primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[hsl(var(--color-text-secondary))]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if profile is complete (skip this check for complete-profile page)
  if (requireCompleteProfile && user && !user.isProfileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Check role-based access
  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-[hsl(var(--color-text-secondary))] mb-6">
            You don't have permission to access this page.
          </p>
          <button onClick={() => window.history.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
