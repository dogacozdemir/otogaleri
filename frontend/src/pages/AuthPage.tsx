import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import zxcvbn from "zxcvbn";
import { api, setToken } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff, Mail, Building2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Password requirements
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "En az 12 karakter", test: (p) => p.length >= 12 },
  { label: "En az bir küçük harf (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "En az bir büyük harf (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "En az bir rakam (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "En az bir özel karakter (!@#$%^&*)", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!registerPassword) return null;
    return zxcvbn(registerPassword);
  }, [registerPassword]);

  // Password requirements check
  const passwordRequirements = useMemo(() => {
    if (!registerPassword) return PASSWORD_REQUIREMENTS.map((req) => ({ ...req, met: false }));
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(registerPassword),
    }));
  }, [registerPassword]);

  // Check if password meets all requirements
  const passwordMeetsRequirements = useMemo(() => {
    return passwordRequirements.every((req) => req.met) && (passwordStrength?.score ?? 0) >= 3;
  }, [passwordRequirements, passwordStrength]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getPasswordStrengthLabel = (score: number) => {
    const labels = ["Çok Zayıf", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
    return labels[score] || "Zayıf";
  };

  const getPasswordStrengthColor = (score: number) => {
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    return colors[score] || "bg-gray-300";
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
    setTouched({ loginEmail: true, loginPassword: true });

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
        
        // Handle rate limiting
        if (errorMessage.includes("Too many") || errorMessage.includes("çok fazla")) {
          toast({
            title: "Çok Fazla Deneme",
            description: "Güvenlik nedeniyle çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Giriş Başarısız",
            description: errorMessage.includes("credentials") || errorMessage.includes("Invalid")
              ? "Email veya şifre hatalı. Lütfen tekrar deneyin."
              : errorMessage,
            variant: "destructive",
          });
        }
        
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
    } else if (registerCompany.trim().length < 2) {
      newErrors.registerCompany = "Şirket adı en az 2 karakter olmalıdır";
    }

    if (!registerEmail) {
      newErrors.registerEmail = "Email gereklidir";
    } else if (!validateEmail(registerEmail)) {
      newErrors.registerEmail = "Geçersiz email formatı";
    }

    if (!registerPassword) {
      newErrors.registerPassword = "Şifre gereklidir";
    } else if (!passwordMeetsRequirements) {
      newErrors.registerPassword = "Şifre gereksinimleri karşılamıyor";
    }

    if (!registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Lütfen şifrenizi onaylayın";
    } else if (registerPassword !== registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Şifreler eşleşmiyor";
    }

    setErrors(newErrors);
    setTouched({
      registerCompany: true,
      registerEmail: true,
      registerPassword: true,
      registerConfirmPassword: true,
    });

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
          description: "Hesabınız başarıyla oluşturuldu!",
        });
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || "Kayıt başarısız";
        
        // Handle rate limiting
        if (errorMessage.includes("Too many") || errorMessage.includes("çok fazla")) {
          toast({
            title: "Çok Fazla Deneme",
            description: "Güvenlik nedeniyle çok fazla kayıt denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
          toast({
            title: "Kayıt Başarısız",
            description: "Bu email adresi veya şirket adı zaten kullanılıyor.",
            variant: "destructive",
          });
          setErrors({
            registerEmail: errorMessage.includes("email") ? "Bu email adresi zaten kullanılıyor" : "",
            registerCompany: errorMessage.includes("slug") || errorMessage.includes("Company") ? "Bu şirket adı zaten kullanılıyor" : "",
          });
        } else if (errorMessage.includes("Password") || errorMessage.includes("şifre")) {
          toast({
            title: "Şifre Gereksinimleri",
            description: errorMessage,
            variant: "destructive",
          });
          setErrors({
            registerPassword: errorMessage,
          });
        } else {
          toast({
            title: "Kayıt Başarısız",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md">
        {/* Security Badge */}
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003d82]/10 dark:bg-[#003d82]/20">
            <Shield className="h-5 w-5 text-[#003d82] dark:text-[#4a9eff]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Otogaleri Sistemi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Güvenli Multi-Currency Platform</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <CardTitle className="text-2xl font-bold tracking-tight dark:text-slate-100">Hesap Erişimi</CardTitle>
            </div>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              {activeTab === "login"
                ? "Dashboard'unuza erişmek için bilgilerinizi girin"
                : "Başlamak için bir hesap oluşturun"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700 p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#003d82] data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white"
                >
                  Giriş Yap
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#003d82] data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600 dark:data-[state=active]:text-white"
                >
                  Kayıt Ol
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="mt-6 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="ornek@sirket.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (touched.loginEmail) {
                            setErrors((prev) => ({ ...prev, loginEmail: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, loginEmail: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10",
                          errors.loginEmail && touched.loginEmail && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    </div>
                    {errors.loginEmail && touched.loginEmail && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.loginEmail}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300">
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
                        className="text-xs font-medium text-[#003d82] hover:text-[#0052a3] hover:underline dark:text-[#4a9eff]"
                      >
                        Şifrenizi mi unuttunuz?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrenizi girin"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (touched.loginPassword) {
                            setErrors((prev) => ({ ...prev, loginPassword: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, loginPassword: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.loginPassword && touched.loginPassword && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.loginPassword && touched.loginPassword && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.loginPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003d82] text-white hover:bg-[#0052a3] shadow-sm dark:bg-[#4a9eff] dark:hover:bg-[#6bb0ff]"
                    size="lg"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Giriş yapılıyor...
                      </span>
                    ) : (
                      "Dashboard'a Giriş Yap"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="mt-6 space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-company" className="text-slate-700 dark:text-slate-300">
                      Şirket Adı
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="register-company"
                        type="text"
                        placeholder="Şirket Adı Ltd."
                        value={registerCompany}
                        onChange={(e) => {
                          setRegisterCompany(e.target.value);
                          if (touched.registerCompany) {
                            setErrors((prev) => ({ ...prev, registerCompany: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, registerCompany: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10",
                          errors.registerCompany && touched.registerCompany && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    </div>
                    {errors.registerCompany && touched.registerCompany && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.registerCompany}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-slate-700 dark:text-slate-300">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="ornek@sirket.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          if (touched.registerEmail) {
                            setErrors((prev) => ({ ...prev, registerEmail: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, registerEmail: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10",
                          errors.registerEmail && touched.registerEmail && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    </div>
                    {errors.registerEmail && touched.registerEmail && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.registerEmail}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-slate-700 dark:text-slate-300">
                      Şifre
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Güçlü bir şifre oluşturun"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          if (touched.registerPassword) {
                            setErrors((prev) => ({ ...prev, registerPassword: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, registerPassword: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.registerPassword && touched.registerPassword && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {registerPassword && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Şifre Gücü:
                          </span>
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              passwordStrength?.score === 0 && "text-red-600 dark:text-red-400",
                              passwordStrength?.score === 1 && "text-orange-600 dark:text-orange-400",
                              passwordStrength?.score === 2 && "text-yellow-600 dark:text-yellow-400",
                              passwordStrength?.score === 3 && "text-blue-600 dark:text-blue-400",
                              passwordStrength?.score === 4 && "text-green-600 dark:text-green-400"
                            )}
                          >
                            {passwordStrength ? getPasswordStrengthLabel(passwordStrength.score) : "Zayıf"}
                          </span>
                        </div>
                        {passwordStrength && (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={cn(
                                "h-full transition-all duration-300",
                                getPasswordStrengthColor(passwordStrength.score)
                              )}
                              style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                            />
                          </div>
                        )}
                        {passwordStrength?.feedback?.suggestions && passwordStrength.feedback.suggestions.length > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            💡 {passwordStrength.feedback.suggestions[0]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Password Requirements */}
                    {registerPassword && (
                      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                          Şifre Gereksinimleri:
                        </p>
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {req.met ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            )}
                            <span
                              className={cn(
                                "text-xs",
                                req.met
                                  ? "text-green-600 dark:text-green-400 font-medium"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {req.label}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {passwordStrength && passwordStrength.score >= 3 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              "text-xs",
                              passwordStrength && passwordStrength.score >= 3
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            Güçlü şifre seviyesi (zxcvbn skoru ≥ 3)
                          </span>
                        </div>
                      </div>
                    )}

                    {errors.registerPassword && touched.registerPassword && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.registerPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-slate-700 dark:text-slate-300">
                      Şifre Onayı
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Şifrenizi tekrar girin"
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          if (touched.registerConfirmPassword) {
                            setErrors((prev) => ({ ...prev, registerConfirmPassword: "" }));
                          }
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, registerConfirmPassword: true }))}
                        disabled={loading}
                        className={cn(
                          "pl-10 pr-10",
                          errors.registerConfirmPassword && touched.registerConfirmPassword && "border-red-500 focus-visible:ring-red-500",
                          registerConfirmPassword &&
                            registerPassword === registerConfirmPassword &&
                            !errors.registerConfirmPassword &&
                            "border-green-500 focus-visible:ring-green-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerConfirmPassword && registerPassword === registerConfirmPassword && !errors.registerConfirmPassword && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Şifreler eşleşiyor
                      </p>
                    )}
                    {errors.registerConfirmPassword && touched.registerConfirmPassword && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.registerConfirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !passwordMeetsRequirements}
                    className="w-full bg-[#003d82] text-white hover:bg-[#0052a3] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#4a9eff] dark:hover:bg-[#6bb0ff]"
                    size="lg"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Hesap oluşturuluyor...
                      </span>
                    ) : (
                      "Hesap Oluştur"
                    )}
                  </Button>

                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Hesap oluşturarak{" "}
                    <button type="button" className="text-[#003d82] hover:underline dark:text-[#4a9eff]">
                      Hizmet Şartları
                    </button>{" "}
                    ve{" "}
                    <button type="button" className="text-[#003d82] hover:underline dark:text-[#4a9eff]">
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
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Verileriniz endüstri standardı protokollerle şifrelenmiş ve güvence altına alınmıştır
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
