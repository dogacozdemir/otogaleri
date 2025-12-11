"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, Eye, EyeOff, Mail, Building2, Chrome } from "lucide-react"
import { cn } from "@/lib/utils"

export function AuthScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("login")

  // Form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerCompany, setRegisterCompany] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!loginEmail) newErrors.loginEmail = "Email is required"
    else if (!validateEmail(loginEmail)) newErrors.loginEmail = "Invalid email format"

    if (!loginPassword) newErrors.loginPassword = "Password is required"

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      console.log("Login:", { loginEmail, loginPassword })
      // Handle login logic here
    }
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!registerCompany) newErrors.registerCompany = "Company name is required"
    if (!registerEmail) newErrors.registerEmail = "Email is required"
    else if (!validateEmail(registerEmail)) newErrors.registerEmail = "Invalid email format"

    if (!registerPassword) newErrors.registerPassword = "Password is required"
    else if (registerPassword.length < 8) newErrors.registerPassword = "Password must be at least 8 characters"

    if (!registerConfirmPassword) newErrors.registerConfirmPassword = "Please confirm your password"
    else if (registerPassword !== registerConfirmPassword) newErrors.registerConfirmPassword = "Passwords do not match"

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      console.log("Register:", { registerCompany, registerEmail, registerPassword })
      // Handle registration logic here
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4">
      <div className="w-full max-w-md">
        {/* Security Badge */}
        <div className="mb-6 flex items-center justify-center gap-2 text-slate-600">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <Shield className="h-5 w-5 text-indigo-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">AutoDealer System</p>
            <p className="text-xs text-slate-500">Secure Multi-Currency Platform</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              <CardTitle className="text-2xl font-bold tracking-tight">Account Access</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              {activeTab === "login"
                ? "Enter your credentials to access your dashboard"
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="mt-6 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className={cn("pl-10", errors.loginEmail && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.loginEmail && <p className="text-xs text-red-600">{errors.loginEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-slate-700">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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
                    className="w-full bg-green-600 text-white hover:bg-green-700 shadow-sm"
                    size="lg"
                  >
                    Login to Dashboard
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" type="button" className="border-slate-300 bg-transparent">
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                  <Button variant="outline" type="button" className="border-slate-300 bg-transparent">
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
                      Company Name
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-company"
                        type="text"
                        placeholder="Your Company Ltd."
                        value={registerCompany}
                        onChange={(e) => setRegisterCompany(e.target.value)}
                        className={cn("pl-10", errors.registerCompany && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.registerCompany && <p className="text-xs text-red-600">{errors.registerCompany}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-slate-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@company.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className={cn("pl-10", errors.registerEmail && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {errors.registerEmail && <p className="text-xs text-red-600">{errors.registerEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
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
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
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
                    className="w-full bg-green-600 text-white hover:bg-green-700 shadow-sm"
                    size="lg"
                  >
                    Create Account
                  </Button>

                  <p className="text-center text-xs text-slate-500">
                    By creating an account, you agree to our{" "}
                    <button type="button" className="text-indigo-600 hover:underline">
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button type="button" className="text-indigo-600 hover:underline">
                      Privacy Policy
                    </button>
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
            Your data is encrypted and secured with industry-standard protocols
          </p>
        </div>
      </div>
    </div>
  )
}
