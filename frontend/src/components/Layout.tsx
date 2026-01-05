import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { removeToken } from "@/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    removeToken();
    navigate("/login");
  };

  const switchLang = (lng: "tr" | "en") => {
    i18n.changeLanguage(lng);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <aside className="w-64 bg-gray-800 p-6">
        <h1 className="text-xl font-bold mb-8">{t("app.title")}</h1>
        <nav className="space-y-2">
          <Link
            to="/dashboard"
            className={`block px-4 py-2 rounded ${isActive("/dashboard") ? "bg-blue-600" : "hover:bg-gray-700"}`}
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            to="/vehicles"
            className={`block px-4 py-2 rounded ${isActive("/vehicles") ? "bg-blue-600" : "hover:bg-gray-700"}`}
          >
            {t("nav.vehicles")}
          </Link>
          <Link
            to="/branches"
            className={`block px-4 py-2 rounded ${isActive("/branches") ? "bg-blue-600" : "hover:bg-gray-700"}`}
          >
            {t("nav.branches")}
          </Link>
          <Link
            to="/staff"
            className={`block px-4 py-2 rounded ${isActive("/staff") ? "bg-blue-600" : "hover:bg-gray-700"}`}
          >
            {t("nav.staff")}
          </Link>
          <Link
            to="/analytics"
            className={`block px-4 py-2 rounded ${isActive("/analytics") ? "bg-blue-600" : "hover:bg-gray-700"}`}
          >
            {t("nav.analytics")}
          </Link>
        </nav>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => switchLang("tr")}
              className={`px-3 py-1 rounded text-sm ${i18n.language === "tr" ? "bg-blue-600" : "bg-gray-700"}`}
            >
              TR
            </button>
            <button
              onClick={() => switchLang("en")}
              className={`px-3 py-1 rounded text-sm ${i18n.language === "en" ? "bg-blue-600" : "bg-gray-700"}`}
            >
              EN
            </button>
          </div>
          <button onClick={handleLogout} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
