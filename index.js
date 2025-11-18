const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// === API CONFIG ===
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxYTMxMGI5LTc3NWEtNDYyOS1hYmFjLWE5YmY1ZDNmMTk2MCIsIm5vbmNlIjoiYzQ0N2NhYjMtZDJkMS00NDU1LTk3OGYtMDk0MTUyODU4Mzg1Iiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzYzNTA0MDIyfQ.eO_qZmgBEPcsBpz5tKfR08NG5v6bdiWNOlcVaRU5VFU";
const userId = "81a310b9-775a-4629-abac-a9bf5d3f1960";

// === LOCAL CACHE ===
let monthlyCache = [];
let monthlyTop14Cache = [];

let weeklyCache = [];
let weeklyTop14Cache = [];

// === Mask username ===
const formatUsername = (username) => {
  const firstTwo = username.slice(0, 2);
  const lastTwo = username.slice(-2);
  return `${firstTwo}***${lastTwo}`;
};

// ============================================================
// 📅 MONTHLY RANGE (RESET 00:00 UTC on the 1st)
// ============================================================
function getMonthlyDateRange() {
  const now = new Date();

  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0
  ));

  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
    0, 0, 0
  ));

  return { 
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// ============================================================
// 📅 WEEKLY RANGE (RESET SUNDAY 23:59:59 UTC)
// ============================================================
function getWeeklyDateRange() {
  const now = new Date();
  const day = now.getUTCDay(); // Sunday=0

  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + diffToMonday,
    0, 0, 0
  ));

  const daysUntilSunday = (7 - day) % 7;

  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilSunday,
    23, 59, 59
  ));

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// ============================================================
// 🔄 Fetch Leaderboard Helper
// ============================================================
async function fetchLeaderboard(startDate, endDate) {
  const response = await axios.get(apiUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: {
      userId,
      startDate,
      endDate,
    },
  });

  const data = response.data;

  return data
    .filter((p) => p.username !== "azisai205")
    .sort((a, b) => b.weightedWagered - a.weightedWagered)
    .map((p, i) => ({
      rank: i + 1,
      username: p.username,
      weightedWager: Math.round(p.weightedWagered),
    }));
}

// ============================================================
// 🔄 Update Monthly Leaderboard
// ============================================================
async function updateMonthlyLeaderboard() {
  try {
    const { startDate, endDate } = getMonthlyDateRange();
    const sorted = await fetchLeaderboard(startDate, endDate);

    monthlyCache = sorted;

    monthlyTop14Cache = sorted.map((p) => ({
      username: formatUsername(p.username),
      weightedWager: p.weightedWager,
    }));

    if (monthlyTop14Cache.length >= 2) {
      [monthlyTop14Cache[0], monthlyTop14Cache[1]] = 
      [monthlyTop14Cache[1], monthlyTop14Cache[0]];
    }

    console.log("✅ Monthly leaderboard updated");
  } catch (err) {
    console.error("❌ Monthly fetch error:", err.message);
  }
}

// ============================================================
// 🔄 Update Weekly Leaderboard
// ============================================================
async function updateWeeklyLeaderboard() {
  try {
    const { startDate, endDate } = getWeeklyDateRange();
    const sorted = await fetchLeaderboard(startDate, endDate);

    weeklyCache = sorted;

    weeklyTop14Cache = sorted.map((p) => ({
      username: formatUsername(p.username),
      weightedWager: p.weightedWager,
    }));

    if (weeklyTop14Cache.length >= 2) {
      [weeklyTop14Cache[0], weeklyTop14Cache[1]] = 
      [weeklyTop14Cache[1], weeklyTop14Cache[0]];
    }

    console.log("✅ Weekly leaderboard updated");
  } catch (err) {
    console.error("❌ Weekly fetch error:", err.message);
  }
}

// ============================================================
// ROUTES
// ============================================================

// Monthly data
app.get("/leaderboard/monthly", (req, res) => {
  res.json(monthlyCache);
});

app.get("/leaderboard/monthly/top14", (req, res) => {
  res.json(monthlyTop14Cache.slice(0, 10));
});

// Weekly data
app.get("/leaderboard/weekly", (req, res) => {
  res.json(weeklyCache);
});

app.get("/leaderboard/weekly/top14", (req, res) => {
  res.json(weeklyTop14Cache.slice(0, 10));
});

app.get("/", (req, res) => {
  res.send("Roobet Leaderboard API with Monthly + Weekly Leaderboards");
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ============================================================
// CRON-TYPE REFRESH
// ============================================================

updateMonthlyLeaderboard();
updateWeeklyLeaderboard();

// Update every 5 minutes
setInterval(updateMonthlyLeaderboard, 5 * 60 * 1000);
setInterval(updateWeeklyLeaderboard, 5 * 60 * 1000);

// Render keep-alive
setInterval(() => {
  axios.get("https://azisailbdata.onrender.com/")
    .then(() => console.log("Self-ping OK"))
    .catch(() => {});
}, 4 * 60 * 1000);
