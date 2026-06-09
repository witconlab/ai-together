import { Link, useLocation } from 'react-router-dom'

type Props = { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === '/ai-together/'

  return (
    <div className="min-h-dvh flex flex-col">
      {!isHome && (
        <header className="bg-navy-800 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-md">
          <Link to="/" className="text-white/80 hover:text-white text-lg">
            ←
          </Link>
          <Link to="/" className="font-bold text-lg leading-tight">
            AI Together<br />
            <span className="text-teal-400 text-sm font-medium">공론장 운영센터</span>
          </Link>
        </header>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-navy-900 text-white/60 text-sm text-center py-4 px-4">
        AI Together 공론장 운영센터 · Google Forms/Sheets 기반 운영 · AI 숙의 보조 챗봇 제공
      </footer>
    </div>
  )
}
