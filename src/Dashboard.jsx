import React, { useState, useEffect } from "react";
import {
  Box, Flex, Avatar, Text, Button, HStack, VStack, Divider, IconButton, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Progress, SimpleGrid, Badge, Select, Table, Thead, Tbody, Tr, Th, Td,
  extendTheme, ChakraProvider, useBreakpointValue
} from "@chakra-ui/react";
import { FaPlus, FaSync, FaSignOutAlt, FaPiggyBank, FaUsers, FaHome, FaTrash, FaFileExport, FaArrowDown, FaArrowUp, FaChevronDown, FaChevronUp, FaRegCalendarAlt, FaRegCreditCard, FaTable, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";

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
  "Food", "Golf", "Car Wash", "Travel", "Family", "Public Transport", "Housing", "Beer", "Snacks", "Health", "Entertainment/Friends", "Shopping", "Other"
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
  const [movements, setMovements] = useState(() => {
    const saved = localStorage.getItem("movements");
    return saved ? JSON.parse(saved) : [[],[]];
  });

  // --- Goals State ---
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem("goals");
    return saved ? JSON.parse(saved) : [{
      name: "Cozy House",
      target: 30000,
      date: "2026-01-28"
    }];
  });

  // --- UI States for Modals and Tabs ---
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editGoalIndex, setEditGoalIndex] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", date: "" });

  const [movementModal, setMovementModal] = useState(false);
  const [movementType, setMovementType] = useState("income");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementCategory, setMovementCategory] = useState("");
  const [movementSource, setMovementSource] = useState(INCOME_SOURCES[0]);
  const [movementAuto, setMovementAuto] = useState(false);
  const [movementCurrency, setMovementCurrency] = useState(user.currency);

  const [tab, setTab] = useState(0);
  const [monthSummaryOpen, setMonthSummaryOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [showMonthMovements, setShowMonthMovements] = useState({});
  const toast = useToast();

  // --- Responsive helpers ---
  const isMobile = useBreakpointValue({ base: true, md: false });

  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem("movements", JSON.stringify(movements)); }, [movements]);
  useEffect(() => { localStorage.setItem("goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem("activeUser", activeUser); }, [activeUser]);

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
  function handleAddMovement() {
    setMovementType("income");
    setMovementAmount("");
    setMovementCategory("");
    setMovementSource(INCOME_SOURCES[0]);
    setMovementAuto(false);
    setMovementCurrency(user.currency);
    setMovementModal(true);
  }
  function handleMovementSubmit() {
    const amt = parseAmount(movementAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Please enter a valid amount", status: "warning", duration: 2000 });
      return;
    }
    let newMov = {
      type: movementType,
      amount: amt,
      category: movementType === "savings" && movementCategory ? movementCategory : (movementType === "income" || movementType === "savings" ? movementSource : movementCategory),
      currency: movementCurrency,
      date: todayStr(),
      auto: movementAuto
    };

    setMovements(movs => {
      const copy = [...movs];
      if (movementType === "savings" && (movementSource === "First Check" || movementSource === "Second Check" || movementSource === "Both")) {
        copy[activeUser] = [
          ...copy[activeUser],
          { ...newMov },
          { type: "income", amount: -amt, category: movementSource, currency: movementCurrency, date: todayStr(), auto: true }
        ];
      } else if (movementType === "debts") {
        copy[activeUser] = [
          ...copy[activeUser],
          { ...newMov },
          { type: "income", amount: -amt, category: movementCategory, currency: movementCurrency, date: todayStr(), auto: true }
        ];
      } else {
        copy[activeUser] = [...copy[activeUser], newMov];
      }
      return copy;
    });
    setMovementModal(false);
    toast({ title: "Movement added", status: "success", duration: 1500 });
  }
  function handleDeleteMovement(idx) {
    setMovements(movs => {
      const copy = [...movs];
      copy[activeUser] = copy[activeUser].filter((_, i) => i !== idx);
      return copy;
    });
    toast({ title: "Movement deleted", status: "info", duration: 1500 });
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
  function handleDeleteGoal(idx) {
    setGoals(goals => goals.filter((_, i) => i !== idx));
    toast({ title: "Goal deleted", status: "info", duration: 2000 });
  }
  function handleGoalSubmit() {
    if (!goalForm.name || !goalForm.target) {
      toast({ title: "Name and target required", status: "warning", duration: 2000 });
      return;
    }
    if (editGoalIndex !== null) {
      setGoals(goals => goals.map((g, i) => i === editGoalIndex ? goalForm : g));
      toast({ title: "Goal updated", status: "success", duration: 2000 });
    } else {
      setGoals(goals => [...goals, goalForm]);
      toast({ title: "Goal added", status: "success", duration: 2000 });
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
  const summary = getSummary(movements[activeUser], currency);

  // --- Together Summary Calculation ---
  const togetherSummary = {
    income: 0, expenses: 0, savings: 0, debts: 0, balance: 0
  };
  [0, 1].forEach(idx => {
    const s = getSummary(movements[idx], currency);
    togetherSummary.income += s.income;
    togetherSummary.expenses += s.expenses;
    togetherSummary.savings += s.savings;
    togetherSummary.debts += s.debts;
    togetherSummary.balance += s.balance;
  });

  // --- Pie Chart Data (Current Month) ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const pieData = [
    { name: "Income", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).income },
    { name: "Expenses", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).expenses },
    { name: "Savings", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).savings },
    { name: "Debts", value: getSummary(movements[activeUser], currency, currentMonth, currentYear).debts }
  ].filter(item => item.value !== 0);
  const pieDataTogether = [
    { name: `${users[0].label} Income`, value: getSummary(movements[0], currency, currentMonth, currentYear).income, color: users[0].chartColor },
    { name: `${users[1].label} Income`, value: getSummary(movements[1], currency, currentMonth, currentYear).income, color: users[1].chartColor },
    { name: `${users[0].label} Expenses`, value: getSummary(movements[0], currency, currentMonth, currentYear).expenses, color: users[0].chartColor },
    { name: `${users[1].label} Expenses`, value: getSummary(movements[1], currency, currentMonth, currentYear).expenses, color: users[1].chartColor },
    { name: `${users[0].label} Savings`, value: getSummary(movements[0], currency, currentMonth, currentYear).savings, color: users[0].chartColor },
    { name: `${users[1].label} Savings`, value: getSummary(movements[1], currency, currentMonth, currentYear).savings, color: users[1].chartColor },
    { name: `${users[0].label} Debts`, value: getSummary(movements[0], currency, currentMonth, currentYear).debts, color: users[0].chartColor },
    { name: `${users[1].label} Debts`, value: getSummary(movements[1], currency, currentMonth, currentYear).debts, color: users[1].chartColor }
  ].filter(item => item.value !== 0);

  // --- Movements by Month ---
  function getMovementsByMonth(movs) {
    const byMonth = {};
    movs.forEach(m => {
      const key = `${getYear(m.date)}-${String(getMonthIndex(m.date)).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(m);
    });
    return byMonth;
  }
  const userMovementsByMonth = getMovementsByMonth(movements[activeUser]);
  const bothMovementsByMonth = {};
  [0,1].forEach(idx => {
    const byMonth = getMovementsByMonth(movements[idx]);
    Object.entries(byMonth).forEach(([k, v]) => {
      if (!bothMovementsByMonth[k]) bothMovementsByMonth[k] = [[],[]];
      bothMovementsByMonth[k][idx] = v;
    });
  });

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
                  onClick={handleAddMovement}
                  mb={3}
                  size="md"
                  fontWeight="bold"
                  fontSize="md"
                  borderRadius="lg"
                  boxShadow="md"
                  py={4}
                  _hover={{ bg: "primary.400" }}
                >
                  Add
                </Button>
                <Button colorScheme="primary" size="md" mb={4} leftIcon={<FaTable />} onClick={() => setMonthSummaryOpen(true)} fontWeight="bold" boxShadow="md">
                  Month summary
                </Button>
                {/* Movements List by Month */}
                <Box mt={4} bg="white" borderRadius="md" p={3} boxShadow="sm">
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold" fontSize="lg">Movements</Text>
                    <IconButton icon={<FaFileExport />} size="sm" onClick={handleExportExcel} aria-label="export" />
                  </Flex>
                  {Object.keys(userMovementsByMonth).length === 0 && <Text color="gray.400">No movements yet.</Text>}
                  {Object.entries(userMovementsByMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([key, movs], idx) => {
                    const [year, month] = key.split("-");
                    const isOpen = showMonthMovements[key];
                    return (
                      <Box key={key} mb={2} bg="primary.100" borderRadius="md" p={2}>
                        <Flex align="center" justify="space-between" cursor="pointer" onClick={() => setShowMonthMovements(s => ({...s, [key]: !s[key]}))}>
                          <HStack>
                            <FaRegCalendarAlt color={theme.colors.primary[500]} />
                            <Text fontWeight="bold">{MONTHS[Number(month)]} {year}</Text>
                          </HStack>
                          <IconButton icon={isOpen ? <FaChevronUp /> : <FaChevronDown />} size="xs" variant="ghost" aria-label="toggle month" />
                        </Flex>
                        {isOpen && (
                          <Box overflowX="auto">
                            <Table size="sm" mt={2} variant="simple" minWidth={isMobile ? "600px" : undefined}>
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
                                {movs.map((m, i) => (
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
                                      <IconButton icon={<FaTrash />} size="xs" onClick={() => handleDeleteMovement(movements[activeUser].indexOf(m))} aria-label="delete movement" />
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                  {/* Pie Chart */}
                  <Box mt={6} h="180px">
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
      <Modal isOpen={movementModal} onClose={() => setMovementModal(false)} size="md" isCentered>
        <ModalOverlay />
        <ModalContent bg="white" borderRadius="2xl" boxShadow="2xl">
          <ModalHeader textAlign="center" color="primary.700" fontWeight="bold" fontSize="2xl" pb={0}>
            Add Movement
          </ModalHeader>
          <ModalBody>
            <Tabs variant="soft-rounded" colorScheme="primary" align="center" mb={4}>
              <TabList>
                <Tab onClick={() => setMovementType("income")}>Income</Tab>
                <Tab onClick={() => setMovementType("expenses")}>Expense</Tab>
                <Tab onClick={() => setMovementType("savings")}>Savings</Tab>
                <Tab onClick={() => setMovementType("debts")}>Debt</Tab>
              </TabList>
            </Tabs>
            <HStack mb={3}>
              <Input
                placeholder={`Amount`}
                type="number"
                value={movementAmount}
                onChange={e => setMovementAmount(e.target.value.replace(/[^\d]/g, ''))}
                maxLength={undefined}
                fontSize="lg"
                fontWeight="bold"
              />
              <Select value={movementCurrency} onChange={e => setMovementCurrency(e.target.value)} width="90px">
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </Select>
            </HStack>
            {(movementType === "expenses" || movementType === "debts") && (
              <Select mb={3} placeholder="Category" value={movementCategory} onChange={e => setMovementCategory(e.target.value)}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            )}
            {(movementType === "income" || movementType === "savings") && (
              <Select mb={3} placeholder="Source" value={movementSource} onChange={e => setMovementSource(e.target.value)}>
                {INCOME_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
              </Select>
            )}
            {movementType === "savings" && (
              <Select
                mb={3}
                placeholder="Select Goal (optional)"
                value={movementCategory}
                onChange={e => setMovementCategory(e.target.value)}
              >
                {goals.map((g, i) => (
                  <option key={g.name} value={`Saving for ${g.name}`}>{g.name}</option>
                ))}
                <option value="">Other/General Savings</option>
              </Select>
            )}
            {(movementType === "savings" || movementType === "debts") && (
              <Box mt={2}>
                <input
                  type="checkbox"
                  id="autoMovement"
                  checked={movementAuto}
                  onChange={e => setMovementAuto(e.target.checked)}
                />
                <label htmlFor="autoMovement" style={{ marginLeft: '0.5em' }}>Automatically create counter movement</label>
              </Box>
            )}
          </ModalBody>
          <ModalFooter bg="primary.50" borderBottomRadius="2xl">
            <Button colorScheme="primary" mr={3} onClick={handleMovementSubmit} size="md" fontWeight="bold">
              Add
            </Button>
            <Button onClick={() => setMovementModal(false)} size="md">Cancel</Button>
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