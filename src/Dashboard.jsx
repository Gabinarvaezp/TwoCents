import React, { useState, useEffect } from "react";
import {
  Box, Flex, Avatar, Text, Button, HStack, VStack, IconButton, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Tabs, TabList, TabPanels, Tab, TabPanel, Heading, SimpleGrid, Badge, Select, Table, Thead, Tbody, Tr, Th, Td, Checkbox,
  extendTheme, ChakraProvider, useBreakpointValue
} from "@chakra-ui/react";
import { FaPlus, FaSync, FaSignOutAlt, FaPiggyBank, FaUsers, FaHome, FaTrash, FaFileExport, FaTable, FaEdit } from "react-icons/fa";
import * as XLSX from "xlsx";
import { createClient } from '@supabase/supabase-js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

// --- SUPABASE ---
const supabaseUrl = 'https://ytdmnorypknxuabcfkwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZG1ub3J5cGtueHVhYmNma3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzI3NDgsImV4cCI6MjA2NDMwODc0OH0.pystL1X4_9lSr2ROSarunDlWAwPhUF_dg6cJhHI6df8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- THEME AND CONSTANTS ---
const theme = extendTheme({
  colors: {
    primary: {
      50: "#f8f4f0",
      100: "#f1e6dd",
      200: "#e2cfc3",
      300: "#cbb49e",
      400: "#b89a7a",
      500: "#a67c52",
      600: "#8c6844",
      700: "#6e5235",
      800: "#4d3923",
      900: "#2e1e12",
    },
    gabby: {
      400: "#e48ab6",
      500: "#f7b6d2"
    },
    jorgie: {
      400: "#4a90e2",
      500: "#7db7e8"
    }
  }
});

const users = [
  { name: "Gabby", label: "Wifey", avatar: "/wifey.jpg", currency: "COP", color: theme.colors.gabby[400], chartColor: theme.colors.gabby[500] },
  { name: "Jorgie", label: "Hubby", avatar: "/hubby.jpg", currency: "USD", color: theme.colors.jorgie[400], chartColor: theme.colors.jorgie[500] }
];
const COP_TO_USD = 4500;
const CATEGORIES = [
  "Food", "Golf", "Car Wash", "Travel", "Family", "Public Transport", "Housing", "Beer", "Snacks", "Health", "Entertainment/Friends", "Shopping", "Other"
];
const INCOME_SOURCES = ["First Check", "Second Check", "Both", "Other"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TYPE_EMOJIS = { income: "💸", expenses: "🛒", savings: "🏦", debts: "💳" };

function formatCurrency(amount, currency) {
  if (currency === "COP") return "COL$" + Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function prettyDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function parseAmount(str) {
  if (!str) return 0;
  return Number(str.replace(/,/g, ".").replace(/[^0-9.]/g, ""));
}
function convert(amount, from, to) {
  if (!amount) return 0;
  if (from === to) return amount;
  if (from === "USD" && to === "COP") return amount * COP_TO_USD;
  if (from === "COP" && to === "USD") return amount / COP_TO_USD;
  return amount;
}
function getMonthIndex(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCMonth();
}
function getYear(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCFullYear();
}

// --- GOAL MODAL ---
function GoalModal({ isOpen, onClose, goalForm, setGoalForm, handleGoalSubmit, isEditing }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent borderRadius="xl" p={6}>
        <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="2xl">
          {isEditing ? "Edit Goal" : "Add Goal"}
        </ModalHeader>
        <ModalBody>
          <Input
            placeholder="Goal name"
            mb={2}
            value={goalForm.name}
            name="name"
            onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="Target amount"
            mb={2}
            value={goalForm.target}
            name="target"
            onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
            type="number"
          />
          <Select
            mb={2}
            value={goalForm.currency}
            name="currency"
            onChange={e => setGoalForm(f => ({ ...f, currency: e.target.value }))}
          >
            <option value="USD">USD</option>
            <option value="COP">COP</option>
          </Select>
          <Input
            placeholder="Goal date (optional)"
            mb={2}
            value={goalForm.date}
            name="date"
            onChange={e => setGoalForm(f => ({ ...f, date: e.target.value }))}
            type="date"
          />
        </ModalBody>
        <ModalFooter display="flex" justifyContent="center">
          <Button colorScheme="primary" onClick={handleGoalSubmit}>{isEditing ? "Update Goal" : "Add Goal"}</Button>
          <Button ml={3} onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
// --- DASHBOARD CONTENT ---
function DashboardContent() {
  // --- STATES ---
  const [showLogin, setShowLogin] = useState(true);
  const [pendingUser, setPendingUser] = useState(0);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeUser, setActiveUser] = useState(0);
  const [currency, setCurrency] = useState(users[0].currency);

  const [movements, setMovements] = useState([[], []]);
  const [goals, setGoals] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([[], []]);
  const [selectedMonth, setSelectedMonth] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [monthSummaryOpen, setMonthSummaryOpen] = useState(false);
  const [fixedModalOpen, setFixedModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [addTab, setAddTab] = useState("movement");
  const [movementType, setMovementType] = useState("income");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementCategory, setMovementCategory] = useState("");
  const [movementSource, setMovementSource] = useState(INCOME_SOURCES[0]);
  const [movementAuto, setMovementAuto] = useState(false);
  const [movementCurrency, setMovementCurrency] = useState(users[0].currency);
  const [movementGoal, setMovementGoal] = useState("");

  const [fixedForm, setFixedForm] = useState({ name: "", amount: "", currency: users[0].currency, frequency: "monthly", period: "first", type: "expense", username: users[0].name, active: true });
  const [editFixedIdx, setEditFixedIdx] = useState(null);

  // NUEVO: Estado para el modal de goal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", currency: "USD", date: "" });
  const [editGoalIndex, setEditGoalIndex] = useState(null);

  const isMobile = useBreakpointValue({ base: true, md: false });
  const toast = useToast();

  // ---- DATA FETCHING ----
  async function fetchMovements() {
    try {
      const { data: gabby } = await supabase.from("movements").select("*").eq("username", "Gabby").order("date", { ascending: false });
      const { data: jorgie } = await supabase.from("movements").select("*").eq("username", "Jorgie").order("date", { ascending: false });
      setMovements([gabby || [], jorgie || []]);
    } catch (e) { }
  }
  async function fetchGoals() {
    try {
      const { data } = await supabase.from("goals").select("*").order("id", { ascending: false });
      setGoals(data || []);
    } catch (e) { }
  }
  async function fetchFixed() {
    try {
      const { data: gabby } = await supabase.from("fixed_expenses").select("*").eq("username", "Gabby").order("id", { ascending: false });
      const { data: jorgie } = await supabase.from("fixed_expenses").select("*").eq("username", "Jorgie").order("id", { ascending: false });
      setFixedExpenses([gabby || [], jorgie || []]);
    } catch (e) { }
  }

  useEffect(() => {
    fetchMovements();
    fetchGoals();
    fetchFixed();
    const interval = setInterval(() => {
      fetchMovements();
      fetchGoals();
      fetchFixed();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth({ month: now.getMonth(), year: now.getFullYear() });
  }, []);

  // ---- LOGIN ----
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

  function openAddModal(tab = "movement") {
    setAddTab(tab);
    setAddModalOpen(true);
    setMovementType("income");
    setMovementAmount("");
    setMovementCategory("");
    setMovementSource(INCOME_SOURCES[0]);
    setMovementAuto(false);
    setMovementCurrency(users[activeUser].currency);
    setMovementGoal("");
    setFixedForm({ name: "", amount: "", currency: users[activeUser].currency, frequency: "monthly", period: "first", type: "expense", username: users[activeUser].name, active: true });
    setEditFixedIdx(null);
  }

  async function handleMovementSubmit() {
    const amt = parseAmount(movementAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Please enter a valid amount", status: "warning", duration: 2000 });
      return;
    }
    try {
      let newMov = {
        type: movementType,
        amount: amt,
        category: movementType === "savings" && movementGoal ? `Saving for ${movementGoal}` : (movementType === "income" || movementType === "savings" ? movementSource : movementCategory),
        currency: movementCurrency,
        date: todayStr(),
        auto: movementAuto,
        username: users[activeUser].name
      };
      const { error } = await supabase.from("movements").insert([newMov]);
      if (error) throw new Error(`Error inserting movement: ${error.message}`);
      await fetchMovements();
      setAddModalOpen(false);
      toast({ title: "Movement added", status: "success", duration: 1500 });
    } catch (error) {
      toast({ title: "Error saving movement", description: error.message, status: "error", duration: 5000, isClosable: true });
    }
  }

  async function handleDeleteMovement(id) {
    try {
      await supabase.from("movements").delete().eq("id", id);
      await fetchMovements();
      toast({ title: "Movement deleted", status: "info", duration: 1500 });
    } catch (error) {
      toast({ title: "Error deleting movement", description: error.message, status: "error", duration: 3000 });
    }
  }

  async function handleAddFixed() {
    const amt = parseAmount(fixedForm.amount);
    if (!fixedForm.name || isNaN(amt) || amt <= 0) {
      toast({ title: "Name and valid amount required", status: "warning", duration: 1200 });
      return;
    }
    try {
      await supabase.from("fixed_expenses").insert([{ ...fixedForm, amount: amt }]);
      toast({ title: "Fixed expense added", status: "success", duration: 1200 });
      setAddModalOpen(false);
      await fetchFixed();
    } catch (error) {
      toast({ title: "Error adding fixed expense", description: error.message, status: "error", duration: 3000 });
    }
  }

  async function handleEditFixed(idx) {
    setFixedForm(fixedExpenses[activeUser][idx]);
    setEditFixedIdx(idx);
    setAddTab("fixed");
    setAddModalOpen(true);
  }

  async function handleUpdateFixed() {
    const amt = parseAmount(fixedForm.amount);
    if (!fixedForm.name || !amt) {
      toast({ title: "Name and amount required", status: "warning", duration: 1200 });
      return;
    }
    try {
      await supabase.from("fixed_expenses").update({ ...fixedForm, amount: amt }).eq("id", fixedExpenses[activeUser][editFixedIdx].id);
      toast({ title: "Fixed expense updated", status: "success", duration: 1200 });
      setAddModalOpen(false);
      await fetchFixed();
    } catch (error) {
      toast({ title: "Error updating fixed expense", description: error.message, status: "error", duration: 3000 });
    }
  }

  async function handleDeleteFixed(id) {
    try {
      await supabase.from("fixed_expenses").delete().eq("id", id);
      await fetchFixed();
      toast({ title: "Fixed expense deleted", status: "info", duration: 1200 });
    } catch (error) {
      toast({ title: "Error deleting fixed expense", description: error.message, status: "error", duration: 3000 });
    }
  }

  // NUEVO: Modal goal handlers
  function handleAddGoal() {
    setGoalForm({ name: "", target: "", currency: "USD", date: "" });
    setEditGoalIndex(null);
    setGoalModalOpen(true);
  }
  function handleEditGoal(idx) {
    setGoalForm(goals[idx]);
    setEditGoalIndex(idx);
    setGoalModalOpen(true);
  }
  async function handleGoalSubmit() {
    const amt = parseAmount(goalForm.target);
    if (!goalForm.name || !amt) {
      toast({ title: "Name and target required", status: "warning", duration: 2000 });
      return;
    }
    try {
      if (editGoalIndex !== null && goals[editGoalIndex]) {
        await supabase.from("goals").update({ ...goalForm, target: amt }).eq("id", goals[editGoalIndex].id);
        toast({ title: "Goal updated", status: "success", duration: 2000 });
      } else {
        await supabase.from("goals").insert([{ ...goalForm, target: amt }]);
        toast({ title: "Goal added", status: "success", duration: 2000 });
      }
      setGoalModalOpen(false);
      await fetchGoals();
    } catch (error) {
      toast({ title: "Error with goal", description: error.message, status: "error", duration: 3000 });
    }
  }
  async function handleDeleteGoal(idx) {
    try {
      await supabase.from("goals").delete().eq("id", goals[idx].id);
      await fetchGoals();
      toast({ title: "Goal deleted", status: "info", duration: 2000 });
    } catch (error) {
      toast({ title: "Error deleting goal", description: error.message, status: "error", duration: 3000 });
    }
  }

  function handleExportExcel() {
    try {
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
      XLSX.writeFile(wb, `${users[activeUser].name}_movements.xlsx`);
    } catch (error) {
      toast({ title: "Error exporting data", description: error.message, status: "error", duration: 3000 });
    }
  }

  function handleCurrencyToggle() {
    setCurrency(c => c === "USD" ? "COP" : "USD");
  }

  function handleLogout() {
    setShowLogin(true);
    setActiveUser(0);
    localStorage.removeItem("activeUser");
    toast({ title: "Logged out!", status: "info", duration: 1500 });
  }

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

  function getGoalProgress(goal, currency) {
    const gabbySaved = movements[0].filter(m => m.type === "savings" && m.category === `Saving for ${goal.name}`)
      .reduce((a, m) => a + convert(m.amount, m.currency, currency), 0);
    const jorgieSaved = movements[1].filter(m => m.type === "savings" && m.category === `Saving for ${goal.name}`)
      .reduce((a, m) => a + convert(m.amount, m.currency, currency), 0);
    const totalSaved = gabbySaved + jorgieSaved;
    const target = convert(goal.target, goal.currency, currency);
    return {
      gabbySaved, jorgieSaved, totalSaved, target,
      percent: target ? (totalSaved / target) * 100 : 0,
      percentGabby: target ? (gabbySaved / target) * 100 : 0,
      percentJorgie: target ? (jorgieSaved / target) * 100 : 0
    };
  }
    // --- ADD MODAL (Movements & Fixed Expenses) ---
  function renderAddModal() {
    return (
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} isCentered size={isMobile ? "full" : "sm"}>
        <ModalOverlay />
        <ModalContent borderRadius="xl" p={isMobile ? 2 : 8} mx={isMobile ? 2 : undefined}>
          <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="2xl">
            {addTab === "fixed" || editFixedIdx !== null ? "Fixed Expense" : "Add Movement"}
          </ModalHeader>
          <ModalBody>
            <Tabs
              isFitted
              colorScheme="primary"
              index={addTab === "fixed" || editFixedIdx !== null ? 1 : 0}
              onChange={(idx) => {
                setAddTab(idx === 1 ? "fixed" : "movement");
                setEditFixedIdx(null);
              }}
              variant="soft-rounded"
              mb={4}
            >
              <TabList>
                <Tab>Add Movement</Tab>
                <Tab>Add Fixed</Tab>
              </TabList>
            </Tabs>
            {addTab === "fixed" || editFixedIdx !== null ? (
              <>
                <Input
                  placeholder="Name"
                  mb={2}
                  value={fixedForm.name}
                  onChange={e => setFixedForm(f => ({ ...f, name: e.target.value }))}
                />
                <Input
                  placeholder="Amount"
                  mb={2}
                  value={fixedForm.amount}
                  onChange={e => setFixedForm(f => ({ ...f, amount: e.target.value }))}
                  type="number"
                />
                <Select
                  mb={2}
                  value={fixedForm.currency}
                  onChange={e => setFixedForm(f => ({ ...f, currency: e.target.value }))}
                >
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                </Select>
                <Select
                  mb={2}
                  value={fixedForm.frequency}
                  onChange={e => setFixedForm(f => ({ ...f, frequency: e.target.value }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="yearly">Yearly</option>
                </Select>
                <Select
                  mb={2}
                  value={fixedForm.period}
                  onChange={e => setFixedForm(f => ({ ...f, period: e.target.value }))}
                >
                  <option value="first">First</option>
                  <option value="second">Second</option>
                  <option value="both">Both</option>
                </Select>
                <Checkbox
                  isChecked={fixedForm.active}
                  onChange={e => setFixedForm(f => ({ ...f, active: e.target.checked }))}
                  mb={2}
                >
                  Active
                </Checkbox>
              </>
            ) : (
              <>
                <Select mb={2} value={movementType} onChange={e => setMovementType(e.target.value)}>
                  <option value="income">Income</option>
                  <option value="expenses">Expenses</option>
                  <option value="savings">Savings</option>
                  <option value="debts">Debts</option>
                </Select>
                <Input
                  placeholder="Amount"
                  mb={2}
                  value={movementAmount}
                  onChange={e => setMovementAmount(e.target.value)}
                  type="number"
                />
                <Select mb={2} value={movementCurrency} onChange={e => setMovementCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                </Select>
                {movementType === "expenses" && (
                  <Select mb={2} value={movementCategory} onChange={e => setMovementCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
                {movementType === "income" && (
                  <Select mb={2} value={movementSource} onChange={e => setMovementSource(e.target.value)}>
                    {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                )}
                {movementType === "savings" && (
                  <Select mb={2} value={movementGoal} onChange={e => setMovementGoal(e.target.value)}>
                    <option value="">Choose Goal</option>
                    {goals.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </Select>
                )}
                <Checkbox isChecked={movementAuto} onChange={e => setMovementAuto(e.target.checked)} mb={2}>Automatic</Checkbox>
              </>
            )}
          </ModalBody>
          <ModalFooter display="flex" justifyContent="center">
            {addTab === "fixed" || editFixedIdx !== null ? (
              editFixedIdx !== null ? (
                <Button colorScheme="primary" onClick={handleUpdateFixed}>Update Fixed</Button>
              ) : (
                <Button colorScheme="primary" onClick={handleAddFixed}>Add Fixed</Button>
              )
            ) : (
              <Button colorScheme="primary" onClick={handleMovementSubmit}>Add Movement</Button>
            )}
            <Button ml={3} onClick={() => setAddModalOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // ... (Aquí irían renderMonthSummaryModal, renderFixedExpensesModal, renderHomePanel, renderTogetherPanel, y el return principal) ...
    // --- HOME PANEL ---
  function renderHomePanel() {
    const summary = getSummary(movements[activeUser], currency, selectedMonth.month, selectedMonth.year);

    return (
      <Flex
        direction="column"
        align="center"
        justify="flex-start"
        w="100%"
        maxW={{ base: "98vw", md: "600px" }}
        mx="auto"
        px={{ base: 1, md: 4 }}
        py={2}
        bg="transparent"
      >
        {/* Overview Card */}
        <Box
          w="100%"
          borderRadius="2xl"
          bg="white"
          boxShadow="lg"
          p={{ base: 3, md: 6 }}
          mt={2}
          mb={2}
          textAlign="center"
          display="flex"
          flexDirection="column"
          alignItems="center"
          overflow="hidden"
          maxW="100%"
        >
          <Avatar size="xl" src={users[activeUser].avatar} mb={2} border={`3px solid ${users[activeUser].color}`} mx="auto" />
          <Heading size={{ base: "sm", md: "md" }} color="primary.700" mb={0} fontWeight="bold">{users[activeUser].name}'s Overview</Heading>
          <Text color="primary.400" fontSize={{ base: "sm", md: "md" }} mb={4} isTruncated>Every step matters.</Text>
          <Box
            w="100%"
            maxW={{ base: "98vw", md: "330px" }}
            bg="primary.100"
            borderRadius="lg"
            px={4}
            py={3}
            mb={3}
            boxShadow="sm"
            mx="auto"
            fontSize={{ base: "sm", md: "md" }}
          >
            <SimpleGrid columns={2} spacing={1}>
              <Box>
                <Text fontWeight="bold" color="primary.700">Income</Text>
                <Text color="green.600">{formatCurrency(summary.income, currency)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="primary.700">Expenses</Text>
                <Text color="red.600">{formatCurrency(summary.expenses, currency)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="primary.700">Savings</Text>
                <Text color="blue.600">{formatCurrency(summary.savings, currency)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="primary.700">Balance</Text>
                <Text color={summary.balance >= 0 ? "green.700" : "red.700"}>{formatCurrency(summary.balance, currency)}</Text>
              </Box>
            </SimpleGrid>
          </Box>
          <Button colorScheme="primary" onClick={() => openAddModal("movement")} leftIcon={<FaPlus />} mb={2} fontSize={{ base: "sm", md: "md" }}>Add Movement / Fixed</Button>
          <Button colorScheme="primary" onClick={() => setMonthSummaryOpen(true)} leftIcon={<FaTable />} mb={2} fontSize={{ base: "sm", md: "md" }}>Month Summary</Button>
          <Button colorScheme="primary" onClick={() => setFixedModalOpen(true)} leftIcon={<FaTable />} mb={2} fontSize={{ base: "sm", md: "md" }}>Fixed Expenses</Button>
        </Box>
        {/* Movements Table */}
        <Box w="100%" mt={2} bg="white" borderRadius="xl" boxShadow="md" p={3} maxW="100%">
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>My Movements ({MONTHS[selectedMonth.month]})</Text>
            <IconButton icon={<FaFileExport />} size="sm" onClick={handleExportExcel} aria-label="export" />
          </Flex>
          <Box overflowX="auto">
            <Table size="sm" variant="simple" maxW="100%">
              <Thead>
                <Tr>
                  <Th w="30px"></Th>
                  <Th>Type</Th>
                  <Th>Category</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Date</Th>
                  <Th w="30px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {movements[activeUser].filter(m => getMonthIndex(m.date) === selectedMonth.month && getYear(m.date) === selectedMonth.year).map((m, i) => (
                  <Tr key={m.id || i}>
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
                      <IconButton icon={<FaTrash />} size="xs" colorScheme="red" variant="ghost" aria-label="delete" onClick={() => handleDeleteMovement(m.id)} />
                    </Td>
                  </Tr>
                ))}
                {movements[activeUser].filter(m => getMonthIndex(m.date) === selectedMonth.month && getYear(m.date) === selectedMonth.year).length === 0 &&
                  <Tr><Td colSpan={6} textAlign="center"><Text color="gray.400">No movements for this month.</Text></Td></Tr>
                }
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Flex>
    );
  }

  // --- TOGETHER PANEL ---
  function renderTogetherPanel() {
    return (
      <Box
        w="100%"
        maxW={{ base: "98vw", md: "900px" }}
        mx="auto"
        mt={6}
        bg="white"
        borderRadius="2xl"
        p={{ base: 2, md: 8 }}
        boxShadow="xl"
        display="flex"
        flexDirection="column"
        alignItems="center"
        overflow="hidden"
      >
        <Heading size="lg" color="primary.500" mb={2} textAlign="center" fontSize={{ base: "md", md: "lg" }}>
          Together
        </Heading>
        <Text color="gray.500" mb={4} textAlign="center" fontSize={{ base: "sm", md: "md" }}>
          Teamwork for your dreams.
        </Text>
        {/* Summary together */}
        <Box
          w="100%"
          maxW={{ base: "98vw", md: "780px" }}
          bg="primary.100"
          borderRadius="md"
          p={{ base: 2, md: 4 }}
          mb={6}
          boxShadow="sm"
          display="flex"
          flexDirection={{ base: "column", md: "row" }}
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          {users.map((u, idx) => {
            const summary = getSummary(movements[idx], currency, selectedMonth.month, selectedMonth.year);
            return (
              <Box key={u.name} flex="1" textAlign="center" p={2}>
                <Avatar src={u.avatar} size="md" mb={1} mx="auto" />
                <Text fontWeight="bold" color={u.color}>{u.label}</Text>
                <Text fontSize="xs" color="primary.700">Balance: {formatCurrency(summary.balance, currency)}</Text>
                <Text fontSize="xs" color="green.600">Income: {formatCurrency(summary.income, currency)}</Text>
                <Text fontSize="xs" color="red.600">Expenses: {formatCurrency(summary.expenses, currency)}</Text>
                <Text fontSize="xs" color="blue.600">Savings: {formatCurrency(summary.savings, currency)}</Text>
              </Box>
            );
          })}
        </Box>
        {/* --- GRÁFICO DE BARRAS --- */}
        <Box w="100%" maxW={{ base: "98vw", md: "780px" }} h={{ base: "180px", md: "320px" }} mb={6}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={users.map((u, idx) => {
              const summary = getSummary(movements[idx], currency, selectedMonth.month, selectedMonth.year);
              return {
                name: u.label,
                Income: summary.income,
                Expenses: summary.expenses,
                Savings: summary.savings
              };
            })}>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => formatCurrency(v, currency)} />
              <Tooltip formatter={v => formatCurrency(v, currency)} />
              <Legend />
              <Bar dataKey="Income" fill={theme.colors.primary[500]} />
              <Bar dataKey="Expenses" fill={theme.colors.gabby[400]} />
              <Bar dataKey="Savings" fill={theme.colors.jorgie[400]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        {/* Goals Section */}
        <Box w="100%" mt={2} mb={2}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>Goals</Text>
            <Button colorScheme="primary" size="sm" leftIcon={<FaPlus />} fontSize={{ base: "sm", md: "md" }} onClick={handleAddGoal}>Add Goal</Button>
          </Flex>
          {goals.length === 0 &&
            <Text color="gray.400" textAlign="center">No goals yet. Add your first goal!</Text>
          }
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {goals.map((goal, idx) => {
              const prog = getGoalProgress(goal, currency);
              return (
                <Box key={goal.id || idx} borderRadius="xl" boxShadow="md" p={4} bg="primary.50">
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="bold" color="primary.700">{goal.name}</Text>
                    <HStack>
                      <IconButton icon={<FaEdit />} onClick={() => handleEditGoal(idx)} aria-label="edit" size="xs" />
                      <IconButton icon={<FaTrash />} onClick={() => handleDeleteGoal(idx)} aria-label="delete" size="xs" colorScheme="red" />
                    </HStack>
                  </Flex>
                  <Text fontSize="sm" color="gray.600" mb={1}>Target: {formatCurrency(goal.target, goal.currency)}</Text>
                  <Text fontSize="sm" color="blue.800" mb={1}>Saved: {formatCurrency(prog.totalSaved, currency)} ({prog.percent.toFixed(1)}%)</Text>
                  <Flex gap={2}>
                    <Badge colorScheme="blue">{users[0].label}: {formatCurrency(prog.gabbySaved, currency)}</Badge>
                    <Badge colorScheme="cyan">{users[1].label}: {formatCurrency(prog.jorgieSaved, currency)}</Badge>
                  </Flex>
                  <Box w="100%" mt={2} bg="gray.200" borderRadius="md" h="10px" overflow="hidden">
                    <Box w={`${Math.min(100, prog.percent)}%`} h="100%" bg="primary.400" />
                  </Box>
                  <Text fontSize="xs" color="gray.600">{goal.date ? "Goal date: " + prettyDate(goal.date) : ""}</Text>
                </Box>
              );
            })}
          </SimpleGrid>
        </Box>
      </Box>
    );
  }
    // --- MONTH SUMMARY MODAL ---
  function renderMonthSummaryModal() {
    const { month: selectedMonthIdx, year: selectedYear } = selectedMonth;

    return (
      <Modal isOpen={monthSummaryOpen} onClose={() => setMonthSummaryOpen(false)} isCentered size={isMobile ? "full" : "lg"}>
        <ModalOverlay />
        <ModalContent borderRadius="xl" p={isMobile ? 2 : 8} mx={isMobile ? 2 : undefined}>
          <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="2xl" pb={2}>
            Month Summary
          </ModalHeader>
          <ModalBody>
            <Flex justify="center" align="center" mb={4} wrap="wrap" gap={2}>
              <Select
                value={selectedMonth.month}
                onChange={e => setSelectedMonth(s => ({ ...s, month: Number(e.target.value) }))}
                width="auto"
                fontWeight="bold"
              >
                {MONTHS.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </Select>
              <Select
                value={selectedMonth.year}
                onChange={e => setSelectedMonth(s => ({ ...s, year: Number(e.target.value) }))}
                width="auto"
                fontWeight="bold"
              >
                {[...new Set(movements[activeUser].map(m => getYear(m.date)))].sort((a, b) => b - a).map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </Select>
            </Flex>
            <Box bg="primary.100" borderRadius="lg" boxShadow="sm" p={4} mb={4} textAlign="center">
              <Text fontWeight="bold" color="primary.700">Income: {formatCurrency(getSummary(movements[activeUser], currency, selectedMonthIdx, selectedYear).income, currency)}</Text>
              <Text fontWeight="bold" color="primary.700">Expenses: {formatCurrency(getSummary(movements[activeUser], currency, selectedMonthIdx, selectedYear).expenses, currency)}</Text>
              <Text fontWeight="bold" color="primary.700">Balance: {formatCurrency(getSummary(movements[activeUser], currency, selectedMonthIdx, selectedYear).balance, currency)}</Text>
            </Box>
            <Box mb={4}>
              <Text fontWeight="bold" mb={2} color="primary.700" textAlign="center">Movements</Text>
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th w="30px"></Th>
                      <Th>Type</Th>
                      <Th>Category</Th>
                      <Th isNumeric>Amount</Th>
                      <Th>Date</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {(movements[activeUser].filter(m => getMonthIndex(m.date) === selectedMonthIdx && getYear(m.date) === selectedYear) || []).map((m, i) => (
                      <Tr key={m.id || i}>
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
                      </Tr>
                    ))}
                    {(movements[activeUser].filter(m => getMonthIndex(m.date) === selectedMonthIdx && getYear(m.date) === selectedYear) || []).length === 0 &&
                      <Tr><Td colSpan={5} textAlign="center"><Text color="gray.400">No movements for this month.</Text></Td></Tr>
                    }
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </ModalBody>
          <ModalFooter display="flex" justifyContent="center">
            <Button colorScheme="primary" onClick={() => setMonthSummaryOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // --- FIXED EXPENSES MODAL ---
  function renderFixedExpensesModal() {
    const { month: selectedMonthIdx } = selectedMonth;
    const fixed = fixedExpenses[activeUser].filter(fx => fx.active);

    return (
      <Modal isOpen={fixedModalOpen} onClose={() => setFixedModalOpen(false)} isCentered size={isMobile ? "full" : "sm"}>
        <ModalOverlay />
        <ModalContent borderRadius="xl" p={isMobile ? 2 : 8} mx={isMobile ? 2 : undefined}>
          <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="2xl">
            Fixed Expenses ({MONTHS[selectedMonthIdx]})
          </ModalHeader>
          <ModalBody>
            {fixed.length === 0 && <Text color="gray.500" textAlign="center">No fixed expenses for this month.</Text>}
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th isNumeric>Amount</Th>
                    <Th>Freq</Th>
                    <Th>Period</Th>
                    <Th>Edit</Th>
                    <Th>Delete</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {fixed.map((fx, i) => (
                    <Tr key={fx.id || i}>
                      <Td>{fx.name}</Td>
                      <Td isNumeric>{formatCurrency(fx.amount, fx.currency)}</Td>
                      <Td>{fx.frequency}</Td>
                      <Td>{fx.period}</Td>
                      <Td>
                        <IconButton icon={<FaEdit />} size="xs" variant="ghost" aria-label="edit" onClick={() => handleEditFixed(i)} />
                      </Td>
                      <Td>
                        <IconButton icon={<FaTrash />} size="xs" variant="ghost" aria-label="delete" colorScheme="red" onClick={() => handleDeleteFixed(fx.id)} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <Button colorScheme="primary" mt={4} w="100%" leftIcon={<FaPlus />} onClick={() => openAddModal("fixed")}>Add Fixed Expense</Button>
          </ModalBody>
          <ModalFooter display="flex" justifyContent="center">
            <Button colorScheme="primary" onClick={() => setFixedModalOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // --- RENDER PRINCIPAL ---
  if (showLogin) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="primary.50">
        <Box bg="white"
          p={{ base: 4, md: 8 }}
          borderRadius="2xl"
          shadow="lg"
          w={{ base: "95vw", sm: "350px", md: "400px" }}
          mx="auto"
        >
          <Heading mb={4} textAlign="center" color="primary.700" fontSize={{ base: "xl", md: "2xl" }}>Couple Finance ❤️</Heading>
          <Text mb={2} fontSize={{ base: "sm", md: "md" }}>Select your profile to start:</Text>
          <HStack mb={4} spacing={6} justify="center">
            {users.map((u, idx) => (
              <VStack key={u.name} onClick={() => setPendingUser(idx)} cursor="pointer">
                <Avatar src={u.avatar} size="lg" border={pendingUser === idx ? `2px solid ${u.color}` : "2px solid transparent"} />
                <Text fontWeight={pendingUser === idx ? "bold" : "normal"} color={u.color} fontSize={{ base: "sm", md: "md" }}>{u.label}</Text>
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
              fontSize={{ base: "md", md: "lg" }}
            />
            {loginError && <Text color="red.500" fontSize="sm">{loginError}</Text>}
            <Button colorScheme="primary" type="submit" w="100%" mt={2} fontSize={{ base: "md", md: "lg" }}>Login</Button>
          </form>
        </Box>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="primary.50">
      {/* HEADER */}
      <Box bg="primary.500" p={{ base: 3, md: 4 }} borderBottomRadius="md" boxShadow="md" textAlign="center" position="relative" color="white">
        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold">Couple Finance ❤️</Text>
        <Text fontSize={{ base: "sm", md: "md" }}>Small wins add up.</Text>
        <HStack mt={2} justify="center">
          <Button
            leftIcon={<FaPiggyBank />}
            onClick={handleCurrencyToggle}
            colorScheme="primary"
            variant="solid"
            size="sm"
            color="white"
            bg="primary.400"
            _hover={{ bg: "primary.500" }}
            fontSize={{ base: "xs", md: "sm" }}
          >
            Show in {currency === "USD" ? "COP" : "USD"}
          </Button>
          <IconButton
            icon={<FaSync />}
            onClick={() => { fetchMovements(); fetchGoals(); fetchFixed(); }}
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
      <Flex justify="center" mt={4}>
        <Tabs isFitted variant="soft-rounded" colorScheme="primary"
          align="center"
          w={{ base: "98vw", md: "600px" }}
          borderRadius="lg"
        >
          <TabList
            justifyContent="center"
            w="100%"
            rounded="lg"
            bg="primary.100"
            mx="auto"
            fontSize={{ base: "xs", md: "md" }}
          >
            <Tab flex="1" mx={1} borderRadius="lg" fontWeight="bold"><FaHome /> Home</Tab>
            <Tab flex="1" mx={1} borderRadius="lg" fontWeight="bold"><FaUsers /> Together</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={{ base: 0, md: 4 }}>
              {renderHomePanel && renderHomePanel()}
            </TabPanel>
            <TabPanel px={{ base: 0, md: 4 }}>
              {renderTogetherPanel && renderTogetherPanel()}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
      {renderAddModal()}
      {renderMonthSummaryModal()}
      {renderFixedExpensesModal()}
      {/* NUEVO: Goal Modal */}
      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        handleGoalSubmit={handleGoalSubmit}
        isEditing={editGoalIndex !== null}
      />
    </Box>
  );
}

// Componente principal
function Dashboard() {
  return (
    <ChakraProvider theme={theme}>
      <DashboardContent />
    </ChakraProvider>
  );
}

export default Dashboard;