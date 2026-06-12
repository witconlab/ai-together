import { useNavigate, useParams } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import { agendas } from '../data/agendas'

export default function PolicyPicker() {
  const { mode } = useParams<{ mode: 'learn' | 'opinion' }>()
  const navigate = useNavigate()
  const { setRole, setPolicyId } = useRole()

  const handleSelect = (agendaId: string) => {
    setRole('participant')
    setPolicyId(agendaId)
    if (mode === 'opinion') navigate(`/opinion/${agendaId}`)
    else navigate(`/agenda/${agendaId}`)
  }

  return (
    <div className="min-h-dvh bg-[#1a2458] px-5 pt-8 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white leading-tight mb-2">
          내 정책 테이블을 골라 주세요
        </h1>
        <p className="text-white/50 text-sm">앉아 계신 테이블 이름을 눌러 주세요</p>
      </div>

      <div className="flex flex-col gap-3">
        {agendas.map(a => (
          <button
            key={a.agendaId}
            onClick={() => handleSelect(a.agendaId)}
            className="w-full bg-white text-[#1a2458] font-bold py-5 px-5 rounded-2xl text-left text-base hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
          >
            {a.agendaId.replace('policy-', '')}. {a.title}
          </button>
        ))}
      </div>
    </div>
  )
}
