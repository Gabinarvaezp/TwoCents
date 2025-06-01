import React, { useState, useEffect } from "react";
import {
  Box, Flex, Avatar, Text, Button, HStack, VStack, Divider, IconButton, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Progress, SimpleGrid, Badge, Select, Table, Thead, Tbody, Tr, Th, Td,
  extendTheme, ChakraProvider, useBreakpointValue, Checkbox
} from "@chakra-ui/react";
import { FaPlus, FaSync, FaSignOutAlt, FaPiggyBank, FaUsers, FaHome, FaTrash, FaFileExport, FaArrowDown, FaArrowUp, FaChevronDown, FaChevronUp, FaRegCalendarAlt, FaRegCreditCard, FaTable, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";
import { supabase } from "./supabaseClient";

// --- Custom Theme (brown/beige/gold) ---
const theme = extendTheme({
  colors: {
    primary: {
      50:  "#f8f4f0",
      100: "#f1e6dd",
      200: "#e2cfc3",
      300: "#cbb49e",
      400: "#b89a7a",
      500: "#a67c52",   // Main brown-gold
      600: "#8c6844",
      700: "#6e5235",
      800: "#4d3923",
      900: "#2e1e12",
    },
    gabby: {
      400: "#e48ab6", // Pink
      500: "#f7b6d2"
    },
    jorgie: {
      400: "#4a90e2", // Blue
      500: "#7db7e8"
    }
  }
});

// --- User Configuration ---
const users = [
  {
    name: "Gabby",
    label: "Wifey",
    avatar: "/wifey.jpg",
    currency: "COP",
    color: theme.colors.gabby[400],
    chartColor: theme.colors.gabby[500]
  },
  {
    name: "Jorgie",
    label: "Hubby",
    avatar: "/hubby.jpg",
    currency: "USD",
    color: theme.colors.jorgie[400],
    chartColor: theme.colors.jorgie[500]
  }
];
const COP_TO_USD = 4500;
const CATEGORIES = [
  "Wifey", "Hubby", "Food", "Cooper", "Golf", "Car Wash", "Travel", "Family", "Public Transport", "Housing", "Beer", "Snacks", "Health", "Entertainment/Friends", "Shopping", "Other"
];
const INCOME_SOURCES = ["First Check", "Second Check", "Both", "Other"];
const PASTEL_COLORS = [theme.colors.gabby[500], theme.colors.jorgie[500], "#B5EAD7", "#FFDAC1", "#C7CEEA", "#F3B0C3", "#B5B9FF", "#FFD6E0"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatCurrency(amount, currency) {
  if (currency === "COP") return "COL$" + Number(amount).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  return "$" + Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function prettyDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function parseAmount(str) {
  if (!str) return 0;
  return Number(str.replace(/,/g, ".").replace(/[^0-9.]/g, ""));
}
function convert(amount, from, to) {
  if (from === to) return amount;
  if (from === "USD" && to === "COP") return amount * COP_TO_USD;
  if (from === "COP" && to === "USD") return amount / COP_TO_USD;
  return amount;
}
function getMonthIndex(dateStr) {
  const d = new Date(dateStr);
  return d.getMonth();
}
function getYear(dateStr) {
  return new Date(dateStr).getFullYear();
}

const MOTIVATIONALS = [
  "Track your progress.",
  "Stay consistent.",
  "Every step matters.",
  "Keep it simple.",
  "Small wins add up.",
  "Stay on track.",
  "Plan. Save. Grow.",
  "Your goals, your pace.",
  "Progress, not perfection.",
  "Build your future."
];

function getMotivational() {
  return MOTIVATIONALS[Math.floor(Math.random() * MOTIVATIONALS.length)];
}

const TYPE_EMOJIS = {
  income: "💸",
  expenses: "🛒",
  savings: "🏦",
  debts: "💳"
};

function FixedExpensesSummary({ fixedExpenses, periodLabel }) {
  const filtered = fixedExpenses.filter(e => !e.period || e.period === periodLabel);
  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  return (
    <Box>
      <Heading size="sm" mb={2}>Automatic deductions for this {periodLabel} period:</Heading>
      <VStack align="start" spacing={1} mb={2}>
        {filtered.map(e => (
          <Text key={e.id}>{e.name}: {formatCurrency(e.amount, e.currency)}</Text>
        ))}
      </VStack>
      <Text fontWeight="bold">Total: {formatCurrency(total, filtered[0]?.currency || 'USD')}</Text>
    </Box>
  );
}

function DashboardContent() {
  // --- Login State ---
  const [showLogin, setShowLogin] = useState(() => !localStorage.getItem("activeUser"));
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [pendingUser, setPendingUser] = useState(0);

  // --- User State ---
  const [activeUser, setActiveUser] = useState(() => {
    const idx = localStorage.getItem("activeUser");
    return idx !== null ? Number(idx) : 0;
  });
  const user = users[activeUser];
  const [currency, setCurrency] = useState(user.currency);

  // --- Financial State and Movements ---
  const [movements, setMovements] = useState([[], []]);
  // Cargar movements desde Supabase al iniciar
  useEffect(() => {
    async function fetchMovements() {
      const { data, error } = await supabase.from('movements').select('*');
      if (!error) {
        const gabbyMovs = data.filter(m => m.username === "Gabby");
        const jorgieMovs = data.filter(m => m.username === "Jorgie");
        setMovements([gabbyMovs, jorgieMovs]);
      }
    }
    fetchMovements();
  }, []);

  // --- Goals State ---
  const [goals, setGoals] = useState([]);
  // Cargar goals desde Supabase al iniciar
  useEffect(() => {
    async function fetchGoals() {
      const { data, error } = await supabase.from('goals').select('*').order('inserted_at', { ascending: true });
      if (error) {
        toast({ title: 'Error loading goals', description: error.message, status: 'error' });
      } else {
        setGoals(data || []);
      }
    }
    fetchGoals();
  }, []);

  // --- Realtime Subscriptions for goals and movements ---
  useEffect(() => {
    // Suscripción a cambios en 'goals'
    const goalsSub = supabase
      .channel('public:goals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, payload => {
        // Refresca los goals al detectar cualquier cambio
        supabase.from('goals').select('*').order('inserted_at', { ascending: true })
          .then(({ data }) => setGoals(data || []));
      })
      .subscribe();

    // Suscripción a cambios en 'movements'
    const movSub = supabase
      .channel('public:movements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, payload => {
        // Refresca los movements al detectar cualquier cambio
        supabase.from('movements').select('*').order('inserted_at', { ascending: true })
          .then(({ data }) => {
            // Agrupa por usuario
            setMovements([
              (data || []).filter(m => m.username === 'Gabby'),
              (data || []).filter(m => m.username === 'Jorgie'),
            ]);
          });
      })
      .subscribe();

    // Limpia las suscripciones al desmontar
    return () => {
      supabase.removeChannel(goalsSub);
      supabase.removeChannel(movSub);
    };
  }, []);

  // --- UI States for Modals and Tabs ---
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editGoalIndex, setEditGoalIndex] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", date: "" });

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState("income");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementCurrency, setMovementCurrency] = useState(user.currency);
  const [movementSource, setMovementSource] = useState("First Check");
  const [movementCategory, setMovementCategory] = useState("");
  const [movementAuto, setMovementAuto] = useState(false);
  const [autoDeductAmount, setAutoDeductAmount] = useState("");
  const [autoDeductInstallments, setAutoDeductInstallments] = useState("");
  const [autoDeductCheck, setAutoDeductCheck] = useState("First Check");
  const [autoDeductGoals, setAutoDeductGoals] = useState([]);
  const [debtFrequency, setDebtFrequency] = useState("Monthly");

  const [tab, setTab] = useState(0);
  const [monthSummaryOpen, setMonthSummaryOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [showMonthMovements, setShowMonthMovements] = useState({});
  const toast = useToast();

  // --- Movements by Month for Home Tab ---
  const userMovementsByMonth = getMovementsByMonth(movements[activeUser]);
  const allMonths = Object.keys(userMovementsByMonth).sort((a, b) => b.localeCompare(a)); // newest first
  const [selectedMovMonth, setSelectedMovMonth] = useState("");
  useEffect(() => {
    if (!selectedMovMonth && allMonths.length > 0) {
      setSelectedMovMonth(allMonths[0]);
    }
    // Si el mes seleccionado ya no existe, selecciona el primero disponible
    if (selectedMovMonth && !allMonths.includes(selectedMovMonth) && allMonths.length > 0) {
      setSelectedMovMonth(allMonths[0]);
    }
  }, [allMonths, selectedMovMonth]);
  const selectedMovements = selectedMovMonth ? userMovementsByMonth[selectedMovMonth] || [] : [];

  // --- Fixed Expenses State ---
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [showFixedSummary, setShowFixedSummary] = useState(false);
  const [fixedPeriod, setFixedPeriod] = useState('first');
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkAmount, setCheckAmount] = useState('');
  const [checkCurrency, setCheckCurrency] = useState(user.currency);
  const [lastCheck, setLastCheck] = useState(null);
  const [savingsGoalMap, setSavingsGoalMap] = useState({});
  const [showFixedExpenseModal, setShowFixedExpenseModal] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState(null);
  const [fixedExpenseForm, setFixedExpenseForm] = useState({
    name: "",
    amount: "",
    currency: "USD",
    frequency: "monthly",
    period: "",
    type: "expense",
    active: true
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const [paycheckDeductions, setPaycheckDeductions] = useState([]); // [{id, name, type, amount, currency, assignGoals: [goalId, ...]}]

  useEffect(() => {
    async function fetchFixedExpenses() {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('active', true);
      if (!error) setFixedExpenses(data || []);
    }
    fetchFixedExpenses();
  }, []);

  useEffect(() => {
    async function fetchGoals() {
      const { data, error } = await supabase.from('goals').select('*').order('inserted_at', { ascending: true });
      if (!error) setGoals(data || []);
    }
    fetchGoals();
  }, []);

  // --- New: Assign savings to one or more goals ---
  function handleSavingsGoalChange(fixedExpenseId, selectedGoalIds) {
    setSavingsGoalMap(prev => ({ ...prev, [fixedExpenseId]: selectedGoalIds }));
  }

  // --- Updated: Generate automatic movements with savings assigned to goals ---
  async function generateFixedExpensesMovements(period, username) {
    for (const expense of fixedExpenses) {
      if (expense.period && expense.period !== period.label) continue;
      if (expense.type === 'savings') {
        // Assign to selected goals
        const selectedGoalIds = savingsGoalMap[expense.id] || [];
        if (selectedGoalIds.length > 0) {
          // Split amount equally among selected goals
          const splitAmount = Math.floor(Number(expense.amount) / selectedGoalIds.length);
          for (let i = 0; i < selectedGoalIds.length; i++) {
            const goal = goals.find(g => g.id === selectedGoalIds[i]);
            if (!goal) continue;
            // Check if already exists
            const { data: existing } = await supabase
              .from('movements')
              .select('*')
              .eq('category', `Saving for ${goal.name}`)
              .eq('date', period.startDate)
              .eq('username', username);
            if (!existing || existing.length === 0) {
              await supabase.from('movements').insert([{
                type: 'savings',
                amount: splitAmount,
                category: `Saving for ${goal.name}`,
                currency: expense.currency,
                date: period.startDate,
                username: username,
                auto: true
              }]);
            }
          }
        }
      } else {
        // Normal fixed expense
        const { data: existing } = await supabase
          .from('movements')
          .select('*')
          .eq('category', expense.name)
          .eq('date', period.startDate)
          .eq('username', username);
        if (!existing || existing.length === 0) {
          await supabase.from('movements').insert([{
            type: expense.type,
            amount: expense.amount,
            category: expense.name,
            currency: expense.currency,
            date: period.startDate,
            username: username,
            auto: true
          }]);
        }
      }
    }
    toast({ title: 'Automatic movements generated', status: 'success', duration: 2000 });
    // Refresh movements
    const { data } = await supabase.from('movements').select('*');
    if (data) {
      const gabbyMovs = data.filter(m => m.username === "Gabby");
      const jorgieMovs = data.filter(m => m.username === "Jorgie");
      setMovements([gabbyMovs, jorgieMovs]);
    }
  }

  // --- Responsive helpers ---
  const isMobile = useBreakpointValue({ base: true, md: false });

  // --- Login Handlers ---
  function handleLogin(e) {
    e.preventDefault();
    if (password === "0325") {
      setShowLogin(false);
      setActiveUser(pendingUser);
      localStorage.setItem("activeUser", pendingUser);
      setPassword("");
      setLoginError("");
      setCurrency(users[pendingUser].currency);
    } else {
      setLoginError("Incorrect password. Try again.");
    }
  }

  // --- Movement Handlers ---
  async function handleUnifiedMovementSubmit() {
    const amt = parseAmount(movementAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Please enter a valid amount", status: "warning", duration: 2000 });
      return;
    }
    if (movementType === "income") {
      if (!movementSource) {
        toast({ title: "Please select a source", status: "warning" });
        return;
      }
      // Income: amount, currency, source
      const { error } = await supabase.from('movements').insert([{
        type: 'income',
      amount: amt,
        category: movementSource,
      currency: movementCurrency,
      date: todayStr(),
        username: user.name,
        auto: false
      }]);
      if (error) {
        toast({ title: "Error saving income", description: error.message, status: "error" });
        return;
      }
    } else if (movementType === "expenses") {
      if (!movementCategory) {
        toast({ title: "Please select a category", status: "warning" });
        return;
      }
      const { error } = await supabase.from('movements').insert([{
        type: 'expenses',
        amount: amt,
        category: movementCategory,
        currency: movementCurrency,
        date: todayStr(),
        username: user.name,
        auto: false
      }]);
      if (error) {
        toast({ title: "Error saving expense", description: error.message, status: "error" });
        return;
      }
    } else if (movementType === "savings") {
      if (!movementSource) {
        toast({ title: "Please select a source", status: "warning" });
        return;
      }
      // Si es automático
      if (movementAuto) {
        const autoAmt = parseAmount(autoDeductAmount);
        if (!autoAmt || autoAmt <= 0) {
          toast({ title: "Enter deduction amount", status: "warning" });
          return;
        }
        if (!autoDeductCheck) {
          toast({ title: "Select which check is deducted", status: "warning" });
          return;
        }
        if (!autoDeductGoals || autoDeductGoals.length === 0) {
          toast({ title: "Select at least one goal for savings", status: "warning" });
          return;
        }
        // Divide el monto entre los goals
        const splitAmt = Math.floor(autoAmt / autoDeductGoals.length);
        for (let i = 0; i < autoDeductGoals.length; i++) {
          const goal = goals.find(g => g.id === autoDeductGoals[i]);
          if (!goal) continue;
          const { error } = await supabase.from('movements').insert([{
            type: 'savings',
            amount: splitAmt,
            category: `Saving for ${goal.name}`,
            currency: movementCurrency,
            date: todayStr(),
            username: user.name,
            auto: true
          }]);
          if (error) {
            toast({ title: "Error saving savings", description: error.message, status: "error" });
            return;
          }
        }
        // Guarda como fixed_expense para automatización futura
        await supabase.from('fixed_expenses').insert([{
          name: 'Automatic Savings',
          amount: Number(autoAmt),
          currency: movementCurrency,
          frequency: 'monthly',
          username: user.name,
          type: 'savings',
          active: true
        }]);
      } else {
        // Savings normal
        const category = movementCategory || movementSource;
        const { error } = await supabase.from('movements').insert([{
          type: 'savings',
          amount: amt,
          category,
          currency: movementCurrency,
          date: todayStr(),
          username: user.name,
          auto: false
        }]);
        if (error) {
          toast({ title: "Error saving savings", description: error.message, status: "error" });
          return;
        }
      }
    } else if (movementType === "debts") {
      if (!movementCategory) {
        toast({ title: "Please select a category", status: "warning" });
        return;
      }
      // Si es automático
      if (movementAuto) {
        const autoAmt = parseAmount(autoDeductAmount);
        const installments = parseInt(autoDeductInstallments);
        if (!autoAmt || autoAmt <= 0) {
          toast({ title: "Enter deduction amount", status: "warning" });
          return;
        }
        if (!autoDeductCheck) {
          toast({ title: "Select which check is deducted", status: "warning" });
          return;
        }
        if (!installments || installments <= 0) {
          toast({ title: "Enter number of installments", status: "warning" });
          return;
        }
        // Crea movimientos para cada cuota (uno por mes/quincena)
        let cuotas = [];
        let startDate = new Date();
        if (autoDeductCheck === 'First Check') {
          for (let i = 0; i < installments; i++) {
            let due = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            cuotas.push(due);
          }
        } else if (autoDeductCheck === 'Second Check') {
          let count = 0;
          let month = startDate.getMonth();
          let year = startDate.getFullYear();
          let day = startDate.getDate() <= 15 ? 1 : 15;
          while (count < installments) {
            cuotas.push(new Date(year, month, day));
            count++;
            if (day === 1) {
              day = 15;
            } else {
              day = 1;
              month++;
              if (month > 11) { month = 0; year++; }
            }
          }
        }
        for (let i = 0; i < cuotas.length; i++) {
          const dateStr = cuotas[i].toISOString().slice(0,10);
          const { error } = await supabase.from('movements').insert([{
            type: 'debts',
            amount: autoAmt,
            category: movementCategory,
            currency: movementCurrency,
            date: dateStr,
            username: user.name,
            auto: true
          }]);
          if (error) {
            toast({ title: "Error saving debt", description: error.message, status: "error" });
            return;
          }
        }
        // Guarda como fixed_expense para automatización futura
        await supabase.from('fixed_expenses').insert([{
          name: String(movementCategory),
          amount: Number(autoAmt),
          currency: String(movementCurrency),
          frequency: autoDeductCheck ? String(autoDeductCheck).toLowerCase() : 'monthly',
          username: user && user.name ? String(user.name) : '',
          type: 'debt',
          active: true
        }]);
      } else {
        // Debt normal (solo el mes actual)
        const { error } = await supabase.from('movements').insert([{
          type: 'debts',
          amount: amt,
          category: movementCategory,
          currency: movementCurrency,
          date: todayStr(),
          username: user.name,
          auto: false
        }]);
        if (error) {
          toast({ title: "Error saving debt", description: error.message, status: "error" });
          return;
        }
      }
    }
    setShowMovementModal(false);
    // Refresca movimientos
    const { data } = await supabase.from('movements').select('*');
    if (data) {
      const gabbyMovs = data.filter(m => m.username === "Gabby");
      const jorgieMovs = data.filter(m => m.username === "Jorgie");
      setMovements([gabbyMovs, jorgieMovs]);
    }
    toast({ title: "Movement added", status: "success", duration: 1500 });
  }

  // --- Export Function ---
  function handleExportExcel() {
    const data = movements[activeUser].map(m => ({
      Type: m.type,
      Amount: m.amount,
      Category: m.category,
      Currency: m.currency,
      Date: prettyDate(m.date)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movements");
    XLSX.writeFile(wb, `${user.name}_movements.xlsx`);
  }

  // --- Currency Toggle ---
  function handleCurrencyToggle() {
    setCurrency(c => c === "USD" ? "COP" : "USD");
  }

  // --- Logout ---
  function handleLogout() {
    setShowLogin(true);
    setActiveUser(0);
    localStorage.removeItem("activeUser");
    toast({ title: "Logged out!", status: "info", duration: 1500 });
  }

  // --- Goal Handlers ---
  function handleGoalFormChange(e) {
    const { name, value } = e.target;
    setGoalForm(f => ({ ...f, [name]: value }));
  }
  function handleAddGoal() {
    setGoalForm({ name: "", target: "", date: "" });
    setEditGoalIndex(null);
    setGoalModalOpen(true);
  }
  function handleEditGoal(idx) {
    setGoalForm(goals[idx]);
    setEditGoalIndex(idx);
    setGoalModalOpen(true);
  }
  async function handleDeleteGoal(idx) {
    const goal = goals[idx];
    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    if (error) {
      toast({ title: 'Error deleting goal', description: error.message, status: 'error' });
    } else {
      // Refresca goals desde Supabase
      const { data } = await supabase.from('goals').select('*').order('inserted_at', { ascending: true });
      setGoals(data || []);
      toast({ title: "Goal deleted", status: "info", duration: 2000 });
    }
  }
  async function handleGoalSubmit() {
    if (!goalForm.name || !goalForm.target) {
      toast({ title: "Name and target required", status: "warning", duration: 2000 });
      return;
    }
    if (editGoalIndex !== null) {
      // Update
      const goal = goals[editGoalIndex];
      const { error } = await supabase.from('goals').update({ ...goalForm }).eq('id', goal.id);
      if (error) {
        toast({ title: 'Error updating goal', description: error.message, status: 'error' });
      } else {
        // Refresca goals desde Supabase
        const { data } = await supabase.from('goals').select('*').order('inserted_at', { ascending: true });
        setGoals(data || []);
        toast({ title: "Goal updated", status: "success", duration: 2000 });
      }
    } else {
      // Insert
      const { error } = await supabase.from('goals').insert([{ ...goalForm, created_by: users[activeUser].name }]);
      if (error) {
        toast({ title: 'Error adding goal', description: error.message, status: 'error' });
      } else {
        // Refresca goals desde Supabase
        const { data } = await supabase.from('goals').select('*').order('inserted_at', { ascending: true });
        setGoals(data || []);
        toast({ title: "Goal added", status: "success", duration: 2000 });
      }
    }
    setGoalModalOpen(false);
  }

  // --- Summary Calculation Functions ---
  function getSummary(movs, curr, month = null, year = null) {
    let income = 0, expenses = 0, savings = 0, debts = 0;
    movs.forEach(m => {
      if (
        (month === null || getMonthIndex(m.date) === month) &&
        (year === null || getYear(m.date) === year)
      ) {
        let amt = convert(m.amount, m.currency, curr);
        if (m.type === "income") income += amt;
        else if (m.type === "expenses") expenses += amt;
        else if (m.type === "savings") savings += amt;
        else if (m.type === "debts") debts += amt;
      }
    });
    return { income, expenses, savings, debts, balance: income - expenses - debts };
  }
  // Solo mostrar el resumen del mes actual
  const nowSummaryMonth = new Date().getMonth();
  const nowSummaryYear = new Date().getFullYear();
  const summary = getSummary(movements[activeUser], currency, nowSummaryMonth, nowSummaryYear);

  // --- Together Summary Calculation ---
  // Filtrado robusto para Together: normaliza username y fecha
  function getUserMovements(movs, username) {
    return movs.filter(m => (m.username || '').toLowerCase() === username.toLowerCase());
  }
  // Obtén movimientos de Gabby y Jorgie robustamente
  const gabbyMovs = getUserMovements([].concat(...movements), 'Gabby');
  const jorgieMovs = getUserMovements([].concat(...movements), 'Jorgie');
  // Solo del mes actual
  function filterByMonth(movs, month, year) {
    return movs.filter(m => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }
  const gabbyMovsMonth = filterByMonth(gabbyMovs, nowSummaryMonth, nowSummaryYear);
  const jorgieMovsMonth = filterByMonth(jorgieMovs, nowSummaryMonth, nowSummaryYear);
  // Suma por tipo
  function sumByType(movs, type) {
    return movs.filter(m => m.type === type).reduce((acc, m) => acc + convert(m.amount, m.currency, currency), 0);
  }
  const togetherSummary = {
    income: sumByType(gabbyMovsMonth, 'income') + sumByType(jorgieMovsMonth, 'income'),
    expenses: sumByType(gabbyMovsMonth, 'expenses') + sumByType(jorgieMovsMonth, 'expenses'),
    savings: sumByType(gabbyMovsMonth, 'savings') + sumByType(jorgieMovsMonth, 'savings'),
    debts: sumByType(gabbyMovsMonth, 'debts') + sumByType(jorgieMovsMonth, 'debts'),
    balance:
      (sumByType(gabbyMovsMonth, 'income') + sumByType(jorgieMovsMonth, 'income'))
      - (sumByType(gabbyMovsMonth, 'expenses') + sumByType(jorgieMovsMonth, 'expenses'))
      - (sumByType(gabbyMovsMonth, 'debts') + sumByType(jorgieMovsMonth, 'debts'))
  };

  // --- Pie Chart Data (Current Month) ---
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const pieData = [
    { name: "Income", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).income },
    { name: "Expenses", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).expenses },
    { name: "Savings", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).savings },
    { name: "Debts", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).debts }
  ].filter(item => item.value !== 0);
  const pieDataTogether = [
    { name: `${users[0].label} Income`, value: sumByType(gabbyMovsMonth, 'income'), color: users[0].chartColor },
    { name: `${users[1].label} Income`, value: sumByType(jorgieMovsMonth, 'income'), color: users[1].chartColor },
    { name: `${users[0].label} Expenses`, value: sumByType(gabbyMovsMonth, 'expenses'), color: users[0].chartColor },
    { name: `${users[1].label} Expenses`, value: sumByType(jorgieMovsMonth, 'expenses'), color: users[1].chartColor },
    { name: `${users[0].label} Savings`, value: sumByType(gabbyMovsMonth, 'savings'), color: users[0].chartColor },
    { name: `${users[1].label} Savings`, value: sumByType(jorgieMovsMonth, 'savings'), color: users[1].chartColor },
    { name: `${users[0].label} Debts`, value: sumByType(gabbyMovsMonth, 'debts'), color: users[0].chartColor },
    { name: `${users[1].label} Debts`, value: sumByType(jorgieMovsMonth, 'debts'), color: users[1].chartColor }
  ].filter(item => item.value !== 0);

  // --- Movements by Month ---
  function getMovementsByMonth(movs) {
    const byMonth = {};
    movs.forEach(m => {
      // Normaliza username y parsea fecha robustamente
      if (!m.date || !m.username) return;
      const userNorm = (m.username || '').toLowerCase();
      const keyDate = new Date(m.date);
      if (isNaN(keyDate)) return;
      const key = `${keyDate.getFullYear()}-${String(keyDate.getMonth()).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(m);
    });
    return byMonth;
  }
  
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const currentMonthMovements = userMovementsByMonth[currentMonthKey] || [];

  // --- Estado para la moneda de Goals ---
  const [goalCurrency, setGoalCurrency] = useState("USD");
  function convertCurrency(amount, from, to) {
    if (from === to) return amount;
    if (from === "USD" && to === "COP") return amount * COP_TO_USD;
    if (from === "COP" && to === "USD") return amount / COP_TO_USD;
    return amount;
  }

  // --- Expenses by Category Calculation ---
  function getExpensesByCategory(movs, month, year, curr) {
    const filtered = movs.filter(m => m.type === "expenses" && getMonthIndex(m.date) === month && getYear(m.date) === year);
    const total = filtered.reduce((acc, m) => acc + convert(m.amount, m.currency, curr), 0);
    const byCat = {};
    filtered.forEach(m => {
      const cat = m.category || "Other";
      byCat[cat] = (byCat[cat] || 0) + convert(m.amount, m.currency, curr);
    });
    const result = Object.entries(byCat).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: total > 0 ? (amt / total) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
    return { total, data: result };
  }

  const { total: totalExpenses, data: expensesByCat } = getExpensesByCategory(movements[activeUser], selectedMonth.month, selectedMonth.year, currency);

  // --- Helper para formatear input con separadores de miles:
  function formatInputNumber(value) {
    if (!value) return '';
    const parts = value.toString().replace(/[^\d]/g, '').split('');
    let out = '';
    let count = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      out = parts[i] + out;
      count++;
      if (count % 3 === 0 && i !== 0) out = ',' + out;
    }
    return out;
  }

  // --- Nueva función para ingresar cheque y automatizar descuentos ---
  async function handleCheckSubmit() {
    const amt = parseAmount(checkAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', status: 'warning', duration: 2000 });
      return;
    }
    // 1. Create income movement
    const { error: incomeError } = await supabase.from('movements').insert([{
      type: 'income',
      amount: amt,
      category: 'Paycheck',
      currency: checkCurrency,
      date: todayStr(),
      username: user.name,
      auto: true
    }]);
    if (incomeError) {
      toast({ title: 'Error saving paycheck', description: incomeError.message, status: 'error' });
      return;
    }
    // 2. Create deduction movements
    for (const ded of paycheckDeductions) {
      if (ded.type === 'savings' && ded.assignGoals && ded.assignGoals.length > 0) {
        // Split savings among selected goals
        const splitAmount = Math.floor(Number(ded.amount) / ded.assignGoals.length);
        for (let i = 0; i < ded.assignGoals.length; i++) {
          const goal = goals.find(g => g.id === ded.assignGoals[i]);
          if (!goal) continue;
          await supabase.from('movements').insert([{
            type: 'savings',
            amount: splitAmount,
            category: `Saving for ${goal.name}`,
            currency: ded.currency,
            date: todayStr(),
            username: user.name,
            auto: true
          }]);
        }
      } else if (ded.type !== 'savings') {
        await supabase.from('movements').insert([{
          type: ded.type,
          amount: ded.amount,
          category: ded.name,
          currency: ded.currency,
          date: todayStr(),
          username: user.name,
          auto: true
        }]);
      }
    }
    setLastCheck({ amount: amt, currency: checkCurrency });
    setShowCheckModal(false);
    setCheckAmount('');
    // Refresh movements
    const { data } = await supabase.from('movements').select('*');
    if (data) {
      const gabbyMovs = data.filter(m => m.username === "Gabby");
      const jorgieMovs = data.filter(m => m.username === "Jorgie");
      setMovements([gabbyMovs, jorgieMovs]);
    }
    toast({ title: 'Paycheck and deductions saved', status: 'success', duration: 2000 });
  }

  // --- Fixed Expense Modal Handlers ---
  function openNewFixedExpense() {
    setEditingFixedExpense(null);
    setFixedExpenseForm({
      name: "",
      amount: "",
      currency: "USD",
      frequency: "monthly",
      period: "",
      type: "expense",
      active: true
    });
    setShowFixedExpenseModal(true);
  }

  function openEditFixedExpense(expense) {
    setEditingFixedExpense(expense);
    setFixedExpenseForm({ ...expense });
    setShowFixedExpenseModal(true);
  }

  function handleFixedExpenseFormChange(e) {
    const { name, value, type, checked } = e.target;
    setFixedExpenseForm(f => ({
      ...f,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSaveFixedExpense() {
    if (!fixedExpenseForm.name || !fixedExpenseForm.amount) {
      toast({ title: "Name and amount are required", status: "warning" });
      return;
    }
    if (editingFixedExpense) {
      await supabase.from('fixed_expenses').update(fixedExpenseForm).eq('id', editingFixedExpense.id);
    } else {
      await supabase.from('fixed_expenses').insert([fixedExpenseForm]);
    }
    setShowFixedExpenseModal(false);
    // Refresh list
    const { data } = await supabase.from('fixed_expenses').select('*').eq('active', true);
    setFixedExpenses(data || []);
  }

  async function handleDeleteFixedExpense() {
    if (expenseToDelete) {
      await supabase.from('fixed_expenses').delete().eq('id', expenseToDelete.id);
      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
      // Refresh list
      const { data } = await supabase.from('fixed_expenses').select('*').eq('active', true);
      setFixedExpenses(data || []);
      toast({ title: 'Fixed expense deleted', status: 'info' });
    }
  }

  // When opening the Add Paycheck modal, initialize deductions from active fixed expenses
  function openPaycheckModal() {
    // Map fixed expenses to editable deductions for this paycheck
    const deductions = fixedExpenses.filter(e => e.active).map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      assignGoals: [], // for savings
    }));
    setPaycheckDeductions(deductions);
    setShowCheckModal(true);
  }

  function handleDeductionAmountChange(id, value) {
    setPaycheckDeductions(deds => deds.map(d => d.id === id ? { ...d, amount: value } : d));
  }

  function handleDeductionGoalChange(id, selectedGoalIds) {
    setPaycheckDeductions(deds => deds.map(d => d.id === id ? { ...d, assignGoals: selectedGoalIds } : d));
  }

  // --- Category Totals for Movements List by Month ---
  // Group all types (income, expenses, savings, debts) by category for the selected month
  const categoryTotals = React.useMemo(() => {
    const monthMovements = selectedMovements;
    const byCat = {};
    monthMovements.forEach(m => {
      const cat = m.category || "Other";
      if (!byCat[cat]) {
        byCat[cat] = {
          category: cat,
          type: m.type,
          total: 0,
          currency: m.currency,
          movements: []
        };
      }
      byCat[cat].total += convert(m.amount, m.currency, currency);
      byCat[cat].movements.push(m);
      // If there are mixed types in a category, prefer 'expenses' > 'income' > 'savings' > 'debts'
      if (byCat[cat].type !== m.type) {
        const typeOrder = { expenses: 1, income: 2, savings: 3, debts: 4 };
        if (typeOrder[m.type] < typeOrder[byCat[cat].type]) {
          byCat[cat].type = m.type;
        }
      }
    });
    // Sort: Wifey, Hubby first, then alphabetically
    const sorted = Object.values(byCat).sort((a, b) => {
      if (a.category === "Wifey") return -1;
      if (b.category === "Wifey") return 1;
      if (a.category === "Hubby") return -1;
      if (b.category === "Hubby") return 1;
      return a.category.localeCompare(b.category);
    });
    return sorted;
  }, [selectedMovements, currency]);

  // --- Expanded Categories State for Category Accordion ---
  const [expandedCategories, setExpandedCategories] = useState([]);
  const toggleCategory = (cat) => {
    setExpandedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  // --- Mostrar/Ocultar lista de movimientos ---
  const [showMovementsList, setShowMovementsList] = useState(true);

  // --- Eliminar movimiento por índice en selectedMovements ---
  async function handleDeleteMovement(idx) {
    const m = selectedMovements[idx];
    if (!m) return;
    const { error } = await supabase.from('movements').delete().eq('id', m.id);
    if (error) {
      toast({ title: 'Error deleting movement', description: error.message, status: 'error' });
      return;
    }
    // Refresca movimientos
    const { data } = await supabase.from('movements').select('*');
    if (data) {
      const gabbyMovs = data.filter(m => m.username === "Gabby");
      const jorgieMovs = data.filter(m => m.username === "Jorgie");
      setMovements([gabbyMovs, jorgieMovs]);
    }
    toast({ title: 'Movement deleted', status: 'info', duration: 1500 });
  }

  // --- UI: Login ---
  if (showLogin) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="primary.50">
        <Box bg="white" p={8} borderRadius="md" shadow="md" w="sm">
          <Heading mb={4} textAlign="center" color="primary.700">Couple Finance ❤️</Heading>
          <Text mb={2}>Choose your profile to start:</Text>
          <HStack mb={4} spacing={6} justify="center">
            {users.map((u, idx) => (
              <VStack key={u.name} onClick={() => setPendingUser(idx)} cursor="pointer">
                <Avatar src={u.avatar} size="lg" border={pendingUser === idx ? `2px solid ${u.color}` : "2px solid transparent"} />
                <Text fontWeight={pendingUser === idx ? "bold" : "normal"} color={u.color}>{u.label}</Text>
              </VStack>
            ))}
          </HStack>
          <form onSubmit={handleLogin}>
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              mb={2}
            />
            {loginError && <Text color="red.500" fontSize="sm">{loginError}</Text>}
            <Button colorScheme="primary" type="submit" w="100%" mt={2}>Login</Button>
          </form>
        </Box>
      </Flex>
    );
  }

  // --- UI: Main ---
  return (
    <Box minH="100vh" bg="primary.50">
      {/* Header */}
      <Box bg="primary.500" p={4} borderBottomRadius="md" boxShadow="md" textAlign="center" position="relative" color="white">
        <Text fontSize="2xl" fontWeight="bold">Couple Finance ❤️</Text>
        <Text fontSize="md">{getMotivational()}</Text>
        <HStack mt={2} justify="center">
          <Button
            leftIcon={<FaPiggyBank />}
            onClick={handleCurrencyToggle}
            colorScheme="primary"
            variant="solid"
            size="sm"
            color="white"
            bg="primary.600"
            _hover={{ bg: "primary.700" }}
          >
            Show in {currency === "USD" ? "COP" : "USD"}
          </Button>
          <IconButton
            icon={<FaSync />}
            onClick={() => window.location.reload()}
            size="sm"
            bg="primary.400"
            color="white"
            _hover={{ bg: "primary.500" }}
            borderRadius="full"
            ml={2}
            aria-label="reload"
          />
        </HStack>
        <IconButton
          icon={<FaSignOutAlt />}
          aria-label="logout"
          position="absolute"
          top={3}
          right={3}
          bg="primary.700"
          color="white"
          _hover={{ bg: "primary.800" }}
          size="md"
          borderRadius="full"
          onClick={handleLogout}
        />
      </Box>

      {/* Tabs */}
      <Tabs index={tab} onChange={setTab} variant="soft-rounded" colorScheme="primary" mt={4} align="center">
        <TabList justifyContent="center">
          <Tab><FaHome /> Home</Tab>
          <Tab><FaUsers /> Together</Tab>
        </TabList>
        <TabPanels>
          {/* Home Tab */}
          <TabPanel>
            <Flex justify="center" align="center" minH="60vh">
              <Box w="100%" maxW="sm" mx="auto" mt={4} bg="white" borderRadius="md" p={4} boxShadow="md" textAlign="center">
                <Avatar size="lg" src={user.avatar} mb={2} mx="auto" border={`2px solid ${user.color}`} />
                <Heading size="md" color="primary.700" mb={2}>{user.name}'s Overview</Heading>
                <Text color="primary.400" mb={4}>{getMotivational()}</Text>
                {/* Main summary */}
                <Box w="100%" bg="primary.100" borderRadius="md" p={3} mb={4} boxShadow="sm" border="1px solid" borderColor="primary.200">
                  <Flex justify="space-between"><Text color="primary.700">Income</Text><Text>{formatCurrency(summary.income, currency)}</Text></Flex>
                  <Flex justify="space-between"><Text color="primary.700">Expenses</Text><Text>{formatCurrency(summary.expenses, currency)}</Text></Flex>
                  <Flex justify="space-between"><Text fontWeight="bold" color="primary.700">Balance</Text><Text>{formatCurrency(summary.balance, currency)}</Text></Flex>
                  <Flex justify="space-between"><Text color="primary.700">Savings</Text><Text>{formatCurrency(summary.savings, currency)}</Text></Flex>
                  <Flex justify="space-between"><Text color="primary.700">Debts</Text><Text>{formatCurrency(summary.debts, currency)}</Text></Flex>
                </Box>
                {/* Add button */}
                <Button
                  w="100%"
                  colorScheme="primary"
                  leftIcon={<FaPlus />}
                  onClick={() => setShowMovementModal(true)}
                  mb={3}
                  size="md"
                  fontWeight="bold"
                  fontSize="md"
                  borderRadius="lg"
                  boxShadow="md"
                  py={4}
                  _hover={{ bg: "primary.400" }}
                >
                  Add Movement
                </Button>
                <Button colorScheme="primary" size="md" mb={4} leftIcon={<FaTable />} onClick={() => setMonthSummaryOpen(true)} fontWeight="bold" boxShadow="md">
                  Month summary
                </Button>
                {/* Show last check entered */}
                {lastCheck && (
                  <Text color="primary.700" fontWeight="bold" mb={2}>
                    Last paycheck: {formatCurrency(lastCheck.amount, lastCheck.currency)}
                  </Text>
                )}
                {/* Movements List by Month */}
                <Box mt={4} bg="white" borderRadius="md" p={3} boxShadow="sm">
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold" fontSize="lg">Movements</Text>
                    <IconButton icon={<FaFileExport />} size="sm" onClick={handleExportExcel} aria-label="export" />
                  </Flex>
                  <Button size="xs" variant="outline" colorScheme="primary" mb={1} onClick={() => setShowMovementsList(v => !v)}>
                    {showMovementsList ? 'Hide Movements' : 'Show Movements'}
                  </Button>
                  <Select value={selectedMovMonth} onChange={e => setSelectedMovMonth(e.target.value)} mb={3} size="md" borderRadius="lg" bg="primary.100" color="primary.700" fontWeight="bold">
                    {allMonths.map(key => {
                      const [year, month] = key.split("-");
                      return <option key={key} value={key}>{MONTHS[Number(month)]} {year}</option>;
                    })}
                  </Select>
                  {showMovementsList ? (
                    <>
                      {selectedMovements.length === 0 && <Text color="gray.400">No movements this month.</Text>}
                      {selectedMovements.length > 0 && (
                        <Box maxH="350px" overflowY="auto" pr={2}>
                          <Table size="sm" variant="simple" minWidth={isMobile ? "600px" : undefined}>
                            <Thead>
                              <Tr>
                                <Th w="30px"></Th>
                                <Th>Type</Th>
                                <Th>Category</Th>
                                <Th isNumeric>Amount</Th>
                                <Th>Date</Th>
                                <Th></Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {selectedMovements.map((m, i) => (
                                <Tr key={i}>
                                  <Td>{TYPE_EMOJIS[m.type]}</Td>
                                  <Td>
                                    <Badge colorScheme={
                                      m.type === "income" ? "green" :
                                      m.type === "expenses" ? "red" :
                                      m.type === "savings" ? "blue" : "orange"
                                    }>{m.type.charAt(0).toUpperCase() + m.type.slice(1)}</Badge>
                                  </Td>
                                  <Td>{m.category}</Td>
                                  <Td isNumeric color={m.type === "income" || m.type === "savings" ? theme.colors.primary[700] : "red.600"}>
                                    {(m.type === "income" || m.type === "savings" ? "+" : "-") + formatCurrency(m.amount, m.currency)}
                                  </Td>
                                  <Td fontSize="xs">{prettyDate(m.date)}</Td>
                                  <Td>
                                    <IconButton icon={<FaTrash />} size="xs" onClick={() => handleDeleteMovement(selectedMovements.indexOf(m))} aria-label="delete movement" />
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      )}
                    </>
                  ) : null}
                  {/* Pie Chart */}
                  <Box mt={6} h="180px">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill={theme.colors.primary[400]}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Flex align="center" justify="center" h="100%"><Text color="gray.400">No data for this month</Text></Flex>
                    )}
                  </Box>
                </Box>
              </Box>
            </Flex>
            {/* Month Summary Modal */}
            <Modal isOpen={monthSummaryOpen} onClose={() => setMonthSummaryOpen(false)} size="lg">
              <ModalOverlay />
              <ModalContent bg="white">
                <ModalHeader color="primary.500">{MONTHS[selectedMonth.month]} {selectedMonth.year} Summary</ModalHeader>
                <ModalBody>
                  <Flex align="center" justify="center" mb={2}>
                    <IconButton
                      icon={<FaChevronLeft />}
                      aria-label="Previous month"
                      variant="ghost"
                      color="primary.500"
                      fontSize="xl"
                      onClick={() => {
                        let m = selectedMonth.month - 1;
                        let y = selectedMonth.year;
                        if (m < 0) { m = 11; y -= 1; }
                        setSelectedMonth({ month: m, year: y });
                      }}
                    />
                    <Text fontWeight="bold" fontSize="xl" color="primary.700" mx={4}>
                      {MONTHS[selectedMonth.month]} {selectedMonth.year}
                    </Text>
                    <IconButton
                      icon={<FaChevronRight />}
                      aria-label="Next month"
                      variant="ghost"
                      color="primary.500"
                      fontSize="xl"
                      onClick={() => {
                        let m = selectedMonth.month + 1;
                        let y = selectedMonth.year;
                        if (m > 11) { m = 0; y += 1; }
                        setSelectedMonth({ month: m, year: y });
                      }}
                    />
                  </Flex>
                  <Flex justify="center" mb={4}>
                    <Box bg="white" borderRadius="2xl" boxShadow="lg" p={6} minW="320px" maxW="400px" textAlign="center" border="1px solid" borderColor="primary.200">
                      <Text fontWeight="bold" fontSize="xl" color="primary.700" mb={1}>{MONTHS[selectedMonth.month]} {selectedMonth.year}</Text>
                      <Text fontWeight="bold" color="primary.700" fontSize="md" mb={2}>{user.name}</Text>
                      <SimpleGrid columns={2} spacing={2} mb={2}>
                        <Box>
                          <Text fontSize="sm" color="primary.700" fontWeight="bold">Income</Text>
                          <Text fontSize="md" color="primary.700">{formatCurrency(getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year).income, currency)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="primary.700" fontWeight="bold">Expenses</Text>
                          <Text fontSize="md" color="primary.700">{formatCurrency(getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year).expenses, currency)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="primary.700" fontWeight="bold">Savings</Text>
                          <Text fontSize="md" color="primary.700">{formatCurrency(getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year).savings, currency)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="primary.700" fontWeight="bold">Debts</Text>
                          <Text fontSize="md" color="primary.700">{formatCurrency(getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year).debts, currency)}</Text>
                        </Box>
                      </SimpleGrid>
                      <Divider my={2} borderColor="primary.200" />
                      <Text fontWeight="bold" color="primary.700" fontSize="lg" mt={2}>Balance:</Text>
                      <Text fontSize="lg" color="primary.700">{formatCurrency(getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year).balance, currency)}</Text>
                    </Box>
                  </Flex>
                  <Box mt={6}>
                    <Heading size="sm" mb={2} color="primary.700">Expenses by Category</Heading>
                    {expensesByCat.length === 0 && <Text color="gray.400">No expenses this month.</Text>}
                    {expensesByCat.map((cat, idx) => (
                      <Box key={cat.category} mb={3}>
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontWeight="bold" color="primary.700">{cat.category}</Text>
                          <Text color="primary.700">{formatCurrency(cat.amount, currency)}</Text>
                          <Text color={cat.percent >= 50 ? "red.500" : cat.percent >= 20 ? "orange.400" : "yellow.600"} fontWeight="bold">{cat.percent.toFixed(0)}%</Text>
                        </Flex>
                        <Progress value={cat.percent} size="sm" borderRadius="md" colorScheme={cat.percent >= 50 ? "red" : cat.percent >= 20 ? "orange" : "yellow"} />
                      </Box>
                    ))}
                  </Box>
                </ModalBody>
                <ModalFooter bg="primary.50">
                  <Button colorScheme="primary" onClick={() => setMonthSummaryOpen(false)}>Close</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            {/* Modal to enter paycheck/period */}
            <Modal isOpen={showCheckModal} onClose={() => setShowCheckModal(false)} isCentered>
              <ModalOverlay />
              <ModalContent maxW="lg">
                <ModalHeader>Add Movement</ModalHeader>
                <ModalBody>
                  <Input
                    placeholder="Amount"
                    type="number"
                    value={checkAmount}
                    onChange={e => setCheckAmount(e.target.value)}
                    mb={3}
                  />
                  <Select value={checkCurrency} onChange={e => setCheckCurrency(e.target.value)} mb={3}>
                    <option value="USD">USD</option>
                    <option value="COP">COP</option>
                  </Select>
                  <Divider my={2} />
                  <Heading size="sm" mb={2}>Movement Type</Heading>
                  <Tabs variant="soft-rounded" colorScheme="primary" align="center" mb={4}>
                    <TabList>
                      <Tab onClick={() => setMovementType("income")}>Income</Tab>
                      <Tab onClick={() => setMovementType("expenses")}>Expense</Tab>
                      <Tab onClick={() => setMovementType("savings")}>Savings</Tab>
                      <Tab onClick={() => setMovementType("debts")}>Debt</Tab>
                    </TabList>
                  </Tabs>
                  {/* For savings and debts, show automatic deduction options */}
                  {(movementType === "savings" || movementType === "debts") && (
                    <Box mb={3}>
                      <Checkbox
                        id="autoMovement"
                        isChecked={movementAuto}
                        onChange={e => setMovementAuto(e.target.checked)}
                        mb={2}
                      >
                        Automatically create counter movement
                      </Checkbox>
                      {movementAuto && (
                        <Box mt={2}>
                          <Input
                            placeholder="How much is deducted from each check?"
                            type="number"
                            value={autoDeductAmount}
                            onChange={e => setAutoDeductAmount(e.target.value)}
                            mb={2}
                          />
                          {movementType === "debts" && (
                            <Input
                              placeholder="How many installments?"
                              type="number"
                              value={autoDeductInstallments}
                              onChange={e => setAutoDeductInstallments(e.target.value)}
                              mb={2}
                            />
                          )}
                          {movementType === "savings" && (
                            <Box mb={2}>
                              <Text fontSize="sm" mb={1}>Assign savings to goal(s):</Text>
                              <Select
                                multiple
                                value={autoDeductGoals}
                                onChange={e => {
                                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                                  setAutoDeductGoals(selected);
                                }}
                                size="md"
                                bg="white"
                                borderColor="primary.200"
                                color="primary.700"
                                fontWeight="bold"
                              >
                                {goals.map(goal => (
                                  <option key={goal.id} value={goal.id}>{goal.name}</option>
                                ))}
                              </Select>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                  <Text fontSize="sm" color="gray.500">You can set up automatic deductions for savings or debts here.</Text>
                </ModalBody>
                <ModalFooter>
                  <Button colorScheme="primary" mr={3} onClick={handleCheckSubmit}>
                    Save Movement
                  </Button>
                  <Button onClick={() => setShowCheckModal(false)}>Cancel</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </TabPanel>
          {/* Together Tab */}
          <TabPanel>
            <Box maxW="lg" mx="auto" mt={4} bg="white" borderRadius="md" p={4} boxShadow="md">
              <Heading size="lg" color="primary.500" mb={2} textAlign="center">Together</Heading>
              <Text color="gray.500" mb={4} textAlign="center">Teamwork for your dreams.</Text>
              {/* Centered summary */}
              <Box
                w="100%"
                bg="primary.100"
                borderRadius="md"
                p={4}
                mb={4}
                boxShadow="sm"
                border="1px solid"
                borderColor="primary.200"
                textAlign="center"
              >
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={2} alignItems="center">
                  <Box>
                    <Text fontWeight="bold" color="primary.700" fontSize="sm">Income</Text>
                    <Text color="primary.700">{formatCurrency(togetherSummary.income, currency)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="primary.700" fontSize="sm">Expenses</Text>
                    <Text color="primary.700">{formatCurrency(togetherSummary.expenses, currency)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="primary.700" fontSize="sm">Balance</Text>
                    <Text color="primary.700">{formatCurrency(togetherSummary.balance, currency)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="primary.700" fontSize="sm">Savings</Text>
                    <Text color="primary.700">{formatCurrency(togetherSummary.savings, currency)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="primary.700" fontSize="sm">Debts</Text>
                    <Text color="primary.700">{formatCurrency(togetherSummary.debts, currency)}</Text>
                  </Box>
                </SimpleGrid>
              </Box>
              {/* Grouped Bar Chart Together - Colores por tipo */}
              <Box mt={6} h="300px" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={[
                      {
                        type: 'Income',
                        Gabby: Math.abs(getSummary(movements[0], currency, currentMonth, currentYear).income),
                        Jorgie: Math.abs(getSummary(movements[1], currency, currentMonth, currentYear).income),
                      },
                      {
                        type: 'Expenses',
                        Gabby: Math.abs(getSummary(movements[0], currency, currentMonth, currentYear).expenses),
                        Jorgie: Math.abs(getSummary(movements[1], currency, currentMonth, currentYear).expenses),
                      },
                      {
                        type: 'Savings',
                        Gabby: Math.abs(getSummary(movements[0], currency, currentMonth, currentYear).savings),
                        Jorgie: Math.abs(getSummary(movements[1], currency, currentMonth, currentYear).savings),
                      },
                      {
                        type: 'Debts',
                        Gabby: Math.abs(getSummary(movements[0], currency, currentMonth, currentYear).debts),
                        Jorgie: Math.abs(getSummary(movements[1], currency, currentMonth, currentYear).debts),
                      },
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                    barCategoryGap={"30%"}
                    barGap={8}
                  >
                    <XAxis dataKey="type" stroke={theme.colors.primary[700]} fontSize={14} />
                    <YAxis stroke={theme.colors.primary[700]} fontSize={14} tickFormatter={v => formatCurrency(v, currency)} domain={[0, 'auto']} />
                    <Tooltip formatter={formatCurrency} />
                    <Bar dataKey="Gabby" name="Gabby" radius={[6, 6, 0, 0]}>
                      {['Income', 'Expenses', 'Savings', 'Debts'].map((type, idx) => (
                        <Cell key={type}
                          fill={
                            type === 'Income' ? theme.colors.gabby[400] :
                            type === 'Expenses' ? theme.colors.gabby[500] :
                            type === 'Savings' ? '#f3b0c3' :
                            type === 'Debts' ? '#e48ab6' :
                            theme.colors.gabby[400]
                          }
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="Jorgie" name="Jorgie" radius={[6, 6, 0, 0]}>
                      {['Income', 'Expenses', 'Savings', 'Debts'].map((type, idx) => (
                        <Cell key={type}
                          fill={
                            type === 'Income' ? theme.colors.jorgie[400] :
                            type === 'Expenses' ? theme.colors.jorgie[500] :
                            type === 'Savings' ? '#7db7e8' :
                            type === 'Debts' ? '#4a90e2' :
                            theme.colors.jorgie[400]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Leyenda personalizada */}
                <HStack mt={2} spacing={8} justify="center">
                  <HStack><Box w={4} h={4} borderRadius="full" bg={theme.colors.gabby[400]} /><Text fontWeight="bold" color="primary.700">Gabby</Text></HStack>
                  <HStack><Box w={4} h={4} borderRadius="full" bg={theme.colors.jorgie[400]} /><Text fontWeight="bold" color="primary.700">Jorgie</Text></HStack>
                </HStack>
              </Box>
              <Divider my={4} borderColor="primary.200" />
              {/* Goals Section ONLY here */}
              <Box mb={8}>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="md" color="primary.500">Our Goals</Heading>
                  <HStack>
                    <Select value={goalCurrency} onChange={e => setGoalCurrency(e.target.value)} size="sm" width="90px" bg="white" borderColor="primary.200" color="primary.700" fontWeight="bold">
                      <option value="USD">USD</option>
                      <option value="COP">COP</option>
                    </Select>
                    <Button leftIcon={<FaPlus />} size="sm" colorScheme="primary" onClick={handleAddGoal}>Add Goal</Button>
                  </HStack>
                </Flex>
                <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing={4}>
                  {goals.map((goal, idx) => {
                    const displayTarget = convertCurrency(Number(goal.target), goal.currency, goalCurrency);
                    // Aportes de cada usuario
                    const savedGabby = movements[0]
                      .filter(m => m.type === "savings" && m.category === `Saving for ${goal.name}`)
                      .reduce((acc, curr) => acc + convertCurrency(Number(curr.amount), curr.currency, goalCurrency), 0);
                    const savedJorgie = movements[1]
                      .filter(m => m.type === "savings" && m.category === `Saving for ${goal.name}`)
                      .reduce((acc, curr) => acc + convertCurrency(Number(curr.amount), curr.currency, goalCurrency), 0);
                    const saved = savedGabby + savedJorgie;
                    const percent = displayTarget > 0 ? (saved / displayTarget) * 100 : 0;
                    const percentGabby = displayTarget > 0 ? (savedGabby / displayTarget) * 100 : 0;
                    const percentJorgie = displayTarget > 0 ? (savedJorgie / displayTarget) * 100 : 0;
                    return (
                      <Box key={idx} borderWidth={2} borderColor="primary.200" borderRadius="lg" p={4} boxShadow="lg" bg="primary.50" transition="0.2s" _hover={{ boxShadow: "xl", borderColor: "primary.400" }}>
                        <HStack mb={2}>
                          <FaHome color={theme.colors.primary[500]} size={20} />
                          <Heading size="sm" color="primary.700">{goal.name}</Heading>
                        </HStack>
                        <Text fontSize="sm" color="primary.700" fontWeight="bold">Target:</Text>
                        <Text fontSize="md" color="primary.700" fontWeight="bold">{formatCurrency(displayTarget, goalCurrency)}</Text>
                        <Text fontSize="xs" color="primary.500">({formatCurrency(Number(goal.target), goal.currency)} {goal.currency})</Text>
                        {/* Progreso visual limpio */}
                        <Text fontSize="md" color="primary.700" fontWeight="bold" mt={2} mb={1}>{formatCurrency(saved, goalCurrency)} / {formatCurrency(displayTarget, goalCurrency)}</Text>
                        <Text fontSize="sm" color="primary.700" fontWeight="bold" mb={1}>{percent.toFixed(1)}% achieved</Text>
                        <Box mt={1} mb={2} w="100%" h="22px" borderRadius="full" bg="primary.100" position="relative" overflow="hidden" boxShadow="sm">
                          <Box position="absolute" left={0} top={0} h="100%" bg={theme.colors.gabby[400]} width={`${percentGabby}%`} borderRadius="full" transition="width 0.5s" />
                          <Box position="absolute" left={`${percentGabby}%`} top={0} h="100%" bg={theme.colors.jorgie[400]} width={`${percentJorgie}%`} borderRadius="full" transition="width 0.5s" />
                        </Box>
                        <Flex justify="space-between" fontSize="xs" color="primary.700" mb={1} mt={1}>
                          <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg={theme.colors.gabby[400]} /><Text>Gabby: {formatCurrency(savedGabby, goalCurrency)}</Text></HStack>
                          <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg={theme.colors.jorgie[400]} /><Text>Jorgie: {formatCurrency(savedJorgie, goalCurrency)}</Text></HStack>
                        </Flex>
                        <Text fontSize="xs" color="primary.700" mb={1}>Target Date: {prettyDate(goal.date)}</Text>
                        <HStack mt={2}>
                          <Button size="sm" colorScheme="primary" onClick={() => handleEditGoal(idx)}>Edit</Button>
                          <Button size="sm" colorScheme="red" onClick={() => handleDeleteGoal(idx)}>Delete</Button>
                        </HStack>
                      </Box>
                    );
                  })}
                </SimpleGrid>
                {/* Modal de Goals aquí */}
                <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)}>
                  <ModalOverlay />
                  <ModalContent bg="white">
                    <ModalHeader color="primary.500">{editGoalIndex !== null ? "Edit Goal" : "Add New Goal"}</ModalHeader>
                    <ModalBody>
                      <Input placeholder="Goal Name" mb={2} name="name" value={goalForm.name} onChange={handleGoalFormChange} />
                      <HStack mb={2}>
                        <Input
                          placeholder="Target Amount"
                          type="number"
                          name="target"
                          value={goalForm.target}
                          onChange={e => setGoalForm(f => ({ ...f, target: e.target.value.replace(/[^\d]/g, '') }))}
                        />
                        <Select name="currency" value={goalForm.currency || goalCurrency} onChange={handleGoalFormChange} width="90px">
                          <option value="USD">USD</option>
                          <option value="COP">COP</option>
                        </Select>
                      </HStack>
                      <Input placeholder="Target Date" mb={2} type="date" name="date" value={goalForm.date} onChange={handleGoalFormChange} />
                    </ModalBody>
                    <ModalFooter bg="primary.50">
                      <Button colorScheme="primary" mr={3} onClick={handleGoalSubmit}>
                        {editGoalIndex !== null ? "Update Goal" : "Add Goal"}
                      </Button>
                      <Button onClick={() => setGoalModalOpen(false)}>Cancel</Button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
              </Box>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Modal Add Movement */}
      <Modal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)} isCentered>
        <ModalOverlay />
        <ModalContent maxW="lg" bg="primary.50" borderRadius="2xl" boxShadow="2xl">
          <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="xl" pb={0}>
            Add Movement
          </ModalHeader>
          <ModalBody pt={4} pb={2} px={6}>
            {/* Movement Type label uniform, smaller and normal weight */}
            <Text fontWeight="normal" fontSize="md" color="primary.700" mb={3}>Movement Type</Text>
            <Tabs variant="soft-rounded" colorScheme="primary" align="center" mb={5} index={
              movementType === "income" ? 0 :
              movementType === "expenses" ? 1 :
              movementType === "savings" ? 2 : 3
            } onChange={i => setMovementType(["income", "expenses", "savings", "debts"][i])}>
              <TabList justifyContent="center">
                <Tab _selected={{ bg: 'primary.400', color: 'white', fontWeight: 'normal', boxShadow: 'md' }} px={4} py={1} borderRadius="lg" fontWeight="normal" fontSize="md">Income</Tab>
                <Tab _selected={{ bg: 'primary.400', color: 'white', fontWeight: 'normal', boxShadow: 'md' }} px={4} py={1} borderRadius="lg" fontWeight="normal" fontSize="md">Expense</Tab>
                <Tab _selected={{ bg: 'primary.400', color: 'white', fontWeight: 'normal', boxShadow: 'md' }} px={4} py={1} borderRadius="lg" fontWeight="normal" fontSize="md">Savings</Tab>
                <Tab _selected={{ bg: 'primary.400', color: 'white', fontWeight: 'normal', boxShadow: 'md' }} px={4} py={1} borderRadius="lg" fontWeight="normal" fontSize="md">Debt</Tab>
              </TabList>
            </Tabs>
            <Input
              placeholder="Amount"
              type="number"
              value={movementAmount}
              onChange={e => setMovementAmount(e.target.value)}
              mb={4}
              size="md"
              borderRadius="lg"
              bg="white"
              borderColor="primary.200"
              color="primary.700"
              fontWeight="normal"
              fontSize="md"
              _placeholder={{ color: 'primary.300' }}
            />
            <Select value={movementCurrency} onChange={e => setMovementCurrency(e.target.value)} mb={4} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
              <option value="USD">USD</option>
              <option value="COP">COP</option>
            </Select>
            <Divider my={2} />
            {/* Fields by type */}
            {movementType === "income" && (
              <Box mb={4}>
                <Select value={movementSource} onChange={e => setMovementSource(e.target.value)} mb={2} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
                  {INCOME_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                </Select>
              </Box>
            )}
            {movementType === "expenses" && (
              <Box mb={4}>
                <Select value={movementCategory} onChange={e => setMovementCategory(e.target.value)} mb={2} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
              </Box>
            )}
            {movementType === "savings" && (
              <Box mb={4}>
                <Select value={movementSource} onChange={e => setMovementSource(e.target.value)} mb={2} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
                  {INCOME_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                </Select>
                {/* Selector de goal para cualquier ahorro */}
                <Select
                  value={movementCategory}
                  onChange={e => setMovementCategory(e.target.value)}
                  mb={2}
                  size="md"
                  borderRadius="lg"
                  bg="white"
                  borderColor="primary.200"
                  color="primary.700"
                  fontWeight="normal"
                  fontSize="md"
                >
                  <option value="">General Savings</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={`Saving for ${goal.name}`}>{goal.name}</option>
                  ))}
                </Select>
              </Box>
            )}
            {movementType === "debts" && (
              <Box mb={4}>
                <Select value={movementCategory} onChange={e => setMovementCategory(e.target.value)} mb={2} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
              </Box>
            )}
            {/* Automatic counter movement for savings and debts */}
            {(movementType === "savings" || movementType === "debts") && (
              <Box mb={4} bg="primary.100" borderRadius="lg" p={3}>
                <Checkbox
                  id="autoMovement"
                  isChecked={movementAuto}
                  onChange={e => setMovementAuto(e.target.checked)}
                  mb={2}
                  colorScheme="primary"
                  size="md"
                  fontWeight="normal"
                  fontSize="md"
                >
                  Automatically create counter movement
                </Checkbox>
                {movementAuto && (
                  <Box mt={2}>
                    <Input
                      placeholder="How much is deducted from each check?"
                      type="number"
                      value={autoDeductAmount}
                      onChange={e => setAutoDeductAmount(e.target.value)}
                      mb={2}
                      size="md"
                      borderRadius="lg"
                      bg="white"
                      borderColor="primary.200"
                      color="primary.700"
                      fontWeight="normal"
                      fontSize="md"
                    />
                    <Select value={autoDeductCheck} onChange={e => setAutoDeductCheck(e.target.value)} mb={2} size="md" borderRadius="lg" bg="white" borderColor="primary.200" color="primary.700" fontWeight="normal" fontSize="md">
                      {INCOME_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                    </Select>
                    {movementType === "debts" && movementAuto && (
                      <>
                        <Input
                          placeholder="How many installments?"
                          type="number"
                          value={autoDeductInstallments}
                          onChange={e => setAutoDeductInstallments(e.target.value)}
                          mb={2}
                          size="md"
                          borderRadius="lg"
                          bg="white"
                          borderColor="primary.200"
                          color="primary.700"
                          fontWeight="normal"
                          fontSize="md"
                        />
                        <Box mb={2}>
                          <Text fontSize="md" color="primary.700" mb={1}>Frequency:</Text>
                          <Select
                            value={debtFrequency}
                            onChange={e => setDebtFrequency(e.target.value)}
                            size="md"
                            borderRadius="lg"
                            bg="white"
                            borderColor="primary.200"
                            color="primary.700"
                            fontWeight="normal"
                            fontSize="md"
                            mb={2}
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Biweekly">Biweekly</option>
                          </Select>
                        </Box>
                      </>
                    )}
                    
                    {movementType === "savings" && (
                      <Box mb={2}>
                        <Text fontSize="md" mb={1} color="primary.700" fontWeight="normal">Assign savings to goal:</Text>
                        <Select
                          value={autoDeductGoals[0] || ""}
                          onChange={e => setAutoDeductGoals([e.target.value])}
                          size="md"
                          bg="white"
                          borderColor="primary.200"
                          color="primary.700"
                          borderRadius="lg"
                          fontWeight="normal"
                          fontSize="md"
                        >
                          <option value="">Select goal</option>
                          {goals.map(goal => (
                            <option key={goal.id} value={goal.id}>{goal.name}</option>
                          ))}
                        </Select>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
            <Text fontSize="md" color="primary.400" mt={2} mb={1} textAlign="center">You can set up automatic deductions for savings or debts here.</Text>
          </ModalBody>
          <ModalFooter bg="primary.50" borderBottomRadius="2xl">
            <Button colorScheme="primary" mr={3} onClick={handleUnifiedMovementSubmit} size="md" fontWeight="normal" px={6} py={4} boxShadow="md" borderRadius="lg" fontSize="md">
              Save Movement
            </Button>
            <Button onClick={() => setShowMovementModal(false)} size="md" borderRadius="lg" fontSize="md" fontWeight="normal">Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function Dashboard() {
  return (
    <ChakraProvider theme={theme}>
      <DashboardContent />
    </ChakraProvider>
  );
}

export default Dashboard;