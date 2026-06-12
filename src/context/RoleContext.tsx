import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Role = 'participant' | 'facilitator' | 'recorder' | 'admin' | null

type RoleContextType = {
  role: Role
  policyId: string | null
  setRole: (role: Role) => void
  setPolicyId: (id: string | null) => void
  clearRole: () => void
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  policyId: null,
  setRole: () => {},
  setPolicyId: () => {},
  clearRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem('role') as Role) || null
  })
  const [policyId, setPolicyIdState] = useState<string | null>(() => {
    return localStorage.getItem('policyId') || null
  })

  const setRole = (r: Role) => {
    setRoleState(r)
    if (r) localStorage.setItem('role', r)
    else localStorage.removeItem('role')
  }

  const setPolicyId = (id: string | null) => {
    setPolicyIdState(id)
    if (id) localStorage.setItem('policyId', id)
    else localStorage.removeItem('policyId')
  }

  const clearRole = () => {
    setRoleState(null)
    setPolicyIdState(null)
    localStorage.removeItem('role')
    localStorage.removeItem('policyId')
  }

  return (
    <RoleContext.Provider value={{ role, policyId, setRole, setPolicyId, clearRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
