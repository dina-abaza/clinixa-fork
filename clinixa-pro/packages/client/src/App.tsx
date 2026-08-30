import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { IconSprite } from './components/icons/IconSprite';
import { FirstRunSetupPage } from './features/setup/FirstRunSetupPage';
import { LoginPage } from './features/auth/LoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { DashboardPlaceholderPage } from './pages/DashboardPlaceholderPage';

function App() {
  return (
    <BrowserRouter>
      <IconSprite />
      <Routes>
        <Route path="/" element={<Navigate to="/setup" replace />} />
        <Route path="/setup" element={<FirstRunSetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPlaceholderPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
