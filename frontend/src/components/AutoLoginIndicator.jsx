import { useAuth } from '../context/AuthContext';

const AutoLoginIndicator = ({ isAutoLoggingIn }) => {
  const { loading } = useAuth();

  // Show indicator if auto-logging in or auth is loading
  if (!isAutoLoggingIn && !loading) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium">
          {isAutoLoggingIn ? '🔄 Switching accounts...' : '🔐 Authenticating...'}
        </span>
      </div>
    </div>
  );
};

export default AutoLoginIndicator;