import { useEffect, useState } from "react";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function StaffPage() {
  const { t } = useTranslation();
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "sales",
    branch_id: "",
    is_active: true,
  });

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data } = await api.get("/staff");
      setStaff(data?.staff || []);
    } catch (err) {
      console.error("Failed to fetch staff", err);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await api.get("/branches");
      setBranches(data?.branches || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
      setBranches([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/staff", form);
      setShowForm(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        role: "sales",
        branch_id: "",
        is_active: true,
      });
      fetchStaff();
    } catch (err) {
      console.error("Failed to create staff", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("staff.title")}</h1>
        </div>
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="text-muted-foreground mt-1">Personel yönetimi</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("common.cancel") : t("staff.add")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("staff.add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label-professional">{t("staff.name")} *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("staff.email")}</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("staff.phone")}</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("staff.role")}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="form-input-professional w-full"
                  >
                    <option value="sales">{t("staff.roleSales")}</option>
                    <option value="manager">{t("staff.roleManager")}</option>
                    <option value="accounting">{t("staff.roleAccounting")}</option>
                    <option value="other">{t("staff.roleOther")}</option>
                  </select>
                </div>
                <div>
                  <label className="form-label-professional">{t("staff.branch")}</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className="form-input-professional w-full"
                  >
                    <option value="">{t("staff.noBranch")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit">{t("common.save")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("staff.name")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("staff.role")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("staff.branch")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("staff.status")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {t("staff.noStaff")}
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">{s.role}</td>
                      <td className="px-4 py-3">{s.branch_name || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.is_active ? "success" : "destructive"}>
                          {s.is_active ? t("staff.active") : t("staff.inactive")}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
