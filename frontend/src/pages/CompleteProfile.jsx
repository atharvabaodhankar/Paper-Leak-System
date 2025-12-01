import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { completeProfile, loading } = useAuth();
  const { account } = useWeb3();
  const [formData, setFormData] = useState({
    name: '',
    role: 'teacher',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    const result = await completeProfile(formData.name, formData.role);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Failed to complete profile');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-4">Welcome to ChainSeal! 👋</h1>
            <p className="text-[hsl(var(--color-text-secondary))]">
              Let's set up your profile
            </p>
          </div>

          {/* Profile Form Card */}
          <div className="glass-card p-8 animate-slide-up">
            {/* Connected Wallet */}
            <div className="mb-6 p-4 bg-[hsl(var(--color-bg-tertiary))] rounded-lg">
              <p className="text-sm text-[hsl(var(--color-text-muted))] mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-[hsl(var(--color-text-primary))]">
                {account?.slice(0, 10)}...{account?.slice(-8)}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[hsl(var(--color-danger))]/20 border border-[hsl(var(--color-danger))]/30 rounded-lg">
                <p className="text-[hsl(var(--color-danger))] text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="input"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium mb-2">
                  Your Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="teacher">Teacher / Paper Setter</option>
                  <option value="authority">Exam Authority</option>
                  <option value="examCenter">Exam Center</option>
                </select>
                <p className="mt-2 text-sm text-[hsl(var(--color-text-muted))]">
                  {formData.role === 'teacher' && '📝 Upload and manage question papers'}
                  {formData.role === 'authority' && '🏛️ Create exams and monitor the system'}
                  {formData.role === 'examCenter' && '🖨️ Print papers at exam time'}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Completing Profile...</span>
                  </div>
                ) : (
                  'Complete Profile'
                )}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 glass-card">
            <p className="text-sm text-[hsl(var(--color-text-muted))] text-center">
              💡 You can update your profile information later in settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
