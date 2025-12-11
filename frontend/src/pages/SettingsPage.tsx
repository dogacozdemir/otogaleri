import { useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Building2, Phone, MapPin, DollarSign, Globe, Shield, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/api";

const currencies = [
  { value: "TRY", label: "Türk Lirası (TRY)" },
  { value: "USD", label: "Amerikan Doları (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "İngiliz Sterlini (GBP)" },
  { value: "JPY", label: "Japon Yeni (JPY)" },
];

const languages = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
];

interface ACLPermission {
  id?: number;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

export default function SettingsPage() {
  const { tenant, loading, updateTenant, refreshTenant } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [aclPermissions, setAclPermissions] = useState<ACLPermission[]>([]);
  const [aclLoading, setAclLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    default_currency: "TRY",
    language: "tr",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || "",
        phone: tenant.phone || "",
        address: tenant.address || "",
        city: tenant.city || "",
        default_currency: tenant.default_currency || "TRY",
        language: tenant.language || "tr",
      });
    }
  }, [tenant]);

  useEffect(() => {
    if (activeTab === "acl") {
      fetchACLPermissions();
    }
  }, [activeTab]);

  const fetchACLPermissions = async () => {
    setAclLoading(true);
    try {
      const response = await api.get("/acl");
      setAclPermissions(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch ACL permissions:", error);
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Yetkiler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setAclLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      await api.post("/acl/initialize");
      toast({
        title: "Başarılı",
        description: "Varsayılan yetkiler oluşturuldu",
      });
      fetchACLPermissions();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Varsayılan yetkiler oluşturulamadı",
        variant: "destructive",
      });
    }
  };

  const handleTogglePermission = async (permission: ACLPermission) => {
    try {
      await api.post("/acl", {
        role: permission.role,
        resource: permission.resource,
        action: permission.action,
        allowed: !permission.allowed,
      });
      toast({
        title: "Başarılı",
        description: "Yetki güncellendi",
      });
      fetchACLPermissions();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Yetki güncellenemedi",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTenant(form);
      await refreshTenant();
      toast({
        title: "Başarılı",
        description: "Ayarlar kaydedildi",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error?.response?.data?.error || "Ayarlar kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Group permissions by role and resource
  const groupedPermissions: Record<string, Record<string, ACLPermission[]>> = {};
  aclPermissions.forEach((perm) => {
    if (!groupedPermissions[perm.role]) {
      groupedPermissions[perm.role] = {};
    }
    if (!groupedPermissions[perm.role][perm.resource]) {
      groupedPermissions[perm.role][perm.resource] = [];
    }
    groupedPermissions[perm.role][perm.resource].push(perm);
  });

  const roles = ["manager", "sales", "accounting", "other"];
  const resources = ["vehicles", "customers", "staff", "analytics", "reports", "settings", "acl"];
  const actions = ["view", "create", "update", "delete", "sell"];

  const getPermission = (role: string, resource: string, action: string): ACLPermission | null => {
    return aclPermissions.find(
      (p) => p.role === role && p.resource === resource && p.action === action
    ) || null;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="general" className="rounded-xl">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="acl" className="rounded-xl">Yetki Yönetimi</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={handleSubmit}>
            <div className="pt-4">
              <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Galeri Bilgileri
            </CardTitle>
            <CardDescription>Galeri adı ve iletişim bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Galeri Adı *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Galeri adını girin"
                  required
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Bu isim header ve sidebar'da görünecektir
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon Numarası
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+90 555 123 4567"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Şehir
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="İstanbul"
                  className="mt-2"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adres
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Açık adres bilgisi"
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Para Birimi Ayarları
            </CardTitle>
            <CardDescription>Uygulamada kullanılacak varsayılan para birimi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currency" className="text-sm font-medium">
                  Varsayılan Para Birimi *
                </Label>
                <Select
                  value={form.default_currency}
                  onValueChange={(value) => setForm({ ...form, default_currency: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tüm fiyatlar ve tutarlar bu para biriminde gösterilecektir
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Dil Ayarları
            </CardTitle>
            <CardDescription>Uygulama dili</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="language" className="text-sm font-medium">
                  Dil *
                </Label>
                <Select
                  value={form.language}
                  onValueChange={(value) => setForm({ ...form, language: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="acl">
          <Card className="bg-white rounded-xl border border-[#e2e8f0] shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Yetki Yönetimi (ACL)
                  </CardTitle>
                  <CardDescription>
                    Rol bazlı erişim kontrolü ve yetkilendirme ayarları
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInitializeDefaults}
                  className="rounded-xl"
                >
                  Varsayılan Yetkileri Oluştur
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aclLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {roles.map((role) => (
                    <div key={role} className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#2d3748] capitalize">
                        {role === "manager" ? "Yönetici" : 
                         role === "sales" ? "Satış" :
                         role === "accounting" ? "Muhasebe" : "Diğer"}
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[150px]">Kaynak</TableHead>
                              {actions.map((action) => (
                                <TableHead key={action} className="text-center min-w-[100px]">
                                  {action === "view" ? "Görüntüle" :
                                   action === "create" ? "Oluştur" :
                                   action === "update" ? "Güncelle" :
                                   action === "delete" ? "Sil" :
                                   action === "sell" ? "Sat" : action}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resources.map((resource) => {
                              const resourceLabels: Record<string, string> = {
                                vehicles: "Araçlar",
                                customers: "Müşteriler",
                                staff: "Personel",
                                analytics: "Analitik",
                                reports: "Raporlar",
                                settings: "Ayarlar",
                                acl: "Yetkiler",
                              };
                              return (
                                <TableRow key={resource}>
                                  <TableCell className="font-medium">
                                    {resourceLabels[resource] || resource}
                                  </TableCell>
                                  {actions.map((action) => {
                                    const perm = getPermission(role, resource, action);
                                    const isAllowed = perm?.allowed || false;
                                    return (
                                      <TableCell key={action} className="text-center">
                                        {perm ? (
                                          <Switch
                                            checked={isAllowed}
                                            onCheckedChange={() => handleTogglePermission(perm)}
                                            className="mx-auto"
                                          />
                                        ) : (
                                          <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Not:</strong> Owner ve Admin rolleri tüm yetkilere sahiptir ve bu tabloda gösterilmez.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
