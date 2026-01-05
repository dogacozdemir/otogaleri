import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff, Mail, Building2, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerCompany, setRegisterCompany] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!loginEmail) {
      newErrors.loginEmail = "Email gereklidir";
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = "Geçersiz email formatı";
    }

    if (!loginPassword) {
      newErrors.loginPassword = "Şifre gereklidir";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const res = await api.post("/auth/login", {
          email: loginEmail,
          password: loginPassword,
        });
        
        setToken(res.data.token);
        toast({
          title: "Başarılı",
          description: "Giriş yapıldı",
        });
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || "Giriş başarısız";
        toast({
          title: "Hata",
          description: errorMessage,
          variant: "destructive",
        });
        setErrors({
          loginEmail: errorMessage.includes("credentials") || errorMessage.includes("Invalid") ? "Geçersiz email veya şifre" : "",
          loginPassword: errorMessage.includes("credentials") || errorMessage.includes("Invalid") ? "Geçersiz email veya şifre" : "",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!registerCompany) {
      newErrors.registerCompany = "Şirket adı gereklidir";
    }
    if (!registerEmail) {
      newErrors.registerEmail = "Email gereklidir";
    } else if (!validateEmail(registerEmail)) {
      newErrors.registerEmail = "Geçersiz email formatı";
    }

    if (!registerPassword) {
      newErrors.registerPassword = "Şifre gereklidir";
    } else if (registerPassword.length < 8) {
      newErrors.registerPassword = "Şifre en az 8 karakter olmalıdır";
    }

    if (!registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Lütfen şifrenizi onaylayın";
    } else if (registerPassword !== registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Şifreler eşleşmiyor";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const tenantSlug = registerCompany.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const payload = {
          tenantName: registerCompany,
          tenantSlug: tenantSlug,
          defaultCurrency: "TRY",
          ownerName: registerCompany,
          ownerEmail: registerEmail,
          ownerPassword: registerPassword,
        };
        
        const res = await api.post("/auth/signup", payload);
        setToken(res.data.token);
        toast({
          title: "Başarılı",
          description: "Hesabınız oluşturuldu",
        });
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || "Kayıt başarısız";
        toast({
          title: "Hata",
          description: errorMessage,
          variant: "destructive",
        });
        
        if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
          setErrors({
            registerEmail: "Bu email adresi zaten kullanılıyor",
            registerCompany: errorMessage.includes("slug") ? "Bu şirket adı zaten kullanılıyor" : "",
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4">
      <div className="w-full max-w-md">
        {/* Security Badge */}
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-600">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003d82]/10">
            <Shield className="h-5 w-5 text-[#003d82]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">Otogaleri Sistemi</p>
            <p className="text-xs text-slate-500">Güvenli Multi-Currency Platform</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              <CardTitle className="text-2xl font-bold tracking-tight">Hesap Erişimi</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              {activeTab === "login"
                ? "Dashboard'unuza erişmek için bilgilerinizi girin"
                : "Başlamak için bir hesap oluşturun"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#003d82] data-[state=active]:shadow-sm"
                >
                  Giriş Yap
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#003d82] data-[state=active]:shadow-sm"
                >
                  Kayıt Ol
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="mt-6 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="ornek@sirket.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={loading}
                        className={cn("pl-10", errors.loginEmail && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.loginEmail && <p className="text-xs text-red-600">{errors.loginEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-slate-700">
                        Şifre
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          toast({
                            title: "Yakında",
                            description: "Şifre sıfırlama özelliği yakında eklenecek",
                          });
                        }}
                        className="text-xs font-medium text-[#003d82] hover:text-[#0052a3] hover:underline"
                      >
                        Şifrenizi mi unuttunuz?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrenizi girin"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.loginPassword && "border-red-500 focus-visible:ring-red-500",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.loginPassword && <p className="text-xs text-red-600">{errors.loginPassword}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003d82] text-white hover:bg-[#0052a3] shadow-sm"
                    size="lg"
                  >
                    {loading ? "Giriş yapılıyor..." : "Dashboard'a Giriş Yap"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Veya</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    type="button" 
                    disabled
                    className="border-slate-300 bg-transparent cursor-not-allowed opacity-60"
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    type="button" 
                    disabled
                    className="border-slate-300 bg-transparent cursor-not-allowed opacity-60"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.5 12.3c0-1.1-.1-2.2-.3-3.2H12v6.1h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.6-5 3.6-8.5z" />
                      <path d="M12 24c3.2 0 5.9-1.1 7.9-2.8l-3.7-2.8c-1.1.7-2.5 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v2.9C3.3 21.4 7.3 24 12 24z" />
                      <path d="M5.1 14.5c-.5-1.4-.5-2.9 0-4.3V7.3H1.3c-1.7 3.4-1.7 7.4 0 10.8l3.8-2.9z" />
                      <path d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5C18 1.1 15.2 0 12 0 7.3 0 3.3 2.6 1.3 6.6l3.8 2.9c1-2.9 3.7-5.1 6.9-5.1z" />
                    </svg>
                    Microsoft
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="mt-6 space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-company" className="text-slate-700">
                      Şirket Adı
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-company"
                        type="text"
                        placeholder="Şirket Adı Ltd."
                        value={registerCompany}
                        onChange={(e) => setRegisterCompany(e.target.value)}
                        disabled={loading}
                        className={cn("pl-10", errors.registerCompany && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.registerCompany && <p className="text-xs text-red-600">{errors.registerCompany}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-slate-700">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="ornek@sirket.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        disabled={loading}
                        className={cn("pl-10", errors.registerEmail && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.registerEmail && <p className="text-xs text-red-600">{errors.registerEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-slate-700">
                      Şifre
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 karakter"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.registerPassword && "border-red-500 focus-visible:ring-red-500",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.registerPassword && <p className="text-xs text-red-600">{errors.registerPassword}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-slate-700">
                      Şifre Onayı
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Şifrenizi tekrar girin"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.registerConfirmPassword && "border-red-500 focus-visible:ring-red-500",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.registerConfirmPassword && (
                      <p className="text-xs text-red-600">{errors.registerConfirmPassword}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003d82] text-white hover:bg-[#0052a3] shadow-sm"
                    size="lg"
                  >
                    {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                  </Button>

                  <p className="text-center text-xs text-slate-500">
                    Hesap oluşturarak{" "}
                    <button type="button" className="text-[#003d82] hover:underline">
                      Hizmet Şartları
                    </button>{" "}
                    ve{" "}
                    <button type="button" className="text-[#003d82] hover:underline">
                      Gizlilik Politikası
                    </button>
                    'nı kabul etmiş olursunuz.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            <Lock className="inline-block h-3 w-3 mr-1" />
            Verileriniz endüstri standardı protokollerle şifrelenmiş ve güvence altına alınmıştır
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
