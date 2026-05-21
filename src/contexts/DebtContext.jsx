import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, setDoc, writeBatch, where,
} from 'firebase/firestore';

const DEBTS_COLLECTION = 'debts';
const SETTINGS_COLLECTION = 'settings';
const PROFILES_COLLECTION = 'debtorProfiles';

// ── Utility Functions ─────────────────────────
export function formatCurrency(num) {
  if (num === undefined || num === null) return 'R0.00';
  return 'R' + Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function monthsBetween(date1, date2) {
  if (!date1 || !date2) return 1;
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
}

export function calcSimpleInterest(borrowed, monthlyRatePercent, months) {
  const m = Math.max(1, months || 1);
  return borrowed * (monthlyRatePercent / 100) * m;
}

export function calcCompoundInterest(borrowed, monthlyRatePercent, months) {
  const m = Math.max(1, months || 1);
  return borrowed * (Math.pow(1 + monthlyRatePercent / 100, m) - 1);
}

export function calcReturn(borrowed, monthlyRatePercent, months = 1, isCompound = false) {
  const m = Math.max(1, months || 1);
  if (isCompound) return borrowed + calcCompoundInterest(borrowed, monthlyRatePercent, m);
  return borrowed + calcSimpleInterest(borrowed, monthlyRatePercent, m);
}

export function calcLatePenalty(amount, penaltyRate, monthsLate) {
  if (monthsLate <= 0) return 0;
  return amount * (penaltyRate / 100) * monthsLate;
}

export function calculateTotalOwed(debt) {
  const months = monthsBetween(debt.date, getTodayDate());
  const currentReturn = calcReturn(debt.borrowedAmount, debt.interestRate, months, debt.isCompound);
  let penalty = 0;
  if (debt.dueDate && !debt.paid) {
    const dueDate = new Date(debt.dueDate + 'T00:00:00');
    const today = new Date(getTodayDate() + 'T00:00:00');
    if (today > dueDate) {
      const monthsLate = monthsBetween(debt.dueDate, getTodayDate());
      penalty = calcLatePenalty(currentReturn, debt.penaltyRate, monthsLate);
    }
  }
  return currentReturn + penalty;
}

function migrateDebt(entry) {
  if (!entry.hasOwnProperty('interestRate')) entry.interestRate = 50;
  if (!entry.hasOwnProperty('isCompound')) entry.isCompound = false;
  if (!entry.hasOwnProperty('penaltyRate')) entry.penaltyRate = 50;
  if (!entry.hasOwnProperty('dueDate')) entry.dueDate = null;
  if (!entry.hasOwnProperty('profileId')) entry.profileId = null;
  if (!entry.hasOwnProperty('userId')) entry.userId = '';
  if (!entry.hasOwnProperty('monthlyRate')) entry.monthlyRate = entry.interestRate;
  if (entry.borrowedAmount === undefined && entry.amount !== undefined) {
    entry.borrowedAmount = entry.amount;
    entry.returnAmountOwed = entry.amount * 1.5;
    delete entry.amount;
  }
  if (!Array.isArray(entry.repayments)) entry.repayments = [];
  if (!entry.paid && entry.dueDate) {
    const totalOwed = calculateTotalOwed(entry);
    if (totalOwed > entry.returnAmountOwed) {
      entry.returnAmountOwed = Math.round(totalOwed * 100) / 100;
    }
  }
  return entry;
}

const DebtContext = createContext();

export function useDebts() {
  return useContext(DebtContext);
}

export function DebtProvider({ children }) {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [globalInterestRate, setGlobalInterestRate] = useState(50);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, SETTINGS_COLLECTION, user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setGlobalInterestRate(docSnap.data().value || 50);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (loaded && user) {
      const docRef = doc(db, SETTINGS_COLLECTION, user.uid);
      setDoc(docRef, { value: globalInterestRate }, { merge: true });
    }
  }, [globalInterestRate, loaded, user]);

  useEffect(() => {
    if (!user) { setDebts([]); setLoaded(true); return; }
    const q = query(collection(db, DEBTS_COLLECTION), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const debtList = [];
      snapshot.forEach((doc) => debtList.push({ firestoreId: doc.id, ...doc.data() }));
      setDebts(debtList.map(migrateDebt));
      setLoaded(true);
    }, (error) => { console.error('Error loading debts:', error); setDebts([]); setLoaded(true); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!loaded || !user || debts.length === 0) return;
    const updateOverdueDebts = async () => {
      const today = new Date(getTodayDate() + 'T00:00:00');
      for (const debt of debts) {
        if (debt.paid) continue;
        if (!debt.dueDate) continue;
        const dueDate = new Date(debt.dueDate + 'T00:00:00');
        if (today <= dueDate) continue;
        const totalOwed = calculateTotalOwed(debt);
        if (Math.abs(totalOwed - debt.returnAmountOwed) > 0.01) {
          const debtRef = doc(db, DEBTS_COLLECTION, debt.firestoreId);
          await updateDoc(debtRef, { returnAmountOwed: Math.round(totalOwed * 100) / 100 });
        }
      }
    };
    updateOverdueDebts();
    const interval = setInterval(updateOverdueDebts, 3600000);
    return () => clearInterval(interval);
  }, [debts, loaded, user]);

  useEffect(() => {
    if (!user) { setProfiles([]); return; }
    const q = query(collection(db, PROFILES_COLLECTION), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profileList = [];
      snapshot.forEach((doc) => profileList.push({ id: doc.id, ...doc.data() }));
      setProfiles(profileList);
    });
    return () => unsubscribe();
  }, [user]);

  // ── Add a new debt ──────────────────────────
  const addDebt = useCallback(async ({
    name, borrowedAmount, note, interestRate, date,
    isCompound = false, dueDate = null, penaltyRate = 50, profileId = null
  }) => {
    if (!user) return;
    const rate = interestRate !== undefined ? interestRate : globalInterestRate;
    const debtDate = date || getTodayDate();
    const startDate = new Date(debtDate + 'T00:00:00');
    const defaultDueDate = new Date(startDate);
    defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);
    const dueDateStr = dueDate || defaultDueDate.toISOString().split('T')[0];
    const months = monthsBetween(debtDate, getTodayDate());
    const totalReturn = calcReturn(borrowedAmount, rate, months, isCompound);
    const newDebt = {
      userId: user.uid, name,
      borrowedAmount: Math.round(borrowedAmount * 100) / 100,
      returnAmountOwed: Math.round(totalReturn * 100) / 100,
      interestRate: rate, monthlyRate: rate, isCompound, penaltyRate,
      note: note || '', date: debtDate, dueDate: dueDateStr,
      profileId: profileId || null, paid: false, paidDate: null,
      repayments: [], createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, DEBTS_COLLECTION), newDebt);
  }, [globalInterestRate, user]);

  // ── Record a single repayment ───────────────
  const addRepayment = useCallback(async (debtorId, repaymentAmount, repaymentDate) => {
    const debt = debts.find(d => d.firestoreId === debtorId);
    if (!debt) return;
    const date = repaymentDate || getTodayDate();
    const newRepayment = { amount: Math.round(repaymentAmount * 100) / 100, date };
    const updatedRepayments = [...(debt.repayments || []), newRepayment];
    const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
    const totalOwed = calculateTotalOwed(debt);
    const newReturnOwed = Math.max(0, Math.round((totalOwed - totalRepaid) * 100) / 100);
    const isPaid = newReturnOwed <= 0;
    const debtRef = doc(db, DEBTS_COLLECTION, debtorId);
    await updateDoc(debtRef, { repayments: updatedRepayments, returnAmountOwed: newReturnOwed, paid: isPaid, paidDate: isPaid ? date : null });
  }, [debts]);

  // ── Record a group repayment ────────────────
  const addGroupRepayment = useCallback(async (debtIds, totalAmount, repaymentDate) => {
    if (!user || !debtIds || debtIds.length === 0) return;
    const date = repaymentDate || getTodayDate();
    const groupRepaymentId = 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    let remainingToApply = Math.round(totalAmount * 100) / 100;
    const targetDebts = debts.filter(d => debtIds.includes(d.firestoreId) && !d.paid);

    for (const debt of targetDebts) {
      if (remainingToApply <= 0) break;
      const applyToThisDebt = Math.min(remainingToApply, debt.returnAmountOwed);
      
      const newRepayment = {
        amount: Math.round(applyToThisDebt * 100) / 100,
        date,
        groupId: groupRepaymentId,
        groupTotal: Math.round(totalAmount * 100) / 100,
      };

      const updatedRepayments = [...(debt.repayments || []), newRepayment];
      const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      const totalOwed = calculateTotalOwed(debt);
      const newOwed = Math.max(0, Math.round((totalOwed - totalRepaid) * 100) / 100);
      const isPaid = newOwed <= 0;

      const debtRef = doc(db, DEBTS_COLLECTION, debt.firestoreId);
      await updateDoc(debtRef, { repayments: updatedRepayments, returnAmountOwed: newOwed, paid: isPaid, paidDate: isPaid ? date : null });

      remainingToApply = Math.round((remainingToApply - applyToThisDebt) * 100) / 100;
    }
  }, [debts, user]);

  const addProfile = useCallback(async ({ name, phone, email, address, notes }) => {
    if (!user) return;
    await addDoc(collection(db, PROFILES_COLLECTION), { userId: user.uid, name, phone: phone || '', email: email || '', address: address || '', notes: notes || '', createdAt: new Date().toISOString() });
  }, [user]);

  const updateProfile = useCallback(async (profileId, data) => {
    await updateDoc(doc(db, PROFILES_COLLECTION, profileId), data);
  }, []);

  const deleteProfile = useCallback(async (profileId) => {
    await deleteDoc(doc(db, PROFILES_COLLECTION, profileId));
  }, []);

  const deleteDebt = useCallback(async (firestoreId) => {
    await deleteDoc(doc(db, DEBTS_COLLECTION, firestoreId));
  }, []);

  const clearAllPaid = useCallback(async () => {
    const paidDebts = debts.filter(d => d.paid);
    if (paidDebts.length === 0) return;
    const batch = writeBatch(db);
    paidDebts.forEach(debt => batch.delete(doc(db, DEBTS_COLLECTION, debt.firestoreId)));
    await batch.commit();
  }, [debts]);

  const value = {
    debts, profiles, loaded, isOnline,
    interestRate: globalInterestRate, setInterestRate: setGlobalInterestRate,
    addDebt, addRepayment, addGroupRepayment, deleteDebt, clearAllPaid,
    addProfile, updateProfile, deleteProfile,
  };

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
}