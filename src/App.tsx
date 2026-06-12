import { HashRouter, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import AgendaList from './pages/AgendaList'
import AgendaDetail from './pages/AgendaDetail'
import DiscussionGuide from './pages/DiscussionGuide'
import Dashboard from './pages/Dashboard'
import PolicyProposal from './pages/PolicyProposal'
import Presentation from './pages/Presentation'
import SlideDeck from './pages/SlideDeck'
import OpinionForm from './pages/OpinionForm'
import OpinionDone from './pages/OpinionDone'
import OperatorPage from './pages/OperatorPage'
import DocumentsPage from './pages/DocumentsPage'
import SlideEditorPage from './pages/SlideEditorPage'
import PolicyPicker from './pages/PolicyPicker'
import VotePage from './pages/VotePage'

export default function App() {
  return (
    <RoleProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/agendas" element={<AgendaList />} />
            <Route path="/agenda/:agendaId" element={<AgendaDetail />} />
            <Route path="/discussion-guide" element={<DiscussionGuide />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/policy-proposal" element={<PolicyProposal />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/slide-deck" element={<SlideDeck />} />
            <Route path="/policy-pick/:mode" element={<PolicyPicker />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/opinion/:agendaId" element={<OpinionForm />} />
            <Route path="/opinion-done/:agendaId" element={<OpinionDone />} />
            <Route path="/operator/:agendaId" element={<OperatorPage />} />
            <Route path="/operator/:agendaId/documents" element={<DocumentsPage />} />
            <Route path="/slide-editor/:agendaId" element={<SlideEditorPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </RoleProvider>
  )
}
