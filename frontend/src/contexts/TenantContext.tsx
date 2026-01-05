import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken } from "@/api";

type Tenant = {
  id: number;
  name: string;
  slug: string;
  default_currency: string;
  country: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  language: string;
  created_at: string;
};

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  refreshTenant: () => Promise<void>;
  updateTenant: (data: Partial<Tenant>) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenant = async () => {
    try {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await api.get("/tenant");
      setTenant(data);
    } catch (err) {
      console.error("Failed to fetch tenant:", err);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshTenant = async () => {
    await fetchTenant();
  };

  const updateTenant = async (data: Partial<Tenant>) => {
    try {
      const { data: updatedTenant } = await api.put("/tenant", data);
      setTenant(updatedTenant);
    } catch (err) {
      console.error("Failed to update tenant:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  const value = {
    tenant,
    loading,
    refreshTenant,
    updateTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
