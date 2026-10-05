import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { PlayScreen } from './screens/PlayScreen';
import { BoostScreen } from './screens/BoostScreen';
import { TasksScreen } from './screens/TasksScreen';
import { RankScreen } from './screens/RankScreen';
import { WalletScreen } from './screens/WalletScreen';
import { useAppStore } from './stores/appStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAppStore();
  
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<div className="login-screen">Loading...</div>} />
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/boost" element={<BoostScreen />} />
        <Route path="/tasks" element={<TasksScreen />} />
        <Route path="/rank" element={<RankScreen />} />
        <Route path="/wallet" element={<WalletScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}