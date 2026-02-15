import { useEffect, useState, useCallback, useMemo } from "react";
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
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "./ThemeToggle";
import GlobalSearch from "./GlobalSearch";
import CurrencyConverterPopover from "./CurrencyConverterPopover";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenant } from "@/contexts/TenantContext";
import { getToken, removeToken } from "@/api";

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
    name: "Gümrük Hesaplama", 
    path: "/gumruk-hesaplama", 
    icon: Calculator,
    description: "Japon araç gümrük kıymet hesaplama"
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
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tenant } = useTenant();
  
  // Logout confirmation dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sidebar collapse state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });

  // Load user from localStorage
  const loadUser = useCallback(() => {
    try {
      const token = getToken();
      if (token) {
        const userData = { name: "Admin" };
        setUser(userData);
      }
    } catch (e) {
      console.warn("Kullanıcı verisi çözümlenemedi:", e);
      setUser(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleLogout = useCallback(() => {
    removeToken();
    navigate("/login", { replace: true });
  }, [navigate]);

  const galleryName = "Akıllı Galeri";
  
  // Get user initials for avatar
  const getUserInitials = useCallback(() => {
    if (user?.name) {
      const parts = user.name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    return "U";
  }, [user?.name]);

  // ESC ile sidebar kapatma
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Click outside handler for mobile sidebar
  useEffect(() => {
    if (!open || !isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('aside') && !target.closest('button[aria-label="Menüyü aç"]')) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isMobile]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Left Sidebar - Deep Navy Background */}
      <aside
        className={`
          fixed z-40 top-0 left-0 h-screen bg-[#003d82] dark:bg-[#002952] text-white transform
          flex flex-col
          transition-all duration-300 ease-in-out shadow-xl overflow-hidden
          ${isMobile ? "w-full max-w-[85vw]" : sidebarCollapsed ? "w-16" : "w-64"}
          ${open || !isMobile ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed && !isMobile ? "lg:w-16" : "lg:w-64"}
          pt-[env(safe-area-inset-top)]
        `}
        aria-hidden={!open && isMobile}
      >
        {/* Header - Fixed height h-20 (80px) */}
        <div className="h-20 flex-shrink-0 flex items-center border-b border-white/10 justify-between">
          <div className="flex items-center w-full">
            {!isMobile && (
              <div className="w-16 flex-shrink-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-white hover:bg-white/10"
                  aria-label={sidebarCollapsed ? "Sidebar'ı genişlet" : "Sidebar'ı daralt"}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div 
              className={`overflow-hidden transition-[max-width,opacity] duration-300 h-[3.5rem] ${
                sidebarCollapsed && !isMobile 
                  ? 'max-w-0 opacity-0' 
                  : 'max-w-[200px] opacity-100'
              }`}
            >
              <div className="whitespace-nowrap h-full flex flex-col justify-center pl-3">
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                  {galleryName}
                </h1>
                <p className="text-xs text-white/90 font-medium leading-tight">
                  Profesyonel Yönetim
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setOpen(false)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Sidebar'ı kapat"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Navigation Menu - Scroll yok, overflow hidden */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <nav className="flex-1 overflow-hidden">
            <div className="space-y-1 py-2">
              {menuItems
                .filter(item => item.path !== "/staff" && item.path !== "/branches")
                .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <div key={item.path} className="relative group w-full">
                    <Link
                      to={item.path}
                      onClick={() => isMobile && setOpen(false)}
                      className={`
                        group flex items-center py-2.5 rounded-xl relative
                        transition-colors duration-200
                        ${isActive 
                          ? "bg-white/10 text-white border-l-2 border-[#F0A500]/80" 
                          : "text-white/80 hover:bg-white/5 hover:text-white"
                        }
                      `}
                      title={sidebarCollapsed && !isMobile ? item.name : item.description}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Fixed width icon container - always at left-0, never moves */}
                      <div className="w-16 flex-shrink-0 flex items-center justify-center">
                        <Icon className={`w-5 h-5 transition-colors ${
                          isActive ? "text-[#F0A500]" : "text-white/90 group-hover:text-white"
                        }`} />
                      </div>
                      {/* Text container with smooth transition */}
                      <div 
                        className={`overflow-hidden transition-[max-width,opacity] duration-300 ${
                          sidebarCollapsed && !isMobile 
                            ? 'max-w-0 opacity-0' 
                            : 'max-w-[200px] opacity-100'
                        }`}
                      >
                        <span className="font-semibold text-sm whitespace-nowrap block text-white">{item.name}</span>
                      </div>
                    </Link>
                    {/* Tooltip for collapsed state - Fixed z-index and no clipping */}
                    {sidebarCollapsed && !isMobile && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground border border-border text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] whitespace-nowrap">
                        {item.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Footer - Logout Section - Her zaman en altta */}
        <div className="border-t border-white/10 flex-shrink-0 py-2 mt-auto">
          <div className="relative group">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center py-2.5 text-white/95 hover:text-white hover:bg-white/10 rounded-xl relative transition-colors duration-200"
              title={sidebarCollapsed && !isMobile ? "Güvenli Çıkış" : undefined}
              aria-label="Güvenli çıkış yap"
            >
              {/* Fixed width icon container - always at left-0, never moves */}
              <div className="w-16 flex-shrink-0 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              {/* Text container with smooth transition */}
              <div 
                className={`overflow-hidden transition-[max-width,opacity] duration-300 ${
                  sidebarCollapsed && !isMobile 
                    ? 'max-w-0 opacity-0' 
                    : 'max-w-[200px] opacity-100'
                }`}
              >
                <span className="font-semibold text-sm whitespace-nowrap">Güvenli Çıkış</span>
              </div>
            </button>
            {/* Tooltip for collapsed state - Fixed z-index */}
            {sidebarCollapsed && !isMobile && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground border border-border text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100] whitespace-nowrap">
                Güvenli Çıkış
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover"></div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content - Offset for fixed sidebar; min-w-0 prevents flex child from overflowing */}
      <div className={`flex flex-col flex-1 min-h-screen min-w-0 transition-all duration-300 ${sidebarCollapsed && !isMobile ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Header - Fixed height h-20 (80px) matching sidebar; safe area for notch */}
        <header className="w-full bg-card/95 backdrop-blur-md shadow-sm border-b border-border sticky top-0 z-20 h-20 flex-shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center justify-between h-full max-w-[1400px] mx-auto gap-2">
              {/* Left Section - Menu & Brand */}
              <div className="flex items-center space-x-2 sm:space-x-6 flex-1 min-w-0 overflow-hidden">
                <button 
                  onClick={() => setOpen(true)}
                  className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0 transition-colors"
                  aria-label="Menüyü aç"
                >
                  <Menu className="w-5 h-5 text-white" />
                </button>
                {/* Şirket/galeri adı: yalnızca desktop (sm ve üzeri); mobilde gizli */}
                <div className="hidden sm:block border-l border-border pl-3 sm:pl-6 flex-shrink min-w-0 overflow-hidden">
                  <h2 className="text-base sm:text-xl font-bold text-foreground truncate">
                    {galleryName}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground min-h-[16px] truncate">
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
                {/* Mobile Search - Icon only */}
                <div className="sm:hidden flex-shrink-0">
                  <GlobalSearch iconOnly />
                </div>
                
                {/* Theme Toggle */}
                <div className="flex items-center flex-shrink-0">
                  <ThemeToggle />
                </div>
                
                {/* Currency Converter */}
                <div className="flex items-center flex-shrink-0">
                  <CurrencyConverterPopover />
                </div>
                
                {/* Quick Actions Dropdown - Using shadcn/ui */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center justify-center sm:justify-start min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-3 sm:py-2 gap-2 bg-primary rounded-xl shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
                      aria-label="Hızlı işlemler menüsü"
                    >
                      <Plus className="w-5 h-5 text-white flex-shrink-0" />
                      <span className="text-white font-medium text-sm hidden sm:inline">Hızlı İşlemler</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Hızlı İşlemler</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate('/vehicles')}
                      className="cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Yeni Araç</p>
                        <p className="text-xs text-muted-foreground">Araç ekle</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/vehicles')}
                      className="cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Car className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Araç Sat</p>
                        <p className="text-xs text-muted-foreground">Araç satış işlemi</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/customers')}
                      className="cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Müşteri Ekle</p>
                        <p className="text-xs text-muted-foreground">Yeni müşteri ekle</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/inventory')}
                      className="cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Stok</p>
                        <p className="text-xs text-muted-foreground">Stok yönetimi</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* User Avatar with Dropdown - Using shadcn/ui */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="min-w-[44px] min-h-[44px] w-10 h-10 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center shadow-professional-sm hover:shadow-professional-md transition-all duration-200 border-2 border-primary/30 flex-shrink-0"
                      aria-label="Profil menüsü"
                    >
                      <span className="text-primary font-bold text-xs sm:text-sm">
                        {getUserInitials()}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => navigate('/settings')}
                      className="cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <Settings className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Ayarlar</p>
                        <p className="text-xs text-muted-foreground">Galeri ayarları</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowLogoutConfirm(true)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center mr-3">
                        <LogOut className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Çıkış Yap</p>
                        <p className="text-xs text-muted-foreground">Güvenli çıkış</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-background pb-[env(safe-area-inset-bottom)] min-w-0 overflow-x-hidden">
          <div className="w-full max-w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            <div className="main-content-inner max-w-[1400px] mx-auto min-w-0 w-full">
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

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleLogout}
        title="Çıkış yapmak istiyor musunuz?"
        description="Oturumunuz güvenli bir şekilde sonlandırılacak."
        confirmText="Evet"
        cancelText="Hayır"
        variant="destructive"
        icon={<LogOut className="h-6 w-6" />}
      />
    </div>
  );
};

export default SidebarLayout;
