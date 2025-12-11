"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  MoreHorizontal,
  Plus,
  Download,
  Calendar,
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
} from "lucide-react"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

// Mock data for income & expense trend
const trendData = [
  { date: "01 Oca", gelir: 145000, gider: 68000 },
  { date: "08 Oca", gelir: 168000, gider: 72000 },
  { date: "15 Oca", gelir: 182000, gider: 78000 },
  { date: "22 Oca", gelir: 195000, gider: 81000 },
  { date: "29 Oca", gelir: 210000, gider: 85000 },
  { date: "05 Şub", gelir: 178000, gider: 75000 },
  { date: "12 Şub", gelir: 225000, gider: 92000 },
]

// Mock data for category breakdown
const categoryData = [
  { category: "Araç Satışları", value: 850000 },
  { category: "Servis Hizmetleri", value: 240000 },
  { category: "Yedek Parça", value: 125000 },
  { category: "Sigorta", value: 80000 },
  { category: "Finansman", value: 95000 },
]

// Mock data for income transactions
const incomeTransactions = [
  {
    id: 1,
    date: "15 Şub 2024",
    description: "Toyota Camry Satışı",
    category: "Araç Satışı",
    customer: "Ahmet Yılmaz",
    amount: 45000,
  },
  {
    id: 2,
    date: "14 Şub 2024",
    description: "Periyodik Bakım",
    category: "Servis",
    customer: "Mehmet Demir",
    amount: 2500,
  },
  {
    id: 3,
    date: "13 Şub 2024",
    description: "Yedek Parça Satışı",
    category: "Parça",
    customer: "Ayşe Kaya",
    amount: 1800,
  },
  {
    id: 4,
    date: "12 Şub 2024",
    description: "Ford F-150 Satışı",
    category: "Araç Satışı",
    customer: "Can Öztürk",
    amount: 52000,
  },
  {
    id: 5,
    date: "11 Şub 2024",
    description: "Kaporta Onarımı",
    category: "Servis",
    customer: "Zeynep Arslan",
    amount: 3200,
  },
]

// Mock data for expense transactions
const expenseTransactions = [
  {
    id: 1,
    date: "15 Şub 2024",
    description: "Personel Maaşları",
    category: "Personel",
    vehicle: "-",
    amount: 28000,
  },
  {
    id: 2,
    date: "14 Şub 2024",
    description: "Kira Ödemesi",
    category: "Kira",
    vehicle: "-",
    amount: 15000,
  },
  {
    id: 3,
    date: "13 Şub 2024",
    description: "Parça Alımı",
    category: "Stok",
    vehicle: "Toyota Camry",
    amount: 5400,
  },
  {
    id: 4,
    date: "12 Şub 2024",
    description: "Elektrik Faturası",
    category: "Fatura",
    vehicle: "-",
    amount: 2800,
  },
  {
    id: 5,
    date: "11 Şub 2024",
    description: "Araç Alımı",
    category: "Stok",
    vehicle: "Honda Civic",
    amount: 38000,
  },
]

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Araç Satışı":
      return <Car className="h-4 w-4" />
    case "Servis":
      return <Wrench className="h-4 w-4" />
    case "Parça":
      return <ShoppingCart className="h-4 w-4" />
    case "Personel":
      return <UsersIcon className="h-4 w-4" />
    case "Kira":
      return <Building className="h-4 w-4" />
    case "Stok":
      return <Receipt className="h-4 w-4" />
    case "Fatura":
      return <Zap className="h-4 w-4" />
    default:
      return <Receipt className="h-4 w-4" />
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Araç Satışı":
      return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "Servis":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "Parça":
      return "bg-purple-100 text-purple-700 border-purple-200"
    case "Personel":
      return "bg-orange-100 text-orange-700 border-orange-200"
    case "Kira":
      return "bg-red-100 text-red-700 border-red-200"
    case "Stok":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "Fatura":
      return "bg-yellow-100 text-yellow-700 border-yellow-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export function CashManagement() {
  const [dateFilter, setDateFilter] = useState("Son 30 Gün")

  return (
    <div className="space-y-6">
      {/* Global Date Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Son 7 Gün">Son 7 Gün</SelectItem>
              <SelectItem value="Son 30 Gün">Son 30 Gün</SelectItem>
              <SelectItem value="Son 3 Ay">Son 3 Ay</SelectItem>
              <SelectItem value="Son 6 Ay">Son 6 Ay</SelectItem>
              <SelectItem value="Bu Yıl">Bu Yıl</SelectItem>
              <SelectItem value="Özel Tarih">Özel Tarih</SelectItem>
            </SelectContent>
          </Select>
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
            <div className="text-2xl font-bold">₺1,390,000</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+12.5%</span>
              <span className="text-muted-foreground">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            <div className="rounded-xl bg-red-100 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺551,000</div>
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+8.3%</span>
              <span className="text-muted-foreground">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Gelir</CardTitle>
            <div className="rounded-xl bg-blue-100 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺839,000</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+15.2%</span>
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
            <div className="text-2xl font-bold">₺47,500</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span className="font-medium">+5.8%</span>
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
            <p className="text-sm text-muted-foreground">Son 7 haftalık gelir ve gider karşılaştırması</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                gelir: {
                  label: "Gelir",
                  color: "hsl(142, 76%, 36%)",
                },
                gider: {
                  label: "Gider",
                  color: "hsl(0, 84%, 60%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="gelir"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(142, 76%, 36%)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gider"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(0, 84%, 60%)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown - 33% width */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Kategori Analizi</CardTitle>
            <p className="text-sm text-muted-foreground">Gelir kategorilerine göre dağılım</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Tutar",
                  color: "hsl(217, 100%, 25%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                  <Bar dataKey="value" fill="hsl(217, 100%, 25%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
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
                <Button className="gap-2 rounded-xl" style={{ backgroundColor: "#003d82" }}>
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
                    {incomeTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1.5 ${getCategoryColor(transaction.category)}`}>
                            {getCategoryIcon(transaction.category)}
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.customer}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          ₺{transaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="expense" className="m-0">
            <CardContent className="pt-6">
              <div className="mb-4 flex justify-end">
                <Button className="gap-2 rounded-xl bg-red-600 hover:bg-red-700">
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
                    {expenseTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1.5 ${getCategoryColor(transaction.category)}`}>
                            {getCategoryIcon(transaction.category)}
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{transaction.vehicle}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          ₺{transaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
