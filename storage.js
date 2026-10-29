const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "../../data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const COUNTER_FILE = path.join(DATA_DIR, "counter.json");

function ensureFile(file, initialValue) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initialValue, null, 2));
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Nem olvasható JSON fájl: ${file}`, error);
    throw new Error(`Sérült adatfájl: ${path.basename(file)}. Állítsd le a botot, és állítsd vissza a biztonsági mentést.`);
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, file);
}

function getTickets() {
  return readJson(TICKETS_FILE, []);
}
function saveTickets(tickets) {
  writeJson(TICKETS_FILE, tickets);
}
function nextTicketNumber() {
  const counter = readJson(COUNTER_FILE, { next: 1 });
  const current = counter.next;
  counter.next = current + 1;
  writeJson(COUNTER_FILE, counter);
  return current;
}

module.exports = { getTickets, saveTickets, nextTicketNumber };
