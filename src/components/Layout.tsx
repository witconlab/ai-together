import { Link, useLocation } from 'react-router-dom'
import { useRole } from '../context/RoleContext'

type Props = { children: React.ReactNode }

const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  participant: { label: '참여자', emoji: '👥', color: 'bg-teal-600' },
  facilitator:  { label: '퍼실리테이터', emoji: '🎤', color: 'bg-blue-600' },
  recorder:     { label: '기록자', emoji: '📝', color: 'bg-purple-600' },
  admin:        { label: '운영진', emoji: '⚙️', color: 'bg-red-600' },
}

export default function Layout({ children }: Props) {
  const location = useLocation()
  const { role, policyId, clearRole } = useRole()
  const isLanding = location.pathname === '/'

  const roleInfo = role ? ROLE_LABELS[role] : null

  return (
    <div className="min-h-dvh flex flex-col">
      {!isLanding && (
        <header className="bg-navy-800 text-white px-4 py-3 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={clearRole}
              className="text-white/80 hover:text-white text-lg min-h-0"
            >
              <Link to="/">←</Link>
            </button>
            <div className="flex-1">
              <p className="font-bold text-base leading-tight">AI 투게더 정책 공론장</p>
              {policyId && (
                <p className="text-teal-300 text-xs">
                  {policyId.replace('policy-', '')}번 정책
                </p>
              )}
            </div>
            {roleInfo && (
              <span className={`${roleInfo.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                {roleInfo.emoji} {roleInfo.label}
              </span>
            )}
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      {!isLanding && (
        <footer className="bg-navy-900 text-white/40 text-xs text-center py-3 px-4">
          AI 투게더 정책 공론장 운영센터
        </footer>
      )}
    </div>
  )
}
