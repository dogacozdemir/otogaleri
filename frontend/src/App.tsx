import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";
import { CurrencyRatesProvider } from "./contexts/CurrencyRatesContext";
import { ViewCurrencyProvider } from "./contexts/ViewCurrencyContext";
import { Toaster } from "./components/ui/toaster";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import BranchesPage from "./pages/BranchesPage";
import StaffPage from "./pages/StaffPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CustomerList from "./pages/CustomerList";
import CustomerDetails from "./pages/CustomerDetails";
import QuotesPage from "./pages/QuotesPage";
import AccountingPage from "./pages/AccountingPage";
import InventoryPage from "./pages/InventoryPage";
import SettingsPage from "./pages/SettingsPage";
import JapaneseCalculatorPage from "./pages/JapaneseCalculatorPage";
import SidebarLayout from "./components/SidebarLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TenantProvider>
          <CurrencyRatesProvider>
          <ViewCurrencyProvider>
          <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetails />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="gumruk-hesaplama" element={<JapaneseCalculatorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          </Routes>
          <Toaster />
          </ViewCurrencyProvider>
          </CurrencyRatesProvider>
        </TenantProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
