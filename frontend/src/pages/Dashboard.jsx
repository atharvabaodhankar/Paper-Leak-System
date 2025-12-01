import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import TeacherDashboard from './teacher/TeacherDashboard';
import AuthorityDashboard from './authority/AuthorityDashboard';
import ExamCenterDashboard from './examCenter/ExamCenterDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { account, disconnectWallet, isOnSepolia, switchToSepolia } = useWeb3();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    disconnectWallet();
    navigate('/login');
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      teacher: { name: 'Teacher', icon: '📝', color: 'primary' },
      authority: { name: 'Exam Authority', icon: '🏛️', color: 'secondary' },
      examCenter: { name: 'Exam Center', icon: '🖨️', color: 'success' },
    };
    return roleMap[role] || roleMap.teacher;
  };

  const roleInfo = getRoleDisplay(user?.role);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-card mb-8">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] flex items-center justify-center text-2xl shadow-lg">
                🛡️
              </div>
              <div>
                <h1 className="text-2xl font-bold">ChainSeal</h1>
                <p className="text-xs text-[hsl(var(--color-text-muted))] uppercase tracking-widest font-semibold">Secure Exam Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right">
                <p className="font-semibold text-sm">{user?.name}</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnSepolia ? 'bg-success animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] text-[hsl(var(--color-text-muted))] uppercase font-bold tracking-tighter">
                    {isOnSepolia ? 'Sepolia Connected' : 'Wrong Network'}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-outline py-2 px-4 text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom">
        {/* Main Dashboard Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center text-4xl shadow-inner border border-white/10">
                  {roleInfo.icon}
                </div>
                <h3 className="font-bold text-lg">{user?.name}</h3>
                <span className={`badge-${roleInfo.color} mt-2 inline-block`}>{roleInfo.name}</span>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-[hsl(var(--color-text-muted))] uppercase font-bold mb-1">Wallet</p>
                  <p className="font-mono text-[11px] truncate bg-black/20 p-2 rounded">{account}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(var(--color-text-muted))] uppercase font-bold mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span className="text-sm">Verified Profile</span>
                  </div>
                </div>
              </div>
            </div>

            {!isOnSepolia && (
              <div className="glass-card bg-red-500/10 border-red-500/50 p-6">
                <p className="text-sm text-red-500 font-semibold mb-3">⚠️ Network Mismatch</p>
                <p className="text-xs mb-4">You are not on Sepolia. Please switch to interact with blockchain.</p>
                <button onClick={switchToSepolia} className="btn-primary w-full py-2 text-sm bg-red-500 hover:bg-red-600">
                  Switch to Sepolia
                </button>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {user?.role === 'teacher' && <TeacherDashboard />}
            {user?.role === 'authority' && <AuthorityDashboard />}
            {user?.role === 'examCenter' && <ExamCenterDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

