import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProjectStore } from './context/ProjectContext';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';
import { AuthLandingPage } from './components/AuthLandingPage';
import { GatewayScreen } from './components/GatewayScreen';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AllProjectsView } from './components/AllProjectsView';
import { ReportingView } from './components/ReportingView';
import { LatestUpdatesView } from './components/LatestUpdatesView';
import { DatabaseConnectView } from './components/DatabaseConnectView';
import { AdminPanelView } from './components/AdminPanelView';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ProjectFormModal } from './components/ProjectFormModal';
import { BulkAddModal } from './components/BulkAddModal';
import { AdminExportModal } from './components/AdminExportModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { MandatoryGoogleSheetsModal } from './components/MandatoryGoogleSheetsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { PublicProjectsDirectoryView } from './components/PublicProjectsDirectoryView';
import { ProjectItem } from './types';

function AppContent() {
  const { isAuthenticated, isAdmin, needsPostLoginSync, completePostLoginSync } = useAuth();
  const { currentLevel, currentView } = useProjectStore();

  // State to switch to Public Project Details Directory page
  const [isViewingPublicProjects, setIsViewingPublicProjects] = useState(false);

  // Initial 5-second animated loading screen
  const [hasInitialLoaded, setHasInitialLoaded] = useState(() => {
    // Check if previously loaded in session
    return sessionStorage.getItem('cmc_initial_loaded') === 'true';
  });

  // Modals state
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ProjectItem | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ProjectItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('cmc_initial_loaded', 'true');
    setHasInitialLoaded(true);
  };

  // 0. Initial Loading Screen prior to entering main site
  if (!hasInitialLoaded) {
    return <InitialLoadingScreen onComplete={handleLoadingComplete} durationSeconds={5} />;
  }

  // Public Projects Directory View (Read-only catalog for each academic year)
  if (isViewingPublicProjects) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="min-h-screen"
      >
        <PublicProjectsDirectoryView
          onBackToHome={() => setIsViewingPublicProjects(false)}
          onOpenLogin={() => setIsViewingPublicProjects(false)}
        />
      </motion.div>
    );
  }

  // 1. First Gate: Authentication (Landing Page with Glassmorphism Login)
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen"
      >
        <AuthLandingPage onViewProjects={() => setIsViewingPublicProjects(true)} />
      </motion.div>
    );
  }

  // 2. Second Gate: Education Level Selection (Bento Grid)
  if (!currentLevel) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-screen"
      >
        <GatewayScreen />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] flex flex-col font-sans"
    >
      {/* Navigation Bar */}
      <Navbar
        onOpenAddModal={() => {
          setProjectToEdit(null);
          setIsAddModalOpen(true);
        }}
        onOpenBulkAddModal={() => setIsBulkAddModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
        onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
        onOpenPublicCatalog={() => setIsViewingPublicProjects(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {/* Latest Updates View (Vertical Timeline) */}
          {currentView === 'latest_updates' && (
            <motion.div
              key="view-latest-updates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <LatestUpdatesView />
            </motion.div>
          )}

          {/* Database Connect View */}
          {currentView === 'database_connect' && (
            <motion.div
              key="view-db-connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <DatabaseConnectView />
            </motion.div>
          )}

          {/* User Reporting View (Main Bento Grid with Smart Sorting) */}
          {(currentView === 'reporting' || (!isAdmin && currentView !== 'latest_updates' && currentView !== 'database_connect')) && (
            <motion.div
              key="view-reporting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <ReportingView
                onViewDetails={(proj) => setSelectedProjectForDetail(proj)}
                onEditFullProject={(proj) => {
                  setProjectToEdit(proj);
                  setIsAddModalOpen(true);
                }}
                onOpenAddModal={() => {
                  setProjectToEdit(null);
                  setIsAddModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* Admin Dashboard */}
          {isAdmin && currentView === 'dashboard' && (
            <motion.div
              key="view-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <DashboardView
                onViewDetails={(proj) => setSelectedProjectForDetail(proj)}
                onOpenAddModal={() => {
                  setProjectToEdit(null);
                  setIsAddModalOpen(true);
                }}
                onOpenBulkAddModal={() => setIsBulkAddModalOpen(true)}
                onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
              />
            </motion.div>
          )}

          {/* Admin All Projects Table */}
          {isAdmin && currentView === 'all_projects' && (
            <motion.div
              key="view-all-projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <AllProjectsView
                onViewDetails={(proj) => setSelectedProjectForDetail(proj)}
                onOpenAddModal={() => {
                  setProjectToEdit(null);
                  setIsAddModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* Admin Panel */}
          {isAdmin && currentView === 'admin_panel' && (
            <motion.div
              key="view-admin-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <AdminPanelView
                onViewDetails={(proj) => setSelectedProjectForDetail(proj)}
                onOpenAddModal={() => {
                  setProjectToEdit(null);
                  setIsAddModalOpen(true);
                }}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Project Detail Modal */}
      {selectedProjectForDetail && (
        <ProjectDetailModal
          project={selectedProjectForDetail}
          onClose={() => setSelectedProjectForDetail(null)}
          onEdit={(proj) => {
            setSelectedProjectForDetail(null);
            setProjectToEdit(proj);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Add / Edit Project Modal */}
      {isAddModalOpen && (
        <ProjectFormModal
          project={projectToEdit}
          onClose={() => {
            setIsAddModalOpen(false);
            setProjectToEdit(null);
          }}
          onSaved={(saved) => {
            if (selectedProjectForDetail?.id === saved.id) {
              setSelectedProjectForDetail(saved);
            }
          }}
        />
      )}

      {/* Bulk Add Modal (Admin) */}
      {isBulkAddModalOpen && (
        <BulkAddModal onClose={() => setIsBulkAddModalOpen(false)} />
      )}

      {/* Admin Offline Export Modal (Excel, CSV, JSON) */}
      {isExportModalOpen && (
        <AdminExportModal onClose={() => setIsExportModalOpen(false)} />
      )}

      {/* Admin Google Sheets Online Database Modal */}
      {isGoogleSheetsModalOpen && isAdmin && (
        <GoogleSheetsModal onClose={() => setIsGoogleSheetsModalOpen(false)} />
      )}

      {/* Edit User Profile Modal */}
      {isEditProfileModalOpen && (
        <EditProfileModal onClose={() => setIsEditProfileModalOpen(false)} />
      )}

      {/* Mandatory / Post-login Google Sheets Connection Modal */}
      {needsPostLoginSync && (
        <MandatoryGoogleSheetsModal
          onClose={() => {
            completePostLoginSync();
          }}
        />
      )}
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}
