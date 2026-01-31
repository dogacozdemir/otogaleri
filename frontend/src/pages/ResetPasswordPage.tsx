import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PASSWORD_REQUIREMENTS: { label: string; test: (p: string) => boolean }[] = [
  { label: "En az 8 karakter", test: (p) => p.length >= 8 },
  { label: "En az bir küçük harf (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "En az bir büyük harf (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "En az bir rakam (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "En az bir özel karakter (!@#$%^&*)", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const passwordStrength = useMemo(() => (newPassword ? zxcvbn(newPassword) : null), [newPassword]);
  const requirements = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        met: req.test(newPassword),
      })),
    [newPassword]
  );
  const passwordOk =
    requirements.every((r) => r.met) && (passwordStrength?.score ?? 0) >= 3;
  const confirmOk = confirmPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    if (!token.trim()) {
      setError("Geçersiz veya eksik link. Lütfen şifre sıfırlama talebini e-postanızdan tekrarlayın.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token.trim()) return;
    if (!passwordOk) {
      setError("Şifre gereksinimleri karşılanmıyor.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
      toast({
        title: "Şifre güncellendi",
        description: "Yeni şifrenizle giriş yapabilirsiniz.",
      });
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        "Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.";
      setError(msg);
      if (err?.response?.status === 429) {
        toast({
          title: "Çok fazla deneme",
          description: "Lütfen 15 dakika sonra tekrar deneyin.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token.trim()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="w-full max-w-md border-slate-200 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <Link to="/forgot-password" className="mt-4 block">
              <Button type="button" className="w-full" size="lg">
                Şifre sıfırlama talebi gönder
              </Button>
            </Link>
            <Link to="/login" className="mt-3 block text-center text-sm text-primary hover:underline">
              Giriş sayfasına dön
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="w-full max-w-md border-slate-200 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStrengthLabel = (score: number) =>
    ["Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"][score] ?? "Zayıf";
  const getStrengthColor = (score: number) =>
    ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][score] ?? "bg-muted";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Akıllı Galeri</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Yeni şifre belirle</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight dark:text-slate-100">
              Yeni şifre belirleyin
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Güçlü bir şifre girin; en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300">
                  Yeni şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Yeni şifrenizi girin"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    className={cn(
                      "pl-10 pr-10",
                      error && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Şifre gücü:</span>
                      <span
                        className={cn(
                          "font-semibold",
                          passwordStrength?.score === 0 && "text-red-600",
                          passwordStrength?.score === 1 && "text-orange-600",
                          passwordStrength?.score === 2 && "text-yellow-600",
                          passwordStrength?.score === 3 && "text-blue-600",
                          passwordStrength?.score === 4 && "text-green-600"
                        )}
                      >
                        {passwordStrength ? getStrengthLabel(passwordStrength.score) : ""}
                      </span>
                    </div>
                    {passwordStrength && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={cn("h-full transition-all", getStrengthColor(passwordStrength.score))}
                          style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                        />
                      </div>
                    )}
                    {requirements.some((r) => !r.met) && (
                      <div className="space-y-1 pt-1">
                        {requirements
                          .filter((r) => !r.met)
                          .map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                              <XCircle className="h-3 w-3 flex-shrink-0" />
                              {r.label}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300">
                  Şifre tekrar
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Şifrenizi tekrar girin"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    className={cn(
                      "pl-10 pr-10",
                      confirmPassword &&
                        newPassword === confirmPassword &&
                        "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Şifreler eşleşiyor
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !passwordOk || !confirmOk}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Güncelleniyor...
                  </span>
                ) : (
                  "Şifreyi güncelle"
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Giriş sayfasına dön
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
