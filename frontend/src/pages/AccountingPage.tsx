import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  Download,
  Receipt,
  ShoppingCart,
  Wrench,
  Building,
  UsersIcon,
  Zap,
  Car,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface IncomeItem {
  id: number;
  type: "vehicle_sale" | "manual" | "inventory_sale" | "service_sale";
  date: string;
  income_date: string;
  amount: number;
  amount_base: number;
  description: string;
  category: string;
  customer_name?: string | null;
  staff_name?: string | null;
  branch_name?: string | null;
  currency: string;
  fx_rate_to_base?: number;
  transaction_date?: string;
  custom_rate?: number | null;
}

interface ExpenseItem {
  id: number;
  expense_date: string;
  amount: number;
  amount_base: number;
  description: string;
  category: string;
  branch_name?: string | null;
  maker?: string | null;
  model?: string | null;
  currency: string;
}

interface DateRangeData {
  date: string;
  income: number;
  expense: number;
  net_income: number;
}

// Helper functions for category icons and colors
const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes("araç") || cat.includes("vehicle") || cat.includes("satış")) {
    return <Car className="h-4 w-4" />;
  }
  if (cat.includes("servis") || cat.includes("service") || cat.includes("bakım")) {
    return <Wrench className="h-4 w-4" />;
  }
  if (cat.includes("parça") || cat.includes("part")) {
    return <ShoppingCart className="h-4 w-4" />;
  }
  if (cat.includes("personel") || cat.includes("salary") || cat.includes("maaş")) {
    return <UsersIcon className="h-4 w-4" />;
  }
  if (cat.includes("kira") || cat.includes("rent")) {
    return <Building className="h-4 w-4" />;
  }
  if (cat.includes("stok") || cat.includes("stock")) {
    return <Receipt className="h-4 w-4" />;
  }
  if (cat.includes("fatura") || cat.includes("utilities")) {
    return <Zap className="h-4 w-4" />;
  }
  return <Receipt className="h-4 w-4" />;
};

const getCategoryColor = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes("araç") || cat.includes("vehicle") || cat.includes("satış")) {
    return "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  }
  if (cat.includes("servis") || cat.includes("service") || cat.includes("bakım")) {
    return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
  if (cat.includes("parça") || cat.includes("part")) {
    return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  }
  if (cat.includes("personel") || cat.includes("salary") || cat.includes("maaş")) {
    return "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
  }
  if (cat.includes("kira") || cat.includes("rent")) {
    return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  }
  if (cat.includes("stok") || cat.includes("stock")) {
    return "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  }
  if (cat.includes("fatura") || cat.includes("utilities")) {
    return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
  }
  return "bg-muted text-muted-foreground border-border";
};

const AccountingPage = () => {
  const { toast } = useToast();
  const { formatCurrency, formatCurrencyWithCurrency } = useCurrency();
  const { tenant } = useTenant();
  const targetCurrency = tenant?.default_currency || "TRY";
  const [incomeList, setIncomeList] = useState<IncomeItem[]>([]);
  const [incomeListConverted, setIncomeListConverted] = useState<Map<number, number>>(new Map());
  const [expensesList, setExpensesList] = useState<ExpenseItem[]>([]);
  const [dateRangeData, setDateRangeData] = useState<DateRangeData[]>([]);
  const [totalConvertedIncome, setTotalConvertedIncome] = useState<number>(0);
  const [totalConvertedExpense, setTotalConvertedExpense] = useState<number>(0);
  const [incomePagination, setIncomePagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [expensesPagination, setExpensesPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [incomeSearch, setIncomeSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("all");
  const [dateFilterPeriod, setDateFilterPeriod] = useState<string>("Son 30 Gün");
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    description: "",
    category: "",
    amount: "",
    currency: "TRY",
    income_date: new Date().toISOString().split("T")[0],
  });
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "",
    amount: "",
    currency: "TRY",
    expense_date: new Date().toISOString().split("T")[0],
  });

  // Convert date filter period to days
  useEffect(() => {
    let days = 30;
    if (dateFilterPeriod === "Son 7 Gün") days = 7;
    else if (dateFilterPeriod === "Son 30 Gün") days = 30;
    else if (dateFilterPeriod === "Son 3 Ay") days = 90;
    else if (dateFilterPeriod === "Son 6 Ay") days = 180;
    else if (dateFilterPeriod === "Bu Yıl") {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      setSelectedDateRange({
        startDate: startOfYear.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      });
      return;
    } else if (dateFilterPeriod === "Özel Tarih") {
      return; // Don't auto-update for custom dates
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    setSelectedDateRange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  }, [dateFilterPeriod]);

  useEffect(() => {
    fetchDateRangeData();
  }, [selectedDateRange, targetCurrency]);

  useEffect(() => {
    fetchIncomeList();
  }, [incomePagination.page, incomeSearch, selectedDateRange, targetCurrency]);

  useEffect(() => {
    fetchExpensesList();
  }, [expensesPagination.page, expenseSearch, expenseCategory, selectedDateRange]);

  const fetchDateRangeData = async () => {
    try {
      // First get raw date range data
      const params: any = {
        startDate: selectedDateRange.startDate,
        endDate: selectedDateRange.endDate,
      };
      const response = await api.get("/accounting/date-range-income-expense", { params });
      const rawData = response.data || [];
      
      // Then convert incomes to target currency
      try {
        const convertResponse = await api.post("/accounting/convert-incomes", {
          target_currency: targetCurrency,
          startDate: selectedDateRange.startDate,
          endDate: selectedDateRange.endDate,
        });
        
        // Group converted amounts by date
        const convertedByDate = new Map<string, number>();
        if (convertResponse.data.conversion_details && Array.isArray(convertResponse.data.conversion_details)) {
          convertResponse.data.conversion_details.forEach((detail: any) => {
            // Handle different date formats
            let dateStr = detail.transaction_date;
            if (dateStr) {
              // If it's a full datetime string, extract just the date part
              if (dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
              }
              // Normalize date format (YYYY-MM-DD)
              const date = new Date(dateStr).toISOString().split('T')[0];
              convertedByDate.set(date, (convertedByDate.get(date) || 0) + (Number(detail.converted_amount) || 0));
            }
          });
        }
        
        // Update dateRangeData with converted income values
        const updatedData = rawData.map((item: DateRangeData) => {
          // Normalize date format for matching
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          const convertedIncome = convertedByDate.get(itemDate) || 0;
          return {
            ...item,
            income: convertedIncome,
            net_income: convertedIncome - (Number(item.expense) || 0)
          };
        });
        
        setDateRangeData(updatedData);
        
        // Store total_converted for direct use
        if (convertResponse.data.total_converted !== undefined) {
          setTotalConvertedIncome(Number(convertResponse.data.total_converted) || 0);
        }
      } catch (convertError) {
        console.error("Convert incomes error:", convertError);
        // Fallback to original data if conversion fails
        setDateRangeData(rawData);
      }
      
      // Also convert expenses to target currency
      try {
        const convertExpenseResponse = await api.post("/accounting/convert-expenses", {
          target_currency: targetCurrency,
          startDate: selectedDateRange.startDate,
          endDate: selectedDateRange.endDate,
        });
        
        if (convertExpenseResponse.data.total_converted !== undefined) {
          setTotalConvertedExpense(Number(convertExpenseResponse.data.total_converted) || 0);
        }
      } catch (convertExpenseError) {
        console.error("Convert expenses error:", convertExpenseError);
        // Fallback: use dateRangeData expense
      }
    } catch (error) {
      console.error("Date range data error:", error);
    }
  };

  const fetchIncomeList = async () => {
    try {
      const params: any = {
        page: incomePagination.page,
        limit: 10,
        search: incomeSearch,
        startDate: selectedDateRange.startDate,
        endDate: selectedDateRange.endDate,
      };
      const response = await api.get("/accounting/income-list", { params });
      const incomes = response.data.incomes || [];
      setIncomeList(incomes);
      setIncomePagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
      
      // Convert incomes to target currency for category breakdown
      if (incomes.length > 0) {
        try {
          const convertResponse = await api.post("/accounting/convert-incomes", {
            target_currency: targetCurrency,
            startDate: selectedDateRange.startDate,
            endDate: selectedDateRange.endDate,
          });
          
          // Create a map of income ID to converted amount
          const convertedMap = new Map<number, number>();
          if (convertResponse.data.conversion_details && Array.isArray(convertResponse.data.conversion_details)) {
            convertResponse.data.conversion_details.forEach((detail: any) => {
              if (detail.id) {
                convertedMap.set(detail.id, Number(detail.converted_amount) || 0);
              }
            });
          }
          
          setIncomeListConverted(convertedMap);
        } catch (convertError) {
          console.error("Failed to convert income list for category breakdown:", convertError);
          setIncomeListConverted(new Map());
        }
      } else {
        setIncomeListConverted(new Map());
      }
    } catch (error) {
      console.error("Income list error:", error);
      toast({ title: "Hata", description: "Gelir listesi alınamadı", variant: "destructive" });
    }
  };

  const fetchExpensesList = async () => {
    try {
      const params: any = {
        page: expensesPagination.page,
        limit: 10,
        search: expenseSearch,
        category: expenseCategory,
        startDate: selectedDateRange.startDate,
        endDate: selectedDateRange.endDate,
      };
      const response = await api.get("/accounting/expenses-list", { params });
      setExpensesList(response.data.expenses || []);
      setExpensesPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      console.error("Expenses list error:", error);
      toast({ title: "Hata", description: "Gider listesi alınamadı", variant: "destructive" });
    }
  };

  const handleAddIncome = async () => {
    if (!incomeForm.description || !incomeForm.amount || !incomeForm.income_date) {
      toast({ title: "Uyarı", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }
    try {
      if (editingIncome) {
        await api.put(`/accounting/income/${editingIncome.id}`, incomeForm);
        toast({ title: "Başarılı", description: "Gelir güncellendi" });
      } else {
        await api.post("/accounting/income", incomeForm);
        toast({ title: "Başarılı", description: "Gelir eklendi" });
      }
      setIncomeModalOpen(false);
      setEditingIncome(null);
      setIncomeForm({ description: "", category: "", amount: "", currency: "TRY", income_date: new Date().toISOString().split("T")[0] });
      fetchIncomeList();
      fetchDateRangeData();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Gelir eklenemedi",
        variant: "destructive",
      });
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.expense_date) {
      toast({ title: "Uyarı", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }
    try {
      if (editingExpense) {
        await api.put(`/accounting/expenses/${editingExpense.id}`, expenseForm);
        toast({ title: "Başarılı", description: "Gider güncellendi" });
      } else {
        await api.post("/accounting/expenses", expenseForm);
        toast({ title: "Başarılı", description: "Gider eklendi" });
      }
      setExpenseModalOpen(false);
      setEditingExpense(null);
      setExpenseForm({ description: "", category: "", amount: "", currency: "TRY", expense_date: new Date().toISOString().split("T")[0] });
      fetchExpensesList();
      fetchDateRangeData();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Gider eklenemedi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!confirm("Bu geliri silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/accounting/income/${id}`);
      toast({ title: "Başarılı", description: "Gelir silindi" });
      fetchIncomeList();
      fetchDateRangeData();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Gelir silinemedi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Bu gideri silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/accounting/expenses/${id}`);
      toast({ title: "Başarılı", description: "Gider silindi" });
      fetchExpensesList();
      fetchDateRangeData();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Gider silinemedi",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  // Calculate KPIs
  // Use totalConvertedIncome if available (from convert-incomes endpoint), otherwise use dateRangeData or incomeList
  const totalIncome = useMemo(() => {
    if (totalConvertedIncome > 0) {
      return totalConvertedIncome;
    }
    if (dateRangeData.length > 0) {
      const sum = dateRangeData.reduce((sum, item) => sum + (Number(item.income) || 0), 0);
      if (sum > 0) return sum;
    }
    // Fallback to incomeList
    return incomeList.reduce((sum, item) => sum + (Number(item.amount_base) || 0), 0);
  }, [totalConvertedIncome, dateRangeData, incomeList]);
  
  // Calculate total expense - use converted expense if available
  const totalExpense = useMemo(() => {
    if (totalConvertedExpense > 0) {
      return totalConvertedExpense;
    }
    // Fallback to dateRangeData
    return dateRangeData.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  }, [totalConvertedExpense, dateRangeData]);
  
  const netIncome = totalIncome - totalExpense;

  // Get today's income from converted data
  const todayIncome = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayData = dateRangeData.find((item) => {
      const itemDate = new Date(item.date).toISOString().split("T")[0];
      return itemDate === today;
    });
    return todayData?.income || 0;
  }, [dateRangeData]);

  // Calculate previous period for comparison
  const previousPeriodDays = dateFilterPeriod === "Son 7 Gün" ? 7 : dateFilterPeriod === "Son 30 Gün" ? 30 : 90;
  const previousStartDate = new Date(selectedDateRange.startDate);
  previousStartDate.setDate(previousStartDate.getDate() - previousPeriodDays);
  const previousEndDate = new Date(selectedDateRange.startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);

  // For trend calculation, we'll use a simple approach
  const incomeChange = 0; // Would need to fetch previous period data
  const expenseChange = 0;
  const netIncomeChange = 0;
  const todayIncomeChange = 0;

  // Prepare chart data - format dates for display
  const trendData = dateRangeData.map((item) => ({
    date: new Date(item.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    gelir: Number(item.income) || 0,
    gider: Number(item.expense) || 0,
  }));

  // Calculate category breakdown from income list (using converted amounts)
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    incomeList.forEach((income) => {
      const category = income.category || "Diğer";
      const current = categoryMap.get(category) || 0;
      // Use converted amount if available, otherwise fallback to amount_base
      const amount = incomeListConverted.get(income.id) ?? (Number(income.amount_base) || 0);
      categoryMap.set(category, current + amount);
    });
    return Array.from(categoryMap.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [incomeList, incomeListConverted]);

  return (
    <div className="space-y-6">
      {/* Global Date Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select 
            value={dateFilterPeriod} 
            onValueChange={setDateFilterPeriod}
            onOpenChange={(open) => {
              if (open) {
                // Prevent page scroll when dropdown opens
                const scrollY = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollY}px`;
                document.body.style.width = '100%';
              } else {
                // Restore scroll position when dropdown closes
                const scrollY = document.body.style.top;
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                if (scrollY) {
                  window.scrollTo(0, parseInt(scrollY || '0') * -1);
                }
              }
            }}
          >
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent 
              position="popper"
              sideOffset={4}
            >
              <SelectItem value="Son 7 Gün">Son 7 Gün</SelectItem>
              <SelectItem value="Son 30 Gün">Son 30 Gün</SelectItem>
              <SelectItem value="Son 3 Ay">Son 3 Ay</SelectItem>
              <SelectItem value="Son 6 Ay">Son 6 Ay</SelectItem>
              <SelectItem value="Bu Yıl">Bu Yıl</SelectItem>
              <SelectItem value="Özel Tarih">Özel Tarih</SelectItem>
            </SelectContent>
          </Select>
          {dateFilterPeriod === "Özel Tarih" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDateRange.startDate}
                onChange={(e) => setSelectedDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-40 rounded-xl"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                type="date"
                value={selectedDateRange.endDate}
                onChange={(e) => setSelectedDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-40 rounded-xl"
              />
            </div>
          )}
        </div>

        <Button variant="outline" className="gap-2 rounded-xl bg-transparent">
          <Download className="h-4 w-4" />
          Rapor İndir
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <div className="rounded-xl bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+{incomeChange.toFixed(1)}%</span>
              <span className="text-muted-foreground">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            <div className="rounded-xl bg-red-100 dark:bg-red-900/20 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpense)}</div>
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+{expenseChange.toFixed(1)}%</span>
              <span className="text-muted-foreground">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Gelir</CardTitle>
            <div className="rounded-xl bg-blue-100 dark:bg-blue-900/20 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netIncome)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+{netIncomeChange.toFixed(1)}%</span>
              <span className="text-muted-foreground">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugünkü Gelir</CardTitle>
            <div className="rounded-xl bg-amber-100 p-2">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayIncome)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+{todayIncomeChange.toFixed(1)}%</span>
              <span className="text-muted-foreground">dün'e göre</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - 2 Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income & Expense Trend - 66% width */}
        <Card className="rounded-2xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Gelir ve Gider Trendi</CardTitle>
            <p className="text-sm text-muted-foreground">Son {dateFilterPeriod.toLowerCase()} gelir ve gider karşılaştırması</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(value) => value}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="gelir"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(142, 76%, 36%)", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Gelir"
                />
                <Line
                  type="monotone"
                  dataKey="gider"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(0, 84%, 60%)", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Gider"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown - 33% width */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Kategori Analizi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.length > 0 ? (
                categoryData.map((item, index) => (
                  <div key={`${item.category}-${index}`} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {index + 1}
                        </span>
                        {item.category}
                      </span>
                      <span className="font-bold text-green-600">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                        style={{
                          width: `${categoryData[0]?.value > 0 ? (item.value / categoryData[0].value) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">Veri bulunamadı</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Lists with Tabs */}
      <Card className="rounded-2xl shadow-sm">
        <Tabs defaultValue="income" className="w-full">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <TabsList className="h-auto gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="income"
                  className="rounded-xl border-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Gelir Listesi
                </TabsTrigger>
                <TabsTrigger
                  value="expense"
                  className="rounded-xl border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Gider Listesi
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <TabsContent value="income" className="m-0">
            <CardContent className="pt-6">
              <div className="mb-4 flex justify-end">
                <Button className="gap-2 rounded-xl" style={{ backgroundColor: "#003d82" }} onClick={() => {
                  setEditingIncome(null);
                  setIncomeForm({ description: "", category: "", amount: "", currency: "TRY", income_date: new Date().toISOString().split("T")[0] });
                  setIncomeModalOpen(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Gelir Ekle
                </Button>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-center">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Gelir kaydı bulunamadı
                        </TableCell>
                      </TableRow>
                    ) : (
                      incomeList.map((transaction, idx) => (
                        <TableRow key={`${transaction.type}-${transaction.id}-${idx}`}>
                          <TableCell className="font-medium">{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${getCategoryColor(transaction.category)}`}>
                              {getCategoryIcon(transaction.category)}
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.customer_name || "-"}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrencyWithCurrency(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            {transaction.type === "manual" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingIncome(transaction);
                                      setIncomeForm({
                                        description: transaction.description,
                                        category: transaction.category,
                                        amount: transaction.amount.toString(),
                                        currency: transaction.currency,
                                        income_date: transaction.income_date,
                                      });
                                      setIncomeModalOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Düzenle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteIncome(transaction.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Sil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {incomePagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Sayfa {incomePagination.page} / {incomePagination.totalPages} (Toplam: {incomePagination.total})
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incomePagination.page === 1}
                      onClick={() => setIncomePagination({ ...incomePagination, page: incomePagination.page - 1 })}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incomePagination.page === incomePagination.totalPages}
                      onClick={() => setIncomePagination({ ...incomePagination, page: incomePagination.page + 1 })}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="expense" className="m-0">
            <CardContent className="pt-6">
              <div className="mb-4 flex justify-end">
                <Button className="gap-2 rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => {
                  setEditingExpense(null);
                  setExpenseForm({ description: "", category: "", amount: "", currency: "TRY", expense_date: new Date().toISOString().split("T")[0] });
                  setExpenseModalOpen(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Gider Ekle
                </Button>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Araç</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-center">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Gider kaydı bulunamadı
                        </TableCell>
                      </TableRow>
                    ) : (
                      expensesList.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{formatDate(transaction.expense_date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${getCategoryColor(transaction.category)}`}>
                              {getCategoryIcon(transaction.category)}
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {transaction.maker && transaction.model ? `${transaction.maker} ${transaction.model}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrencyWithCurrency(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingExpense(transaction);
                                    setExpenseForm({
                                      description: transaction.description,
                                      category: transaction.category,
                                      amount: transaction.amount.toString(),
                                      currency: transaction.currency,
                                      expense_date: transaction.expense_date,
                                    });
                                    setExpenseModalOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteExpense(transaction.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {expensesPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Sayfa {expensesPagination.page} / {expensesPagination.totalPages} (Toplam: {expensesPagination.total})
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={expensesPagination.page === 1}
                      onClick={() => setExpensesPagination({ ...expensesPagination, page: expensesPagination.page - 1 })}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={expensesPagination.page === expensesPagination.totalPages}
                      onClick={() => setExpensesPagination({ ...expensesPagination, page: expensesPagination.page + 1 })}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Income Modal */}
      <Dialog open={incomeModalOpen} onOpenChange={setIncomeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIncome ? "Gelir Düzenle" : "Yeni Gelir Ekle"}</DialogTitle>
            <DialogDescription>Gelir bilgilerini giriniz</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Açıklama *</label>
              <Input
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                placeholder="Gelir açıklaması"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori *</label>
              <Input
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                placeholder="Kategori (örn: Diğer, Hizmet, vb.)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tutar *</label>
              <Input
                type="number"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                placeholder="Tutar"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Para Birimi</label>
              <Select value={incomeForm.currency} onValueChange={(value) => setIncomeForm({ ...incomeForm, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tarih *</label>
              <Input
                type="date"
                value={incomeForm.income_date}
                onChange={(e) => setIncomeForm({ ...incomeForm, income_date: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIncomeModalOpen(false);
                setEditingIncome(null);
              }}>
                İptal
              </Button>
              <Button onClick={handleAddIncome}>{editingIncome ? "Güncelle" : "Ekle"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Modal */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Gider Düzenle" : "Yeni Gider Ekle"}</DialogTitle>
            <DialogDescription>Gider bilgilerini giriniz</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Açıklama *</label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Gider açıklaması"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori *</label>
              <Input
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                placeholder="Kategori (örn: Kira, Maaş, Bakım, vb.)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tutar *</label>
              <Input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="Tutar"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Para Birimi</label>
              <Select value={expenseForm.currency} onValueChange={(value) => setExpenseForm({ ...expenseForm, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tarih *</label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setExpenseModalOpen(false);
                setEditingExpense(null);
              }}>
                İptal
              </Button>
              <Button onClick={handleAddExpense}>{editingExpense ? "Güncelle" : "Ekle"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountingPage;
