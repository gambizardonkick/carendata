const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxYTMxMGI5LTc3NWEtNDYyOS1hYmFjLWE5YmY1ZDNmMTk2MCIsIm5vbmNlIjoiYzQ0N2NhYjMtZDJkMS00NDU1LTk3OGYtMDk0MTUyODU4Mzg1Iiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzYzNTA0MDIyfQ.eO_qZmgBEPcsBpz5tKfR08NG5v6bdiWNOlcVaRU5VFU";
const userId = "81a310b9-775a-4629-abac-a9bf5d3f1960";

// CACHE
let monthlyCache = [];
let weeklyCache = [];

// Mask usernames
const mask = (u) => `${u.slice(0, 2)}***${u.slice(-2)}`;

// MONTHLY RANGE
function monthlyRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

// WEEKLY RANGE
function weeklyRange() {
  const now = new Date();
  const day = now.getUTCDay(); 
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday, 0, 0, 0
  ));

  const daysToSunday = (7 - day) % 7;

  const end = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToSunday, 23, 59, 59
  ));

  return { start: start.toISOString(), end: end.toISOString() };
}

// FETCH HELPER
async function fetchRange(start, end) {
  const res = await axios.get(apiUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { userId, startDate: start, endDate: end }
  });

  return res.data
    .filter((x) => x.username !== "azisai205")
    .sort((a, b) => b.weightedWagered - a.weightedWagered)
    .map((p) => ({
      username: mask(p.username),
      wagered: Math.round(p.wagered),
      weightedWager: Math.round(p.weightedWagered)
    }))
    .slice(0, 10);  // 🔥 LIMIT TO TOP 10
}

// MONTHLY UPDATE
async function updateMonthly() {
  try {
    const { start, end } = monthlyRange();
    let arr = await fetchRange(start, end);

    // swap 1st & 2nd
    if (arr.length >= 2) [arr[0], arr[1]] = [arr[1], arr[0]];

    monthlyCache = arr;
    console.log("Monthly updated:", arr.length);
  } catch (e) {
    console.log("Monthly error:", e.message);
  }
}

// WEEKLY UPDATE
async function updateWeekly() {
  try {
    const { start, end } = weeklyRange();
    let arr = await fetchRange(start, end);

    // swap 1st & 2nd
    if (arr.length >= 2) [arr[0], arr[1]] = [arr[1], arr[0]];

    weeklyCache = arr;
    console.log("Weekly updated:", arr.length);
  } catch (e) {
    console.log("Weekly error:", e.message);
  }
}

// ROUTES
app.get("/", (req, res) => res.send("Leaderboard API Live"));

app.get("/leaderboard/monthly", (req, res) => res.json(monthlyCache));
app.get("/leaderboard/weekly", (req, res) => res.json(weeklyCache));

// START SERVER
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));

updateMonthly();
updateWeekly();

setInterval(updateMonthly, 5 * 60 * 1000);
setInterval(updateWeekly, 5 * 60 * 1000);

// Render keep-alive
setInterval(() => {
  axios.get("https://azisailbdata.onrender.com").catch(() => {});
}, 4 * 60 * 1000);
