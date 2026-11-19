/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { NavTab } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { MoreMenuSheet } from './components/navigation/MoreMenuSheet';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { AccountsView } from './components/views/AccountsView';
import { EmisView } from './components/views/EmisView';
import { DailyNotesView } from './components/views/DailyNotesView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { PinLockModal } from './components/common/PinLockModal';
import { LoginModal } from './components/common/LoginModal';
import { QuickActionModal } from './components/common/QuickActionModal';
import { AddIncomeModal } from './components/modals/AddIncomeModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { TransferMoneyModal } from './components/modals/TransferMoneyModal';
import { PayEmiModal } from './components/modals/PayEmiModal';
import { AddEditAccountModal } from './components/modals/AddEditAccountModal';
import { AddEditLoanModal } from './components/modals/AddEditLoanModal';
import { AddEditNoteModal } from './components/modals/AddEditNoteModal';
import { BudgetManagementModal } from './components/modals/BudgetManagementModal';
import { ReceiptViewerModal } from './components/common/ReceiptViewerModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { NotificationBanner } from './components/common/NotificationBanner';
import { BankAccount, DailyNote, Loan, LoanType, NoteType, Transaction } from './types/finance';

export type ModalType =
  | 'quick'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'emi'
  | 'budget'
  | 'add_account'
  | 'edit_account'
  | 'add_loan'
  | 'edit_loan'
  | 'add_note'
  | 'edit_note'
  | 'receipt'
  | 'more_menu'
  | null;

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').split('-')[0];
      if (['dashboard', 'transactions', 'accounts', 'emis', 'notes', 'reports', 'settings'].includes(hash)) {
        return hash as NavTab;
      }
    }
    return 'dashboard';
  });

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const activeModalRef = useRef<ModalType>(null);
  activeModalRef.current = activeModal;

  const [presetLoanId, setPresetLoanId] = useState<string | undefined>(undefined);
  const [presetLoanType, setPresetLoanType] = useState<LoanType | undefined>(undefined);
  const [returnToPayEmi, setReturnToPayEmi] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);
  const [presetNoteDate, setPresetNoteDate] = useState<string | undefined>(undefined);
  const [presetNoteType, setPresetNoteType] = useState<NoteType | undefined>(undefined);
  const [receiptData, setReceiptData] = useState<{ imgUrl?: string; title: string }>({ title: '' });

  const modalHistoryPushedRef = useRef(false);

  const openModal = (type: ModalType) => {
    if (!type) return;
    setActiveModal(type);
    if (typeof window !== 'undefined') {
      if (!modalHistoryPushedRef.current) {
        window.history.pushState(
          { tab: currentTab, isModal: true },
          '',
          window.location.hash || `#${currentTab}`
        );
        modalHistoryPushedRef.current = true;
      }
    }
  };

  const closeModal = (saved?: boolean, createdLoanId?: string) => {
    const closedType = activeModal;

    // If user clicked "+ Add Loan" inside PayEmiModal, return straight back to PayEmiModal
    if (closedType === 'add_loan' && returnToPayEmi) {
      setReturnToPayEmi(false);
      setPresetLoanType(undefined);
      setEditingLoan(null);
      if (saved && createdLoanId) {
        setPresetLoanId(createdLoanId);
      }
      setActiveModal('emi');
      return;
    }

    setActiveModal(null);
    setEditingAccount(null);
    setEditingLoan(null);
    setEditingTransaction(null);
    setEditingNote(null);
    setPresetNoteDate(undefined);
    setPresetNoteType(undefined);
    setPresetLoanId(undefined);
    setPresetLoanType(undefined);
    setReturnToPayEmi(false);

    if (saved) {
      if (closedType === 'add_account' || closedType === 'edit_account') {
        setCurrentTab('accounts');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ tab: 'accounts', isModal: false }, '', '#accounts');
        }
      } else if (closedType === 'add_loan' || closedType === 'edit_loan' || closedType === 'emi') {
        setCurrentTab('emis');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ tab: 'emis', isModal: false }, '', '#emis');
        }
      } else if (closedType === 'add_note' || closedType === 'edit_note') {
        setCurrentTab('notes');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ tab: 'notes', isModal: false }, '', '#notes');
        }
      } else {
        setCurrentTab('transactions');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ tab: 'transactions', isModal: false }, '', '#transactions');
        }
      }
      modalHistoryPushedRef.current = false;
      return;
    }

    if (modalHistoryPushedRef.current) {
      modalHistoryPushedRef.current = false;
      if (typeof window !== 'undefined' && window.history.state?.isModal) {
        window.history.back();
      }
    }
  };

  const handleSelectTab = (tab: NavTab, pushHistory = true) => {
    if (pushHistory && typeof window !== 'undefined' && tab !== currentTab) {
      window.history.pushState({ tab, isModal: false }, '', `#${tab}`);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.history.state) {
        window.history.replaceState(
          { tab: currentTab, isModal: false },
          '',
          window.location.hash || '#dashboard'
        );
      }

      const onPopState = (event: PopStateEvent) => {
        if (activeModalRef.current !== null) {
          modalHistoryPushedRef.current = false;
          setActiveModal(null);
          setEditingAccount(null);
          setEditingLoan(null);
          setEditingTransaction(null);
          setEditingNote(null);
          setPresetNoteDate(undefined);
          setPresetNoteType(undefined);
          setPresetLoanId(undefined);
          return;
        }

        if (event.state && event.state.tab) {
          setCurrentTab(event.state.tab);
        } else {
          const cleanHash = window.location.hash.replace('#', '').split('-')[0];
          if (['dashboard', 'transactions', 'accounts', 'emis', 'notes', 'reports', 'settings'].includes(cleanHash)) {
            setCurrentTab(cleanHash as NavTab);
          } else {
            setCurrentTab('dashboard');
          }
        }
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [currentTab]);

  const handleSelectQuickAction = (action: 'income' | 'expense' | 'transfer' | 'emi') => {
    setEditingTransaction(null);
    if (action === 'income') {
      openModal('income');
    } else if (action === 'expense') {
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
    if (tx.type === 'income') {
      openModal('income');
    } else if (tx.type === 'transfer') {
      openModal('transfer');
    } else if (tx.type === 'emi_payment') {
      setPresetLoanId(tx.loanId);
      openModal('emi');
    } else {
      openModal('expense');
    }
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
    setPresetLoanType(loan.type);
    openModal('edit_loan');
  };

  const handleOpenAddLoan = (loanType?: LoanType) => {
    setEditingLoan(null);
    setPresetLoanType(loanType || 'home_loan');
    openModal('add_loan');
  };

  const handleOpenAddGoldLoan = () => {
    setEditingLoan(null);
    setPresetLoanType('gold_loan');
    openModal('add_loan');
  };

  const handleAddLoanFromPayEmi = (loanType?: LoanType) => {
    setEditingLoan(null);
    setPresetLoanType(loanType || 'home_loan');
    setReturnToPayEmi(true);
    openModal('add_loan');
  };

  const handleOpenAddNote = (presetDate?: string, presetType?: NoteType) => {
    setEditingNote(null);
    setPresetNoteDate(presetDate);
    setPresetNoteType(presetType);
    openModal('add_note');
  };

  const handleOpenEditNote = (note: DailyNote) => {
    setEditingNote(note);
    setPresetNoteDate(undefined);
    setPresetNoteType(undefined);
    openModal('edit_note');
  };

  const handleViewReceipt = (imgUrl: string, title: string) => {
    setReceiptData({ imgUrl, title });
    openModal('receipt');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Clean Single-Row Top Header */}
      <DashboardHeader
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickAction={() => openModal('quick')}
      />

      {/* Centered, Uncluttered Content Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            onOpenQuickAction={() => openModal('quick')}
            onOpenActionType={handleSelectQuickAction}
            onOpenBudgetModal={() => openModal('budget')}
            onSelectTab={handleSelectTab}
            onViewReceipt={handleViewReceipt}
            onEditTransaction={handleEditTx}
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
            onOpenAddLoan={() => handleOpenAddLoan('home_loan')}
            onOpenAddGoldLoan={handleOpenAddGoldLoan}
            onEditLoan={handleOpenEditLoan}
            onPayEmi={handlePayEmiForLoan}
            onEditTransaction={handleEditTx}
          />
        )}

        {currentTab === 'notes' && (
          <DailyNotesView
            onOpenAddNote={handleOpenAddNote}
            onEditNote={handleOpenEditNote}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenQuickAction={() => openModal('quick')}
        onOpenMoreMenu={() => openModal('more_menu')}
      />

      {/* Offline Alert */}
      <OfflineIndicator />

      {/* Live Phone & EMI Notification Toast Stack */}
      <NotificationBanner />

      {/* Password Login System (unchanged behavior) */}
      <LoginModal />

      {/* PIN Security Overlay */}
      <PinLockModal />

      {/* Mobile More Menu Sheet */}
      <MoreMenuSheet
        isOpen={activeModal === 'more_menu'}
        onClose={() => closeModal()}
        onSelectTab={handleSelectTab}
        onOpenBudgetModal={() => openModal('budget')}
      />

      {/* Modals & Sheets */}
      <QuickActionModal
        isOpen={activeModal === 'quick'}
        onClose={() => closeModal()}
        onSelectAction={handleSelectQuickAction}
      />

      <AddIncomeModal
        isOpen={activeModal === 'income'}
        onClose={closeModal}
        editTx={editingTransaction}
      />

      <AddExpenseModal
        isOpen={activeModal === 'expense'}
        onClose={closeModal}
        editTx={editingTransaction}
      />

      <TransferMoneyModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
        editTx={editingTransaction}
      />

      <PayEmiModal
        isOpen={activeModal === 'emi'}
        onClose={closeModal}
        presetLoanId={presetLoanId}
        editTx={editingTransaction}
        onOpenAddLoan={handleAddLoanFromPayEmi}
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
        presetLoanType={presetLoanType}
      />

      <AddEditNoteModal
        isOpen={activeModal === 'add_note' || activeModal === 'edit_note'}
        onClose={closeModal}
        editNote={editingNote}
        presetDate={presetNoteDate}
        presetType={presetNoteType}
      />

      <BudgetManagementModal
        isOpen={activeModal === 'budget'}
        onClose={closeModal}
      />

      <ReceiptViewerModal
        isOpen={activeModal === 'receipt'}
        imageUrl={receiptData.imgUrl}
        title={receiptData.title}
        onClose={() => closeModal()}
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
