import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    email: "",
    password: "",
    galleryName: "",
  });
  const navigate = useNavigate();

  const toggleMode = () => setIsLogin((prev) => !prev);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("otogaleri_token", res.data.token);
        navigate("/dashboard");
      } else {
        const payload = {
          tenantName: form.galleryName,
          tenantSlug: form.galleryName.toLowerCase().replace(/\s+/g, "-"),
          defaultCurrency: "TRY",
          ownerName: form.galleryName,
          ownerEmail: form.email,
          ownerPassword: form.password,
        };
        const res = await api.post("/auth/signup", payload);
        localStorage.setItem("otogaleri_token", res.data.token);
        navigate("/dashboard");
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "İşlem başarısız");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-professional px-4">
      <div className="card-professional p-8 w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-trustworthy rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="text-white text-2xl font-bold">O</div>
          </div>
          <h2 className="text-heading text-primary">
            {isLogin ? "Giriş Yap" : "Üye Ol"}
          </h2>
          <p className="text-small text-muted-foreground mt-1">
            {isLogin
              ? "Hesabınıza güvenli giriş yapın"
              : "Yeni oto galeri hesabı oluşturun"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-professional-sm">
          {!isLogin && (
            <div>
              <label className="form-label-professional">Galeri Adı</label>
              <input
                type="text"
                name="galleryName"
                placeholder="Galeri adınızı giriniz"
                value={form.galleryName}
                onChange={handleChange}
                className="form-input-professional w-full"
                required
              />
            </div>
          )}

          <div>
            <label className="form-label-professional">E-posta</label>
            <input
              type="email"
              name="email"
              placeholder="E-posta adresinizi giriniz"
              value={form.email}
              onChange={handleChange}
              className="form-input-professional w-full"
              required
            />
          </div>

          <div>
            <label className="form-label-professional">Şifre</label>
            <input
              type="password"
              name="password"
              placeholder="Güvenli şifrenizi giriniz"
              value={form.password}
              onChange={handleChange}
              className="form-input-professional w-full"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {isLogin ? "Güvenli Giriş" : "Galeri Hesabı Oluştur"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-small text-muted-foreground">
            {isLogin ? "Hesabın yok mu?" : "Zaten üye misin?"}{" "}
            <button
              onClick={toggleMode}
              className="text-primary font-semibold hover:text-primary/80"
            >
              {isLogin ? "Üye Ol" : "Giriş Yap"}
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <a href="/pricing" className="text-primary hover:underline">
              Paketleri incele
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
