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
let leaderboardCache = [];
let leaderboardTop14Cache = [];

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

  // Start: 1st of current month 00:00 UTC
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0
  ));

  // End: 1st of next month 00:00 UTC
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

  // Start: last Monday 00:00 UTC
  const day = now.getUTCDay(); // Sunday=0
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const startDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + diffToMonday,
    0, 0, 0
  ));

  // End: upcoming Sunday 23:59:59
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
// 🔄 FETCH LEADERBOARD BASED ON MONTHLY RANGE
// ============================================================
async function fetchLeaderboardData() {
  try {
    const { startDate, endDate } = getMonthlyDateRange();

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        userId,
        startDate,
        endDate,
      },
    });

    const data = response.data;

    const sorted = data
      .filter((player) => player.username !== "azisai205")
      .sort((a, b) => b.weightedWagered - a.weightedWagered);

    leaderboardCache = sorted.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      weightedWager: Math.round(player.weightedWagered),
    }));

    leaderboardTop14Cache = sorted.map((player) => ({
      username: formatUsername(player.username),
      weightedWager: Math.round(player.weightedWagered),
    }));

    // swap first and second
    if (leaderboardTop14Cache.length >= 2) {
      const tmp = leaderboardTop14Cache[0];
      leaderboardTop14Cache[0] = leaderboardTop14Cache[1];
      leaderboardTop14Cache[1] = tmp;
    }

    console.log(`[${new Date().toISOString()}] Leaderboard updated: ${sorted.length} entries`);
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error.message);
  }
}

// ============================================================
// ROUTES
// ============================================================
app.get("/", (req, res) => {
  res.send("🎰 Roobet Leaderboard API LIVE!");
});

// Full leaderboard
app.get("/leaderboard", (req, res) => {
  res.json(leaderboardCache);
});

// Top14 masked (actually returns 5 like your code)
app.get("/leaderboard/top14", (req, res) => {
  res.json(leaderboardTop14Cache.slice(0, 5));
});

// NEW: Monthly range
app.get("/range/monthly", (req, res) => {
  res.json(getMonthlyDateRange());
});

// NEW: Weekly range
app.get("/range/weekly", (req, res) => {
  res.json(getWeeklyDateRange());
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ============================================================
// SCHEDULED TASKS
// ============================================================

// Fetch leaderboard initially
fetchLeaderboardData();

// Refresh leaderboard every 5 mins
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Keep Render alive
setInterval(() => {
  axios
    .get("https://azisailbdata.onrender.com/leaderboard/top14")
    .then(() => console.log("🔁 Self-ping OK"))
    .catch((err) => console.error("❌ Self-ping failed:", err.message));
}, 4 * 60 * 1000);
