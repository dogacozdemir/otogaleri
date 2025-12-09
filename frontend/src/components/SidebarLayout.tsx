import { useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { 
  Menu, 
  X, 
  LogOut, 
  Home, 
  Car,
  Building2,
  UserCheck,
  TrendingUp,
  Plus,
  Users,
  Wallet,
  Package,
  Settings,
  FileText
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import GlobalSearch from "./GlobalSearch";
import CurrencyConverterPopover from "./CurrencyConverterPopover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenant } from "@/contexts/TenantContext";

const menuItems = [
  { 
    name: "Dashboard", 
    path: "/dashboard", 
    icon: Home,
    description: "Ana sayfa ve genel durum"
  },
  { 
    name: "Araçlar", 
    path: "/vehicles", 
    icon: Car,
    description: "Araç yönetimi ve satış takibi"
  },
  { 
    name: "Şubeler", 
    path: "/branches", 
    icon: Building2,
    description: "Şube yönetimi"
  },
  { 
    name: "Personel", 
    path: "/staff", 
    icon: UserCheck,
    description: "Personel yönetimi"
  },
  { 
    name: "Raporlar", 
    path: "/analytics", 
    icon: TrendingUp,
    description: "Analitik ve raporlar"
  },
  { 
    name: "Müşteriler", 
    path: "/customers", 
    icon: Users,
    description: "Müşteri yönetimi ve CRM"
  },
  { 
    name: "Teklifler", 
    path: "/quotes", 
    icon: FileText,
    description: "Satış teklifleri ve yönetimi"
  },
  { 
    name: "Kasa", 
    path: "/accounting", 
    icon: Wallet,
    description: "Gelir ve gider yönetimi"
  },
  { 
    name: "Stok", 
    path: "/inventory", 
    icon: Package,
    description: "Stok takibi ve ürün yönetimi"
  },
  { 
    name: "Ayarlar", 
    path: "/settings", 
    icon: Settings,
    description: "Galeri ayarları ve genel yapılandırma"
  },
];

const SidebarLayout = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tenant } = useTenant();

  // Load user from localStorage
  const loadUser = () => {
    try {
      const token = localStorage.getItem("otogaleri_token");
      if (token) {
        // Decode token to get user info (simplified)
        const userData = { name: "Admin" };
        setUser(userData);
      }
    } catch (e) {
      console.warn("Kullanıcı verisi çözümlenemedi:", e);
      setUser(null);
    }
  };

  // Initial load
  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("otogaleri_token");
    navigate("/login", { replace: true });
  };

  const galleryName = tenant?.name ?? "Oto Galeri";
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    return "U";
  };

  // ESC ile kapatma
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Dropdown için ESC ile kapatma
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dropdownOpen]);

  // Dropdown dışına tıklandığında kapatma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.quick-actions-dropdown')) {
        setDropdownOpen(false);
      }
      if (!target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    if (dropdownOpen || profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, profileDropdownOpen]);

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* Fixed Left Sidebar - Deep Navy Background */}
      <aside
        className={`
          fixed z-40 top-0 left-0 h-screen w-64 bg-[#003d82] text-white transform
          transition-transform duration-300 ease-in-out shadow-xl
          ${open || !isMobile ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        aria-hidden={!open && isMobile}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {galleryName}
              </h1>
              <p className="text-xs text-white/70 font-medium">
                Profesyonel Yönetim
              </p>
            </div>
          </div>
          <button 
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Sidebar'ı kapat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Navigation Menu - Premium Styling */}
        <div className="flex-1 flex flex-col">
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setOpen(false)}
                    className={`
                      group flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive 
                        ? "bg-white/10 text-white sidebar-active-border" 
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                      }
                    `}
                    title={item.description}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-[#F0A500]" : "text-white/70 group-hover:text-white"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm truncate block">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Footer - Logout Section */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      {/* Main content - Offset for fixed sidebar */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-64">
        <header className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-[#e2e8f0] sticky top-0 z-20 min-h-[72px] flex-shrink-0">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 h-full">
            <div className="flex items-center justify-between h-full max-w-[1400px] mx-auto">
              {/* Left Section - Menu & Brand */}
              <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
                <button 
                  onClick={() => setOpen(true)}
                  className="lg:hidden p-2 sm:p-3 rounded-xl bg-[#003d82] hover:bg-[#003d82]/90 flex-shrink-0 transition-colors"
                  aria-label="Menüyü aç"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                <div className="border-l border-[#e2e8f0] pl-3 sm:pl-6 flex-shrink-0 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] truncate">
                    {isMobile ? galleryName.split(' ')[0] : galleryName}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#2d3748]/70 hidden sm:block min-h-[16px]">
                    {menuItems.find(item => item.path === location.pathname)?.description || "Profesyonel Yönetim Paneli"}
                  </p>
                </div>
                
                {/* Global Search - Hidden on small mobile */}
                <div className="hidden sm:block flex-shrink-0 w-[200px] lg:w-[280px]">
                  <GlobalSearch />
                </div>
              </div>
              
              {/* Right Section - Status & User */}
              <div className="flex items-center space-x-2 sm:space-x-6 flex-shrink-0">
                {/* Mobile Search */}
                <div className="sm:hidden flex-shrink-0">
                  <GlobalSearch />
                </div>
                
                {/* Theme Toggle */}
                <div className="flex items-center flex-shrink-0">
                  <ThemeToggle />
                </div>
                
                {/* Currency Converter */}
                <div className="flex items-center flex-shrink-0">
                  <CurrencyConverterPopover />
                </div>
                
                {/* Quick Actions Button */}
                <div className="relative quick-actions-dropdown flex-shrink-0">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 bg-[#003d82] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5 text-white flex-shrink-0" />
                    <span className="text-white font-medium text-sm hidden sm:inline">Hızlı İşlemler</span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-xl shadow-professional-lg z-50 animate-fade-in">
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Hızlı İşlemler</h3>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate('/vehicles');
                            }}
                            className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-accent transition-colors duration-200"
                          >
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Car className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Yeni Araç</p>
                              <p className="text-xs text-muted-foreground">Araç ekle</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* User Avatar with Dropdown */}
                <div className="relative profile-dropdown flex-shrink-0">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center shadow-professional-sm hover:shadow-professional-md transition-all duration-200 border-2 border-primary/30 flex-shrink-0"
                    aria-label="Profil menüsü"
                  >
                    <span className="text-primary font-bold text-xs sm:text-sm">
                      {getUserInitials()}
                    </span>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-card border border-border rounded-xl shadow-professional-lg z-50 animate-fade-in">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-accent transition-colors duration-200"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Settings className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Ayarlar</p>
                            <p className="text-xs text-muted-foreground">Galeri ayarları</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-destructive/10 transition-colors duration-200 text-destructive"
                        >
                          <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Çıkış Yap</p>
                            <p className="text-xs text-muted-foreground">Güvenli çıkış</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-[#f8f9fa]">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-[1400px] mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Overlay */}
      {open && (
        <button
          aria-label="Menüyü kapat"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default SidebarLayout;
