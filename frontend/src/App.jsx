import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Web3Provider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route
              path="/complete-profile"
              element={
                <PrivateRoute requireCompleteProfile={false}>
                  <CompleteProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </Web3Provider>
    </Router>
  );
}

export default App;
