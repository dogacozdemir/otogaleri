import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Search,
  Calendar,
  Filter,
  Edit,
  Trash2,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
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
} from "recharts";

interface IncomeItem {
  id: number;
  type: "vehicle_sale" | "manual";
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

interface YearlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

interface DateRangeData {
  date: string;
  income: number;
  expense: number;
  net_income: number;
}

const AccountingPage = () => {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [incomeList, setIncomeList] = useState<IncomeItem[]>([]);
  const [expensesList, setExpensesList] = useState<ExpenseItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [dateRangeData, setDateRangeData] = useState<DateRangeData[]>([]);
  const [incomePagination, setIncomePagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [expensesPagination, setExpensesPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [incomeSearch, setIncomeSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("all");
  const [dateFilterPeriod, setDateFilterPeriod] = useState<"7" | "30" | "90" | "all" | "custom">("30");
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

  useEffect(() => {
    fetchYearlyData();
    fetchDateRangeData();
  }, [dateFilterPeriod, selectedDateRange]);

  useEffect(() => {
    fetchIncomeList();
  }, [incomePagination.page, incomeSearch, dateFilterPeriod, selectedDateRange]);

  useEffect(() => {
    fetchExpensesList();
  }, [expensesPagination.page, expenseSearch, expenseCategory, dateFilterPeriod, selectedDateRange]);

  useEffect(() => {
    if (dateFilterPeriod === "all") {
      setSelectedDateRange({
        startDate: "2020-01-01",
        endDate: new Date().toISOString().split("T")[0],
      });
    } else if (dateFilterPeriod !== "custom") {
      const endDate = new Date();
      const startDate = new Date();
      const days = parseInt(dateFilterPeriod);
      startDate.setDate(endDate.getDate() - days);
      setSelectedDateRange({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
    }
  }, [dateFilterPeriod]);

  const fetchYearlyData = async () => {
    try {
      const response = await api.get("/accounting/yearly-income-expense");
      setYearlyData(response.data || []);
    } catch (error) {
      console.error("Yearly data error:", error);
    }
  };

  const fetchDateRangeData = async () => {
    try {
      const params: any = {};
      if (dateFilterPeriod !== "all") {
        params.startDate = selectedDateRange.startDate;
        params.endDate = selectedDateRange.endDate;
      }
      const response = await api.get("/accounting/date-range-income-expense", { params });
      setDateRangeData(response.data || []);
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
      };
      if (dateFilterPeriod !== "all") {
        params.startDate = selectedDateRange.startDate;
        params.endDate = selectedDateRange.endDate;
      }
      const response = await api.get("/accounting/income-list", { params });
      setIncomeList(response.data.incomes || []);
      setIncomePagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
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
      };
      if (dateFilterPeriod !== "all") {
        params.startDate = selectedDateRange.startDate;
        params.endDate = selectedDateRange.endDate;
      }
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
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const totalIncome = dateRangeData.reduce((sum, item) => sum + (Number(item.income) || 0), 0);
  const totalExpense = dateRangeData.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  const netIncome = totalIncome - totalExpense;

  const todayIncome = dateRangeData.length > 0
    ? dateRangeData[dateRangeData.length - 1]?.income || 0
    : 0;
  const todayExpense = dateRangeData.length > 0
    ? dateRangeData[dateRangeData.length - 1]?.expense || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Tarih Filtreleme */}
      <div className="pt-4">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-primary" />
            Tarih Filtreleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            {(["7", "30", "90", "all", "custom"] as const).map((period) => (
              <Button
                key={period}
                variant={dateFilterPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterPeriod(period)}
              >
                {period === "all" ? "Tüm Tarihler" : period === "custom" ? "Özel Tarih" : `Son ${period} Gün`}
              </Button>
            ))}
          </div>
          {dateFilterPeriod === "custom" && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Başlangıç:</span>
                <Input
                  type="date"
                  value={selectedDateRange.startDate}
                  onChange={(e) => setSelectedDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Bitiş:</span>
                <Input
                  type="date"
                  value={selectedDateRange.endDate}
                  onChange={(e) => setSelectedDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-40"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Toplam Gider</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500/10 to-red-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Net Gelir</p>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(netIncome)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Bugünkü Gelir</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(todayIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border rounded-xl p-1.5 shadow-sm h-auto mb-6">
          <TabsTrigger 
            value="overview"
            className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
          >
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger 
            value="income"
            className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
          >
            Gelirler
          </TabsTrigger>
          <TabsTrigger 
            value="expenses"
            className="flex items-center justify-center px-6 py-4 text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-colors duration-200 ease-in-out min-h-[3.5rem] data-[state=active]:bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-muted/70"
          >
            Giderler
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                Gelir ve Gider Trendi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {dateRangeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400} minHeight={400}>
                    <LineChart data={dateRangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      />
                      <YAxis tickFormatter={(value) => `${value}₺`} />
                      <Tooltip
                        formatter={(value: any) => formatCurrency(value)}
                        labelFormatter={(value) => formatDate(value)}
                      />
                      <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Gelir" />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Gider" />
                      <Line type="monotone" dataKey="net_income" stroke="#3b82f6" strokeWidth={2} name="Net Gelir" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Veri bulunamadı
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                Yıllık Gelir-Gider Analizi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {yearlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400} minHeight={400}>
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(value) => new Date(value + "-01").toLocaleDateString("tr-TR", { month: "short" })} />
                      <YAxis tickFormatter={(value) => `${value}₺`} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="income" fill="#22c55e" name="Gelir" />
                      <Bar dataKey="expense" fill="#ef4444" name="Gider" />
                      <Bar dataKey="profit" fill="#3b82f6" name="Kar" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Veri bulunamadı
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Gelir Listesi
                </CardTitle>
                <Button onClick={() => {
                  setEditingIncome(null);
                  setIncomeForm({ description: "", category: "", amount: "", currency: "TRY", income_date: new Date().toISOString().split("T")[0] });
                  setIncomeModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Gelir Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Gelir ara..."
                    value={incomeSearch}
                    onChange={(e) => {
                      setIncomeSearch(e.target.value);
                      setIncomePagination({ ...incomePagination, page: 1 });
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Tarih</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Açıklama</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Kategori</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Müşteri</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Tutar</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Gelir kaydı bulunamadı
                        </td>
                      </tr>
                    ) : (
                      incomeList.map((income) => (
                        <tr key={income.id} className="border-b hover:bg-muted/30">
                          <td className="p-4">{formatDate(income.date)}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {income.type === "vehicle_sale" && <Car className="w-4 h-4 text-primary" />}
                              <span>{income.description}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{income.category}</Badge>
                          </td>
                          <td className="p-4">{income.customer_name || "-"}</td>
                          <td className="p-4 text-right font-semibold text-green-600">{formatCurrency(income.amount_base)}</td>
                          <td className="p-4">
                            {income.type === "manual" && (
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingIncome(income);
                                    setIncomeForm({
                                      description: income.description,
                                      category: income.category,
                                      amount: income.amount.toString(),
                                      currency: income.currency,
                                      income_date: income.income_date,
                                    });
                                    setIncomeModalOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteIncome(income.id)}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                  Gider Listesi
                </CardTitle>
                <Button onClick={() => {
                  setEditingExpense(null);
                  setExpenseForm({ description: "", category: "", amount: "", currency: "TRY", expense_date: new Date().toISOString().split("T")[0] });
                  setExpenseModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Gider Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Gider ara..."
                    value={expenseSearch}
                    onChange={(e) => {
                      setExpenseSearch(e.target.value);
                      setExpensesPagination({ ...expensesPagination, page: 1 });
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={expenseCategory} onValueChange={(value) => {
                  setExpenseCategory(value);
                  setExpensesPagination({ ...expensesPagination, page: 1 });
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    <SelectItem value="Other">Diğer</SelectItem>
                    <SelectItem value="Rent">Kira</SelectItem>
                    <SelectItem value="Utilities">Faturalar</SelectItem>
                    <SelectItem value="Salary">Maaş</SelectItem>
                    <SelectItem value="Marketing">Pazarlama</SelectItem>
                    <SelectItem value="Maintenance">Bakım</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Tarih</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Açıklama</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Kategori</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Araç</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Tutar</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Gider kaydı bulunamadı
                        </td>
                      </tr>
                    ) : (
                      expensesList.map((expense) => (
                        <tr key={expense.id} className="border-b hover:bg-muted/30">
                          <td className="p-4">{formatDate(expense.expense_date)}</td>
                          <td className="p-4">{expense.description}</td>
                          <td className="p-4">
                            <Badge variant="secondary">{expense.category}</Badge>
                          </td>
                          <td className="p-4">
                            {expense.maker && expense.model ? `${expense.maker} ${expense.model}` : "-"}
                          </td>
                          <td className="p-4 text-right font-semibold text-red-600">{formatCurrency(expense.amount_base)}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setExpenseForm({
                                    description: expense.description,
                                    category: expense.category,
                                    amount: expense.amount.toString(),
                                    currency: expense.currency,
                                    expense_date: expense.expense_date,
                                  });
                                  setExpenseModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteExpense(expense.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
          </Card>
        </TabsContent>
      </Tabs>

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

