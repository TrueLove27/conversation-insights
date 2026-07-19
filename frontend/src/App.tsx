import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import AgentsPage from "./pages/Agents";
import AnalyzePage from "./pages/Analyze";
import CallsPage from "./pages/Calls";
import DashboardPage from "./pages/Dashboard";
import IntegrationsPage from "./pages/Integrations";
import JobsPage from "./pages/Jobs";
import KnowledgeAssistPage from "./pages/KnowledgeAssist";
import SimilarCallsPage from "./pages/SimilarCalls";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="calls" element={<CallsPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="knowledge" element={<KnowledgeAssistPage />} />
          <Route path="similar-calls" element={<SimilarCallsPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
