import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("E-posta adresi gerekli");
      return;
    }
    if (!validateEmail(email.trim())) {
      setError("Geçerli bir e-posta adresi girin");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      toast({
        title: "E-posta gönderildi",
        description: "Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Akıllı Galeri</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Şifre sıfırlama</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight dark:text-slate-100">
              Şifrenizi mi unuttunuz?
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {sent
                ? "E-posta adresinize şifre sıfırlama linki gönderildi. Link 1 saat geçerlidir."
                : "Hesabınıza kayıtlı e-posta adresini girin, size şifre sıfırlama linki gönderelim."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    E-postayı kontrol edin. Spam klasörüne de bakmayı unutmayın.
                  </p>
                </div>
                <Link to="/login">
                  <Button type="button" variant="outline" className="w-full" size="lg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Giriş sayfasına dön
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-slate-700 dark:text-slate-300">
                    E-posta Adresi
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="ornek@sirket.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      disabled={loading}
                      className={cn("pl-10", error && "border-red-500 focus-visible:ring-red-500")}
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Gönderiliyor...
                    </span>
                  ) : (
                    "Şifre sıfırlama linki gönder"
                  )}
                </Button>

                <Link to="/login" className="block text-center">
                  <Button type="button" variant="ghost" className="w-full" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Giriş sayfasına dön
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
