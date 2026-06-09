export type Agenda = {
  agendaId: string
  title: string
  description: string
  category: string
  targetArea: string
  tags: string[]
  summary: string
  whyImportant: string
  expectedEffect: string
  notionUrl?: string
  referenceUrls?: string[]
  chatbotGuide: string
  googleFormUrl: string
  googleSheetUrl?: string
  fileSearchStoreName: string
  sampleQuestions: string[]
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  discussionQuestion?: string
}

export type Source = {
  title: string
  page?: string
  snippet: string
}

export type SlideImagePlan = {
  slideNumber: number
  title: string
  keyMessage: string
  visualScene: string
  layoutGuide: string
  imagePrompt: string
  imageUrl?: string
}

export type SlideDeckPlan = {
  deckTitle: string
  subtitle?: string
  slideCount: number
  aspectRatio: '16:9'
  style: string
  slides: SlideImagePlan[]
}

export type RenderedSlideImage = {
  slideNumber: number
  title: string
  imageUrl: string
  downloadUrl?: string
}

export type PolicyProposal = {
  proposalTitle: string
  problem: string
  residentOpinions: string
  coreProposal: string
  implementation: string
  expectedEffect: string
  risksAndSupplements: string
  presentationSentence: string
}
