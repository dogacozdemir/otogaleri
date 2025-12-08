import { useEffect, useState } from "react";
import { api } from "../api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BranchesPage() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    city: "",
    country: "",
    address: "",
    phone: "",
    tax_office: "",
    tax_number: "",
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await api.get("/branches");
      setBranches(data?.branches || []);
    } catch (err) {
      console.error("Failed to fetch branches", err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/branches", form);
      setShowForm(false);
      setForm({
        name: "",
        code: "",
        city: "",
        country: "",
        address: "",
        phone: "",
        tax_office: "",
        tax_number: "",
      });
      fetchBranches();
    } catch (err) {
      console.error("Failed to create branch", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("branches.title")}</h1>
        </div>
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("branches.title")}</h1>
          <p className="text-muted-foreground mt-1">Şube yönetimi</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("common.cancel") : t("branches.add")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("branches.add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label-professional">{t("branches.name")} *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.code")}</label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.city")}</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.country")}</label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label-professional">{t("branches.address")}</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="form-input-professional w-full"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.phone")}</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.taxOffice")}</label>
                  <Input
                    value={form.tax_office}
                    onChange={(e) => setForm({ ...form, tax_office: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label-professional">{t("branches.taxNumber")}</label>
                  <Input
                    value={form.tax_number}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                  />
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
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("branches.name")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("branches.city")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("branches.phone")}</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      {t("branches.noBranches")}
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-accent/50">
                      <td className="px-4 py-3">{b.name}</td>
                      <td className="px-4 py-3">{b.city || "-"}</td>
                      <td className="px-4 py-3">{b.phone || "-"}</td>
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
