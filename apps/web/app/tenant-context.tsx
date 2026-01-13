"use client";
import React, { createContext, useContext } from 'react';

type Tenant = { slug: string | null };

const Ctx = createContext<Tenant>({ slug: null });

export function TenantProvider({ slug, children }: { slug: string | null; children: React.ReactNode }) {
  return <Ctx.Provider value={{ slug }}>{children}</Ctx.Provider>;
}

export function useTenant() {
  return useContext(Ctx);
}
