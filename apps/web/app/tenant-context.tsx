'use client';
import React, { createContext, useContext } from 'react';

type Tenant = { slug: string | null; name?: string };

type TenantContextValue = {
  tenant: Tenant | null;
};

const Ctx = createContext<TenantContextValue>({ tenant: null });

export function TenantProvider({
  slug,
  children,
}: {
  slug: string | null;
  children: React.ReactNode;
}) {
  const value: TenantContextValue = slug ? { tenant: { slug } } : { tenant: null };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenant() {
  return useContext(Ctx);
}
