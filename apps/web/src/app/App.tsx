import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { MarketingLayout } from '../components/layout/MarketingLayout.js';
import { Spinner } from '../components/ui/Misc.js';
import { isStaff, useAuth } from '../lib/auth.js';

import { HomePage } from '../features/marketing/HomePage.js';
import { HowItWorksPage } from '../features/marketing/HowItWorksPage.js';
import { LearnPage } from '../features/marketing/LearnPage.js';
import { MissionPage } from '../features/marketing/MissionPage.js';
import { NotFoundPage } from '../features/marketing/NotFoundPage.js';

import { LoginPage } from '../features/auth/LoginPage.js';
import { SignupPage } from '../features/auth/SignupPage.js';

import { ChoosePathPage } from '../features/onboarding/ChoosePathPage.js';
import { EducationPage } from '../features/onboarding/EducationPage.js';
import { ExistingRightsPage } from '../features/onboarding/ExistingRightsPage.js';
import { ProfilePage } from '../features/onboarding/ProfilePage.js';

import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { MoneyPage } from '../features/dashboard/MoneyPage.js';
import { MissionHubPage } from '../features/dashboard/MissionHubPage.js';
import { NotificationsPage } from '../features/dashboard/NotificationsPage.js';
import { DocumentsPage } from '../features/documents/DocumentsPage.js';

import { SongListPage } from '../features/song/SongListPage.js';
import { NewSongPage } from '../features/song/NewSongPage.js';
import { SongLayout } from '../features/song/SongLayout.js';
import { CollaboratorsStep } from '../features/song/CollaboratorsStep.js';
import { SongwritingStep } from '../features/song/SongwritingStep.js';
import { MasterStep } from '../features/song/MasterStep.js';
import { RevenueStep } from '../features/song/RevenueStep.js';
import { ExpensesStep } from '../features/song/ExpensesStep.js';
import { DealPage } from '../features/song/DealPage.js';
import { MyDealPage } from '../features/song/MyDealPage.js';

import { AgreementPage } from '../features/song/AgreementPage.js';
import { SignLinkPage } from '../features/song/SignLinkPage.js';
import { InvitationPage } from '../features/song/InvitationPage.js';

import { YearPage } from '../features/year/YearPage.js';
import { MissionApplicationPage } from '../features/year/MissionApplicationPage.js';

/**
 * Staff screens load on demand. An artist signing one song has no reason to download the
 * whole admin area, and staff pay the cost once.
 */
const AdminOverviewPage = lazy(() =>
  import('../features/admin/AdminOverviewPage.js').then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminArtistPage = lazy(() =>
  import('../features/admin/AdminArtistPage.js').then((m) => ({ default: m.AdminArtistPage })),
);
const AdminAgreementsPage = lazy(() =>
  import('../features/admin/AdminAgreementsPage.js').then((m) => ({ default: m.AdminAgreementsPage })),
);
const AdminMusicPage = lazy(() =>
  import('../features/admin/AdminMusicPage.js').then((m) => ({ default: m.AdminMusicPage })),
);
const AdminRightsPage = lazy(() =>
  import('../features/admin/AdminRightsPage.js').then((m) => ({ default: m.AdminRightsPage })),
);
const AdminAuditPage = lazy(() =>
  import('../features/admin/AdminAuditPage.js').then((m) => ({ default: m.AdminAuditPage })),
);

function RequireAuth({
  children,
  staffOnly = false,
}: {
  children: React.ReactNode;
  staffOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (staffOnly && !isStaff(user)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<HomePage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="mission" element={<MissionPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="invitations/:token" element={<InvitationPage />} />
        <Route path="sign/:token" element={<SignLinkPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="money" element={<MoneyPage />} />
        <Route path="mission-hub" element={<MissionHubPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="deal" element={<MyDealPage />} />

        <Route path="onboarding/profile" element={<ProfilePage />} />
        <Route path="onboarding/existing-rights" element={<ExistingRightsPage />} />
        <Route path="onboarding/education" element={<EducationPage />} />
        <Route path="onboarding/choose-path" element={<ChoosePathPage />} />

        <Route path="songs" element={<SongListPage />} />
        <Route path="songs/new" element={<NewSongPage />} />
        <Route path="songs/:songId" element={<SongLayout />}>
          <Route index element={<Navigate to="collaborators" replace />} />
          <Route path="collaborators" element={<CollaboratorsStep />} />
          <Route path="songwriting" element={<SongwritingStep />} />
          <Route path="master" element={<MasterStep />} />
          <Route path="revenue" element={<RevenueStep />} />
          <Route path="expenses" element={<ExpensesStep />} />
          <Route path="deal" element={<DealPage />} />
        </Route>

        <Route path="agreements/:agreementId" element={<AgreementPage />} />

        <Route path="year" element={<YearPage />} />
        <Route path="year/application" element={<MissionApplicationPage />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireAuth staffOnly>
            <Suspense fallback={<Spinner label="Opening the staff area" />}>
              <AdminLayout />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="artists/:artistId" element={<AdminArtistPage />} />
        <Route path="agreements" element={<AdminAgreementsPage />} />
        <Route path="music" element={<AdminMusicPage />} />
        <Route path="rights" element={<AdminRightsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>
    </Routes>
  );
}
