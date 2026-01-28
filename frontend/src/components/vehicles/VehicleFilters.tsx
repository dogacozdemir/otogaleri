import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Tag, Calendar, X, Upload, FileUp, Grid3x3, List, Plus, Download, Car, TrendingUp, Package, Wrench, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface VehicleFiltersProps {
  query: string;
  setQuery: (value: string) => void;
  isSoldFilter: string;
  setIsSoldFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  stockStatusFilter: string;
  setStockStatusFilter: (value: string) => void;
  soldVehiclesFilter: string;
  setSoldVehiclesFilter: (value: string) => void;
  activeTab: string;
  vehicles: any[];
  // Action bar props
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  onBulkImportClick?: (type: "vehicles" | "costs") => void;
  addVehicleButton?: ReactNode;
  onExportClick?: () => void;
  onActiveTabChange?: (tab: "vehicles" | "sold") => void;
  activeVehiclesCount?: number;
  soldVehiclesCount?: number;
}

export const VehicleFilters = ({
  query,
  setQuery,
  isSoldFilter,
  setIsSoldFilter,
  statusFilter,
  setStatusFilter,
  stockStatusFilter,
  setStockStatusFilter,
  soldVehiclesFilter,
  setSoldVehiclesFilter,
  activeTab,
  vehicles,
  viewMode,
  onViewModeChange,
  onBulkImportClick,
  addVehicleButton,
  onExportClick,
  onActiveTabChange,
  activeVehiclesCount,
  soldVehiclesCount,
}: VehicleFiltersProps) => {
  // Get unique makers and years from vehicles
  const uniqueMakers = Array.from(new Set(vehicles.map(v => v.maker).filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(vehicles.map(v => v.production_year).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0));

  // Build active filters array
  const activeFilters: string[] = [];
  if (activeTab === "vehicles") {
    if (isSoldFilter === "false") activeFilters.push("Satılmamış");
    if (isSoldFilter === "true") activeFilters.push("Satılmış");
    if (statusFilter) {
      const statusLabels: Record<string, string> = {
        new: "Sıfır",
        used: "İkinci El",
        damaged: "Hasarlı",
        repaired: "Onarılmış",
      };
      activeFilters.push(statusLabels[statusFilter] || statusFilter);
    }
    if (stockStatusFilter) {
      const stockLabels: Record<string, string> = {
        in_stock: "Stokta",
        on_sale: "Satışta",
        reserved: "Rezerve",
        sold: "Satıldı",
      };
      activeFilters.push(stockLabels[stockStatusFilter] || stockStatusFilter);
    }
  } else {
    if (soldVehiclesFilter && soldVehiclesFilter !== "all") {
      const soldLabels: Record<string, string> = {
        cash: "Peşin Satılanlar",
        installment_pending: "Taksitli - Kalan Borç Var",
        installment_completed: "Taksitli - Tamamlandı",
      };
      activeFilters.push(soldLabels[soldVehiclesFilter] || soldVehiclesFilter);
    }
  }

  const clearAllFilters = () => {
    setIsSoldFilter("");
    setStatusFilter("");
    setStockStatusFilter("");
    setSoldVehiclesFilter("all");
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Marka, model, şasi no veya araç numarası ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-border hover:border-primary focus-visible:ring-primary focus-visible:border-primary transition-colors"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {activeTab === "vehicles" && (
            <>
              <Select 
                value={stockStatusFilter || "all"} 
                onValueChange={(value) => setStockStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full lg:w-[160px] h-12 rounded-xl border-border hover:border-primary transition-colors">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="in_stock">Stokta</SelectItem>
                  <SelectItem value="on_sale">Satışta</SelectItem>
                  <SelectItem value="reserved">Rezerve</SelectItem>
                  <SelectItem value="sold">Satıldı</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={statusFilter || "all"} 
                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full lg:w-[160px] h-12 rounded-xl border-border hover:border-primary transition-colors">
                  <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Araç Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="new">Sıfır</SelectItem>
                  <SelectItem value="used">İkinci El</SelectItem>
                  <SelectItem value="damaged">Hasarlı</SelectItem>
                  <SelectItem value="repaired">Onarılmış</SelectItem>
                </SelectContent>
              </Select>

              {uniqueMakers.length > 0 && (
                <Select 
                  value={query.includes("maker:") ? query.split("maker:")[1]?.split(" ")[0] || "all" : "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setQuery(query.replace(/maker:\w+\s*/g, "").trim());
                    } else {
                      const withoutMaker = query.replace(/maker:\w+\s*/g, "").trim();
                      setQuery(`${withoutMaker} ${value}`.trim());
                    }
                  }}
                >
                  <SelectTrigger className="w-full lg:w-[160px] h-12 rounded-xl border-border hover:border-primary transition-colors">
                    <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Marka" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {uniqueMakers.map((maker) => (
                      <SelectItem key={maker} value={maker || ""}>{maker}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {uniqueYears.length > 0 && (
                <Select 
                  value={query.match(/\d{4}/)?.[0] || "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setQuery(query.replace(/\d{4}/g, "").trim());
                    } else {
                      const withoutYear = query.replace(/\d{4}/g, "").trim();
                      setQuery(`${withoutYear} ${value}`.trim());
                    }
                  }}
                >
                  <SelectTrigger className="w-full lg:w-[160px] h-12 rounded-xl border-border hover:border-primary transition-colors">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Yıl" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {uniqueYears.slice(0, 10).map((year) => (
                      <SelectItem key={year} value={year?.toString() || ""}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}

          {activeTab === "sold" && (
            <Select value={soldVehiclesFilter || "all"} onValueChange={setSoldVehiclesFilter}>
              <SelectTrigger className="w-full lg:w-[200px] h-12 rounded-xl border-border hover:border-primary transition-colors">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="cash">Peşin Satılanlar</SelectItem>
                <SelectItem value="installment_pending">Taksitli - Kalan Borç Var</SelectItem>
                <SelectItem value="installment_completed">Taksitli - Tamamlandı</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Aktif Filtreler:</span>
          {activeFilters.map((filter) => (
            <Badge key={filter} variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-lg">
              {filter}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  if (filter === "Satılmamış" || filter === "Satılmış") setIsSoldFilter("");
                  else if (filter === "Sıfır" || filter === "İkinci El" || filter === "Hasarlı" || filter === "Onarılmış") setStatusFilter("");
                  else if (filter === "Stokta" || filter === "Satışta" || filter === "Rezerve" || filter === "Satıldı") setStockStatusFilter("");
                  else if (filter.includes("Peşin") || filter.includes("Taksitli")) setSoldVehiclesFilter("all");
                }} 
              />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            Tümünü Temizle
          </Button>
        </div>
      )}

      {/* Action Bar */}
      {(onBulkImportClick || onViewModeChange || addVehicleButton || onExportClick || onActiveTabChange) && (
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border min-h-[60px]">
          {/* Left Section */}
          <div className="flex gap-2 flex-wrap items-center sm:flex-1 sm:justify-start">
            {activeTab === "vehicles" && onBulkImportClick && (
              <>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-xl h-11 w-11 bg-transparent border-border hover:bg-muted hover:border-primary transition-all"
                  onClick={() => onBulkImportClick("vehicles")}
                  title="Toplu İçe Aktar"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
            {onExportClick && (
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-xl h-11 w-11 bg-transparent border-border hover:bg-muted hover:border-primary transition-all"
                onClick={onExportClick}
                title="Dışa Aktar"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {activeTab === "vehicles" && onBulkImportClick && (
              <Button 
                variant="outline" 
                className="gap-2 rounded-xl h-11 bg-transparent border-border hover:bg-muted hover:border-primary transition-all"
                onClick={() => onBulkImportClick("costs")}
              >
                <FileUp className="h-4 w-4 text-muted-foreground" />
                Masraf Aktar
              </Button>
            )}
          </div>

          {/* Tab Switch - Absolutely Centered */}
          {onActiveTabChange && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform z-10 hidden sm:block">
              <div className="flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-muted/50 to-muted rounded-xl border border-border shadow-sm">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "vehicles" 
                    ? "bg-card shadow-sm text-primary" 
                    : "text-gray-600"
                )}>
                  <Car className={cn(
                    "h-4 w-4",
                    activeTab === "vehicles" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    activeTab === "vehicles" ? "text-primary" : "text-muted-foreground"
                  )}>Mevcut Araçlar</span>
                  {activeVehiclesCount !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5",
                        activeTab === "vehicles" 
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {activeVehiclesCount}
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={activeTab === "sold"}
                  onCheckedChange={(checked) => onActiveTabChange(checked ? "sold" : "vehicles")}
                  className="scale-110"
                />
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "sold" 
                    ? "bg-card shadow-sm text-primary" 
                    : "text-gray-600"
                )}>
                  <TrendingUp className={cn(
                    "h-4 w-4",
                    activeTab === "sold" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    activeTab === "sold" ? "text-primary" : "text-muted-foreground"
                  )}>Satılan Araçlar</span>
                  {soldVehiclesCount !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5",
                        activeTab === "sold" 
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {soldVehiclesCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Switch - Mobile (below other elements) */}
          {onActiveTabChange && (
            <div className="flex justify-center sm:hidden order-last w-full pt-2">
              <div className="flex items-center gap-4 px-4 py-2.5 bg-gradient-to-r from-muted/50 to-muted rounded-xl border border-border shadow-sm">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "vehicles" 
                    ? "bg-card shadow-sm text-primary" 
                    : "text-gray-600"
                )}>
                  <Car className={cn(
                    "h-4 w-4",
                    activeTab === "vehicles" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    activeTab === "vehicles" ? "text-primary" : "text-muted-foreground"
                  )}>Mevcut Araçlar</span>
                  {activeVehiclesCount !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5",
                        activeTab === "vehicles" 
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {activeVehiclesCount}
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={activeTab === "sold"}
                  onCheckedChange={(checked) => onActiveTabChange(checked ? "sold" : "vehicles")}
                  className="scale-110"
                />
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "sold" 
                    ? "bg-card shadow-sm text-primary" 
                    : "text-gray-600"
                )}>
                  <TrendingUp className={cn(
                    "h-4 w-4",
                    activeTab === "sold" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    activeTab === "sold" ? "text-primary" : "text-muted-foreground"
                  )}>Satılan Araçlar</span>
                  {soldVehiclesCount !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2 py-0.5",
                        activeTab === "sold" 
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {soldVehiclesCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-1 sm:justify-end">
            {/* View Toggle */}
            {onViewModeChange && viewMode !== undefined && (
              <div className="flex gap-1 border border-border rounded-xl p-1 bg-muted">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => onViewModeChange("grid")}
                  className={cn(
                    "h-9 w-9 rounded-lg transition-all",
                    viewMode === "grid" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => onViewModeChange("table")}
                  className={cn(
                    "h-9 w-9 rounded-lg transition-all",
                    viewMode === "table" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}

            {activeTab === "vehicles" && addVehicleButton}
          </div>
        </div>
      )}
    </div>
  );
};
