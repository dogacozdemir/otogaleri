import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Car,
  Users, 
  UserCheck, 
  Building2,
  Clock,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/api";

interface SearchResult {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  address?: string;
  maker?: string;
  model?: string;
  year?: number;
  chassis_no?: string;
  type: 'vehicle' | 'customer' | 'staff' | 'branch';
  url: string;
}

interface SearchResults {
  vehicles: SearchResult[];
  customers: SearchResult[];
  staff: SearchResult[];
  branches: SearchResult[];
  total: number;
}

interface GlobalSearchProps {
  className?: string;
  iconOnly?: boolean;
}

const GlobalSearch = ({ className, iconOnly = false }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    vehicles: [],
    customers: [],
    staff: [],
    branches: [],
    total: 0
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{suggestion: string, type: string}>>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const navigate = useNavigate();

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto focus when opened
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) return;
    
    const trimmed = searchTerm.trim();
    setRecentSearches(prev => {
      // Remove if exists and add to beginning
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5); // Keep only last 5
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const response = await api.get(`/search/suggestions?query=${encodeURIComponent(searchQuery)}`);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Suggestions fetch error:', error);
      setSuggestions([]);
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({
        vehicles: [],
        customers: [],
        staff: [],
        branches: [],
        total: 0
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`/search?query=${encodeURIComponent(searchQuery)}&limit=10`);
      setResults(response.data);
      // Save to recent searches if results found
      if (response.data.total > 0) {
        saveRecentSearch(searchQuery);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({
        vehicles: [],
        customers: [],
        staff: [],
        branches: [],
        total: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search
    debounceRef.current = window.setTimeout(() => {
      if (value.length >= 2) {
        performSearch(value);
        fetchSuggestions(value);
      } else {
        setResults({
          vehicles: [],
          customers: [],
          staff: [],
          branches: [],
          total: 0
        });
        setSuggestions([]);
      }
    }, 300);
  };

  const handleResultClick = (result: SearchResult) => {
    // URL'yi parse et ve navigate et
    if (result.url.includes('/vehicles/')) {
      const vehicleId = result.url.split('/vehicles/')[1];
      navigate(`/vehicles`, { state: { selectedVehicleId: vehicleId } });
    } else {
      navigate(result.url);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleInputChange(suggestion);
  };

  const clearSearch = () => {
    setQuery("");
    setResults({
      vehicles: [],
      customers: [],
      staff: [],
      branches: [],
      total: 0
    });
    setSuggestions([]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'customer': return <Users className="w-4 h-4" />;
      case 'staff': return <UserCheck className="w-4 h-4" />;
      case 'branch': return <Building2 className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vehicle': return 'bg-primary/20 text-primary';
      case 'customer': return 'bg-success/20 text-success';
      case 'staff': return 'bg-chart-5/20 text-chart-5';
      case 'branch': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'vehicle': return 'Araç';
      case 'customer': return 'Müşteri';
      case 'staff': return 'Personel';
      case 'branch': return 'Şube';
      default: return type;
    }
  };

  const formatResult = (result: SearchResult) => {
    switch (result.type) {
      case 'vehicle':
        return {
          title: `${result.maker || ''} ${result.model || ''} ${result.year || ''}`.trim() || 'İsimsiz Araç',
          subtitle: result.chassis_no || '',
        };
      case 'customer':
        return {
          title: result.name || 'İsimsiz',
          subtitle: result.email || result.phone || '',
        };
      case 'staff':
        return {
          title: result.name || 'İsimsiz',
          subtitle: result.role || result.email || result.phone || '',
        };
      case 'branch':
        return {
          title: result.name || 'İsimsiz',
          subtitle: result.address || result.phone || '',
        };
      default:
        return { title: 'Bilinmeyen', subtitle: '' };
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant={iconOnly ? "ghost" : "outline"}
        size={iconOnly ? "icon" : "default"}
        className={`${iconOnly ? 'h-9 w-9' : 'relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12'} ${className}`}
        onClick={() => setIsOpen(true)}
        aria-label="Ara"
      >
        <Search className={iconOnly ? "h-5 w-5" : "mr-2 h-4 w-4"} />
        {!iconOnly && (
          <>
            <span className="hidden lg:inline-flex">Ara...</span>
            <span className="inline-flex lg:hidden">Ara</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </>
        )}
      </Button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">Global Arama</DialogTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                ref={searchRef}
                placeholder="Araç, müşteri, personel, şube ara..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pl-10 pr-10 h-12 text-base border-0 focus:ring-0 shadow-none"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto px-4 pb-4">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Aranıyor...</span>
              </div>
            )}

            {/* No Query - Show Recent/Suggestions */}
            {!query && !isLoading && (
              <div className="space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Son Aramalar
                    </h3>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-sm h-8"
                          onClick={() => handleSuggestionClick(search)}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          {search}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {recentSearches.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Arama yapmak için yazmaya başlayın
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Araç, müşteri, personel veya şube arayabilirsiniz
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Query but no results */}
            {query && !isLoading && results.total === 0 && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  "{query}" için sonuç bulunamadı
                </p>
              </div>
            )}

            {/* Suggestions */}
            {query && suggestions.length > 0 && results.total === 0 && !isLoading && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Öneriler</h3>
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => handleSuggestionClick(suggestion.suggestion)}
                  >
                    {getTypeIcon(suggestion.type)}
                    <span className="ml-2">{suggestion.suggestion}</span>
                    <Badge variant="outline" className={`ml-auto text-xs ${getTypeColor(suggestion.type)}`}>
                      {getTypeName(suggestion.type)}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {results.total > 0 && !isLoading && (
              <div className="space-y-4">
                {/* Results by category */}
                {Object.entries(results).map(([category, items]) => {
                  if (category === 'total' || !Array.isArray(items) || items.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        {getTypeIcon(category)}
                        <span className="ml-2">{getTypeName(category)}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {items.length}
                        </Badge>
                      </h3>
                      <div className="space-y-1">
                        {items.map((result) => {
                          const formatted = formatResult(result);
                          return (
                            <Button
                              key={`${result.type}-${result.id}`}
                              variant="ghost"
                              className="w-full justify-start text-sm h-auto p-3 hover:bg-accent"
                              onClick={() => handleResultClick(result)}
                            >
                              <div className="flex items-center w-full">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(result.type)} mr-3`}>
                                  {getTypeIcon(result.type)}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className="font-medium truncate">{formatted.title}</p>
                                  {formatted.subtitle && (
                                    <p className="text-xs text-muted-foreground truncate">{formatted.subtitle}</p>
                                  )}
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
