import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { PlayScreen } from './screens/PlayScreen';
import { BoostScreen } from './screens/BoostScreen';
import { TasksScreen } from './screens/TasksScreen';
import { RankScreen } from './screens/RankScreen';
import { WalletScreen } from './screens/WalletScreen';
import { useAppStore } from './stores/appStore';

function errorMessage(code: string | null): string {
  switch (code) {
    case 'not_in_telegram':
      return 'Vui lòng mở game từ trong Telegram (bot Mini App).';
    case 'network':
      return 'Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.';
    case 'server:invalid_init_data':
      return 'Telegram xác thực thất bại (kiểm tra TELEGRAM_BOT_TOKEN trên server).';
    case 'server:database_unavailable':
      return 'Máy chủ chưa kết nối được cơ sở dữ liệu.';
    case 'server:banned':
      return 'Tài khoản đã bị khóa.';
    default:
      return `Không thể đăng nhập (${code ?? 'unknown'}).`;
  }
}

export default function App() {
  const booting = useAppStore((s) => s.booting);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authError = useAppStore((s) => s.authError);
  const bootstrap = useAppStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
    // api.ts phát sự kiện này khi session hết hạn (401) -> đăng nhập lại
    const onExpired = () => { void bootstrap(); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [bootstrap]);

  if (booting) {
    return (
      <div className="app loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app loading-screen">
        <p>{errorMessage(authError)}</p>
        <button
          style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none' }}
          onClick={() => void bootstrap()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
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
