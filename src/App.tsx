/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { Sidebar, NavTab } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { AccountsView } from './components/views/AccountsView';
import { EmisView } from './components/views/EmisView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { PinLockModal } from './components/common/PinLockModal';
import { QuickActionModal } from './components/common/QuickActionModal';
import { AddIncomeModal } from './components/modals/AddIncomeModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { TransferMoneyModal } from './components/modals/TransferMoneyModal';
import { PayEmiModal } from './components/modals/PayEmiModal';
import { AddEditAccountModal } from './components/modals/AddEditAccountModal';
import { AddEditLoanModal } from './components/modals/AddEditLoanModal';
import { ReceiptViewerModal } from './components/common/ReceiptViewerModal';
import { SimpleMobileView } from './components/views/SimpleMobileView';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { BankAccount, Loan, Transaction } from './types/finance';
import { ArrowLeft } from 'lucide-react';

export type ModalType =
  | 'quick'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'emi'
  | 'add_account'
  | 'edit_account'
  | 'add_loan'
  | 'edit_loan'
  | 'receipt'
  | null;

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').split('-')[0];
      if (['dashboard', 'transactions', 'accounts', 'emis', 'reports', 'settings'].includes(hash)) {
        return hash as NavTab;
      }
    }
    return 'dashboard';
  });

  // Interface mode state
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(false);

  // Single active modal controller to prevent conflicting state and navigation races
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const activeModalRef = useRef<ModalType>(null);
  activeModalRef.current = activeModal;

  const [presetLoanId, setPresetLoanId] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [receiptData, setReceiptData] = useState<{ imgUrl?: string; title: string }>({ title: '' });

  // Track whether we pushed a history entry for the currently open modal
  const modalHistoryPushedRef = useRef(false);

  // Open modal with clean history state
  const openModal = (type: ModalType) => {
    if (!type) return;
    setActiveModal(type);
    if (typeof window !== 'undefined') {
      // If no modal history state was pushed yet, push one
      if (!modalHistoryPushedRef.current) {
        window.history.pushState(
          { tab: currentTab, isSimple: isSimpleMode, isModal: true },
          '',
          window.location.hash || `#${currentTab}`
        );
        modalHistoryPushedRef.current = true;
      }
    }
  };

  // Close modal safely
  const closeModal = () => {
    setActiveModal(null);
    setEditingAccount(null);
    setEditingLoan(null);
    setEditingTransaction(null);
    setPresetLoanId(undefined);

    if (modalHistoryPushedRef.current) {
      modalHistoryPushedRef.current = false;
      if (typeof window !== 'undefined' && window.history.state?.isModal) {
        window.history.back();
      }
    }
  };

  const handleSelectTab = (tab: NavTab, pushHistory = true) => {
    setIsSimpleMode(false);
    if (pushHistory && typeof window !== 'undefined' && tab !== currentTab) {
      window.history.pushState({ tab, isSimple: false, isModal: false }, '', `#${tab}`);
    }
    setCurrentTab(tab);
  };

  const toggleSimpleMode = () => {
    setIsSimpleMode((prev) => {
      const next = !prev;
      localStorage.setItem('anson_dona_simple_mode', String(next));
      if (typeof window !== 'undefined') {
        window.history.pushState(
          { tab: currentTab, isSimple: next, isModal: false },
          '',
          next ? '#simple' : `#${currentTab}`
        );
      }
      return next;
    });
  };

  // Back button for sub-pages: directly navigates to dashboard without leaving applet
  const handleGoBackToDashboard = () => {
    handleSelectTab('dashboard', true);
  };

  // Browser Back Button & PopState Listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initial state setup if needed
      if (!window.history.state) {
        window.history.replaceState(
          { tab: currentTab, isSimple: isSimpleMode, isModal: false },
          '',
          window.location.hash || '#dashboard'
        );
      }

      const onPopState = (event: PopStateEvent) => {
        // 1. If any modal is currently open when back is pressed, close the modal and remain on page
        if (activeModalRef.current !== null) {
          modalHistoryPushedRef.current = false;
          setActiveModal(null);
          setEditingAccount(null);
          setEditingLoan(null);
          setEditingTransaction(null);
          setPresetLoanId(undefined);
          return;
        }

        // 2. Otherwise navigate to previous tab from history state
        if (event.state && event.state.tab) {
          setCurrentTab(event.state.tab);
          if (typeof event.state.isSimple === 'boolean') {
            setIsSimpleMode(event.state.isSimple);
          }
        } else {
          // Fallback based on clean hash
          const cleanHash = window.location.hash.replace('#', '').split('-')[0];
          if (['dashboard', 'transactions', 'accounts', 'emis', 'reports', 'settings'].includes(cleanHash)) {
            setCurrentTab(cleanHash as NavTab);
          } else {
            setCurrentTab('dashboard');
          }
        }
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [currentTab, isSimpleMode]);

  // Actions from quick action menu
  const handleSelectQuickAction = (action: 'income' | 'expense' | 'transfer' | 'emi') => {
    if (action === 'income') {
      openModal('income');
    } else if (action === 'expense') {
      setEditingTransaction(null);
      openModal('expense');
    } else if (action === 'transfer') {
      openModal('transfer');
    } else if (action === 'emi') {
      setPresetLoanId(undefined);
      openModal('emi');
    }
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    openModal('expense');
  };

  const handlePayEmiForLoan = (loanId?: string) => {
    setPresetLoanId(loanId);
    openModal('emi');
  };

  const handleOpenEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    openModal('edit_account');
  };

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    openModal('add_account');
  };

  const handleOpenEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    openModal('edit_loan');
  };

  const handleOpenAddLoan = () => {
    setEditingLoan(null);
    openModal('add_loan');
  };

  const handleViewReceipt = (imgUrl: string, title: string) => {
    setReceiptData({ imgUrl, title });
    openModal('receipt');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Header */}
      <DashboardHeader
        onOpenQuickAction={() => openModal('quick')}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={toggleSimpleMode}
      />

      {/* Main Body with Desktop Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onOpenQuickAction={() => openModal('quick')}
          isSimpleMode={isSimpleMode}
          onToggleSimpleMode={toggleSimpleMode}
        />

        {/* Content View Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 bg-slate-50/40">
          {/* Visual Back Button for sub-pages to return safely to Dashboard */}
          {!isSimpleMode && currentTab !== 'dashboard' && (
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleGoBackToDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Back to Dashboard</span>
              </button>
              <span className="text-xs font-bold text-slate-400 capitalize tracking-wider">
                {currentTab}
              </span>
            </div>
          )}

          {/* If Simple Mobile Mode is on, show dedicated 1-touch mobile view */}
          {isSimpleMode ? (
            <SimpleMobileView
              onSwitchToFullView={() => {
                setIsSimpleMode(false);
                handleSelectTab('dashboard');
              }}
              onOpenQuickAction={() => openModal('quick')}
              onOpenIncome={() => openModal('income')}
              onOpenTransfer={() => openModal('transfer')}
              onOpenEmi={() => openModal('emi')}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  onOpenQuickAction={() => openModal('quick')}
                  onOpenActionType={handleSelectQuickAction}
                  onSelectTab={handleSelectTab}
                  onViewReceipt={handleViewReceipt}
                />
              )}

              {currentTab === 'transactions' && (
                <TransactionsView
                  onEditTransaction={handleEditTx}
                  onViewReceipt={handleViewReceipt}
                  onOpenQuickAction={() => openModal('quick')}
                />
              )}

              {currentTab === 'accounts' && (
                <AccountsView
                  onOpenAddAccount={handleOpenAddAccount}
                  onEditAccount={handleOpenEditAccount}
                  onOpenTransfer={() => openModal('transfer')}
                  onOpenQuickIncome={() => openModal('income')}
                />
              )}

              {currentTab === 'emis' && (
                <EmisView
                  onOpenAddLoan={handleOpenAddLoan}
                  onEditLoan={handleOpenEditLoan}
                  onPayEmi={handlePayEmiForLoan}
                />
              )}

              {currentTab === 'reports' && <ReportsView />}

              {currentTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickAction={() => openModal('quick')}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={toggleSimpleMode}
      />

      {/* Offline Alert */}
      <OfflineIndicator />

      {/* PIN Security Overlay */}
      <PinLockModal />

      {/* Modals & Overlays - using centralized activeModal to prevent race conditions */}
      <QuickActionModal
        isOpen={activeModal === 'quick'}
        onClose={closeModal}
        onSelectAction={handleSelectQuickAction}
      />

      <AddIncomeModal
        isOpen={activeModal === 'income'}
        onClose={closeModal}
      />

      <AddExpenseModal
        isOpen={activeModal === 'expense'}
        onClose={closeModal}
        editTx={editingTransaction}
      />

      <TransferMoneyModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
      />

      <PayEmiModal
        isOpen={activeModal === 'emi'}
        onClose={closeModal}
        presetLoanId={presetLoanId}
      />

      <AddEditAccountModal
        isOpen={activeModal === 'add_account' || activeModal === 'edit_account'}
        onClose={closeModal}
        editAccount={editingAccount}
      />

      <AddEditLoanModal
        isOpen={activeModal === 'add_loan' || activeModal === 'edit_loan'}
        onClose={closeModal}
        editLoanData={editingLoan}
      />

      <ReceiptViewerModal
        isOpen={activeModal === 'receipt'}
        imageUrl={receiptData.imgUrl}
        title={receiptData.title}
        onClose={closeModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </ErrorBoundary>
  );
}
