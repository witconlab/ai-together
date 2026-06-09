import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AgendaList from './pages/AgendaList'
import AgendaDetail from './pages/AgendaDetail'
import ChatPage from './pages/ChatPage'
import QuestionGuide from './pages/QuestionGuide'
import DiscussionGuide from './pages/DiscussionGuide'
import SubmitResult from './pages/SubmitResult'
import Dashboard from './pages/Dashboard'
import PolicyProposal from './pages/PolicyProposal'
import Presentation from './pages/Presentation'
import SlideDeck from './pages/SlideDeck'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agendas" element={<AgendaList />} />
          <Route path="/agenda/:agendaId" element={<AgendaDetail />} />
          <Route path="/chat/:agendaId" element={<ChatPage />} />
          <Route path="/question-guide" element={<QuestionGuide />} />
          <Route path="/discussion-guide" element={<DiscussionGuide />} />
          <Route path="/submit" element={<SubmitResult />} />
          <Route path="/submit/:agendaId" element={<SubmitResult />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/policy-proposal" element={<PolicyProposal />} />
          <Route path="/presentation" element={<Presentation />} />
          <Route path="/slide-deck" element={<SlideDeck />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
