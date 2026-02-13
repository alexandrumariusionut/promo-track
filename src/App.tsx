import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { ThemeModeProvider } from './store/ThemeContext';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import STARRPage from './pages/STARRPage';
import MetricsPage from './pages/MetricsPage';
import FeedbackPage from './pages/FeedbackPage';
import DocumentsPage from './pages/DocumentsPage';
import ProfilePage from './pages/ProfilePage';
import FAQPage from './pages/FAQPage';

export default function App() {
  return (
    <ThemeModeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/starr" element={<STARRPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/faq" element={<FAQPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeModeProvider>
  );
}
