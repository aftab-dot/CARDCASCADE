import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Toast from './components/Toast.jsx';
import BoardPage from './pages/BoardPage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import BurndownPage from './pages/BurndownPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import RetroPage from './pages/RetroPage.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1500px] p-3 md:p-5">
        <Routes>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/burndown" element={<BurndownPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/retro" element={<RetroPage />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </main>
      <Toast />
    </>
  );
}
