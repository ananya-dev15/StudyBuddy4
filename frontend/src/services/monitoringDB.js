// IndexedDB Storage Service for StudyBuddy On-Device Focus Monitoring
// Database: StudyBuddy_Monitoring
// Store: monitoring_logs
// Privacy Guarantee: Zero monitoring logs are sent to MongoDB or any server.

const DB_NAME = "StudyBuddy_Monitoring";
const DB_VERSION = 1;
const STORE_NAME = "monitoring_logs";

let dbInstance = null;

export const initMonitoringDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this browser"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("date_status", ["date", "status"], { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("Failed to open IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Append a single monitoring record
 * @param {Object} record - { date, timestamp, status, gaze_status, faces_detected, phone_detected, focus_score }
 */
export const saveMonitoringRecord = async (record) => {
  try {
    const db = await initMonitoringDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry = {
        date: record.date || new Date().toISOString().slice(0, 10),
        timestamp: record.timestamp || formatTimestamp(new Date()),
        status: record.status || "Focused (screen)",
        gaze_status: record.gaze_status || "screen",
        faces_detected: Number(record.faces_detected ?? 1),
        phone_detected: Number(record.phone_detected ? 1 : 0),
        focus_score: Math.max(0, Math.min(100, Math.round(record.focus_score ?? 100))),
      };

      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error saving monitoring record:", err);
  }
};

/**
 * Fetch all logs for a specific date (YYYY-MM-DD)
 */
export const getLogsByDate = async (dateStr) => {
  try {
    const db = await initMonitoringDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("date");
      const req = index.getAll(IDBKeyRange.only(dateStr));

      req.onsuccess = () => {
        const sorted = (req.result || []).sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        resolve(sorted);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error(`Error loading logs for date ${dateStr}:`, err);
    return [];
  }
};

/**
 * Get distinct dates for which monitoring logs exist
 */
export const getAvailableDates = async () => {
  try {
    const db = await initMonitoringDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("date");
      const datesSet = new Set();

      const cursorReq = index.openKeyCursor(null, "nextunique");
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          datesSet.add(cursor.key);
          cursor.continue();
        } else {
          const sorted = Array.from(datesSet).sort();
          resolve(sorted);
        }
      };
      cursorReq.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error retrieving available dates:", err);
    return [];
  }
};

/**
 * Fetch all logs from the database
 */
export const getAllMonitoringLogs = async () => {
  try {
    const db = await initMonitoringDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const sorted = (req.result || []).sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        resolve(sorted);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error loading all logs:", err);
    return [];
  }
};

/**
 * Clear all monitoring records locally
 */
export const clearMonitoringLogs = async () => {
  try {
    const db = await initMonitoringDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Error clearing logs:", err);
    return false;
  }
};

/**
 * Export selected date's logs as CSV file (recreating YYYY-MM-DD.csv)
 */
export const exportLogsToCSV = async (dateStr) => {
  const logs = await getLogsByDate(dateStr);
  if (!logs || logs.length === 0) {
    alert(`No logs available for date: ${dateStr}`);
    return;
  }

  const headers = ["timestamp", "status", "gaze_status", "faces_detected", "phone_detected", "focus_score"];
  const rows = logs.map((log) => [
    log.timestamp,
    `"${log.status.replace(/"/g, '""')}"`,
    log.gaze_status,
    log.faces_detected,
    log.phone_detected,
    log.focus_score,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
};
