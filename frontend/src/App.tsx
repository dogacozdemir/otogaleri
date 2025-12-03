import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import BranchesPage from "./pages/BranchesPage";
import StaffPage from "./pages/StaffPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CustomerList from "./pages/CustomerList";
import CustomerDetails from "./pages/CustomerDetails";
import AccountingPage from "./pages/AccountingPage";
import SidebarLayout from "./components/SidebarLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
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
          <Route path="accounting" element={<AccountingPage />} />
        </Route>
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
