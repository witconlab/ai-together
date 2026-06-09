const steps = [
  {
    label: '1단계: 문제 확인',
    color: 'bg-navy-700',
    questions: [
      '이 문제는 실제로 언제, 어디서 가장 많이 발생하나요?',
      '우리 테이블에서 이 문제를 직접 경험한 분이 있나요?',
    ],
  },
  {
    label: '2단계: 영향 받는 대상',
    color: 'bg-navy-600',
    questions: [
      '누가 가장 불편을 겪고 있나요?',
      '특히 어르신이나 어린이에게 어떤 영향이 있나요?',
    ],
  },
  {
    label: '3단계: 원인 찾기',
    color: 'bg-teal-600',
    questions: [
      '이 문제가 반복되는 이유는 무엇인가요?',
      '예전에 해결하려 했지만 잘 안 됐던 이유가 있나요?',
    ],
  },
  {
    label: '4단계: 해결책 찾기',
    color: 'bg-teal-500',
    questions: [
      '현실적으로 가장 먼저 할 수 있는 해결책은 무엇인가요?',
      '주민이 직접 할 수 있는 것과 행정이 해야 할 것은 무엇인가요?',
    ],
  },
  {
    label: '5단계: 우선순위 정하기',
    color: 'bg-navy-500',
    questions: [
      '우리가 제안할 해결책 중 가장 시급한 것은 무엇인가요?',
      '6개월 안에 실현 가능한 것은 무엇인가요?',
    ],
  },
  {
    label: '6단계: 발표 문장 정리',
    color: 'bg-navy-800',
    questions: [
      '주민총회에서 어떤 문장으로 제안하면 좋을까요?',
      '우리 테이블의 핵심 메시지를 한 문장으로 표현한다면?',
    ],
  },
]

export default function DiscussionGuide() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">토론 가이드</h1>
      <p className="text-gray-500 mb-6 leading-relaxed">
        퍼실리테이터가 이 흐름에 따라 토론을 이끌어 주세요.<br />
        각 단계의 질문을 테이블에서 함께 이야기해 보세요.
      </p>

      <div className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={i} className="card overflow-hidden p-0">
            <div className={`${step.color} text-white px-4 py-3`}>
              <h2 className="font-bold text-base">{step.label}</h2>
            </div>
            <div className="px-4 py-4 flex flex-col gap-2">
              {step.questions.map((q, j) => (
                <div key={j} className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold mt-0.5">Q.</span>
                  <p className="text-gray-700 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <h3 className="font-bold text-amber-800 mb-2">퍼실리테이터 안내</h3>
        <ul className="text-sm text-amber-700 space-y-1 leading-relaxed">
          <li>· 모든 분이 한 마디씩 이야기할 기회를 주세요.</li>
          <li>· 틀린 의견은 없습니다. 다양한 관점을 환영하세요.</li>
          <li>· 결론을 너무 빨리 내리지 말고 충분히 토론하세요.</li>
          <li>· 기록자가 핵심 의견을 메모하도록 부탁하세요.</li>
        </ul>
      </div>
    </div>
  )
}
