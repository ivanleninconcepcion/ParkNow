/* ===== CONFIG ===== */
const admin = { username: "admin", password: "1234" }; // <--- BINAGO
const carSpots = 18;
const motorSpots = 50; // <--- BINAGO
const rate12hrs = 50; // <--- BINAGO
const rate24hrs = 100; // <--- BINAGO

/* ===== AUTH ===== */
function login(e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  if (user === admin.username && pass === admin.password) {
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("adminName", user);
    window.location.href = "dashboard.html";
  } else {
    alert("❌ Invalid login! Try again.");
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}

/* ===== ENTRY FORM ===== */
function showEntryForm() {
  const f = document.getElementById("entryForm");
  if (f) f.style.display = "block";
}
function closeEntryForm() {
  const f = document.getElementById("entryForm");
  if (f) f.style.display = "none";
  document.getElementById("plate").value = "";
  document.getElementById("contact").value = "";
  document.getElementById("spotInput").value = "";
  document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
}

/* ===== LOAD RECORDS ===== */
function loadRecords() {
  if (!localStorage.getItem("loggedIn")) { window.location.href = "index.html"; return; }
  const tbody = document.getElementById("recordTable");
  if (!tbody) return;
  const records = JSON.parse(localStorage.getItem("records")) || [];
  tbody.innerHTML = "";

  records.forEach((r, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${r.plate}</td>
        <td>${r.contact}</td>
        <td>${r.spot}</td>
        <td>${r.entry}</td>
        <td>${r.exit || "-"}</td>
        <td>${r.hours || "-"}</td>
        <td>${r.earnings ? "₱" + r.earnings : "-"}</td>
        <td>${r.status}</td>
        <td>${r.status === "Parked" ? `<button class="out-btn" onclick="exitVehicle(${i})"><img src='https://cdn-icons-png.flaticon.com/512/709/709586.png'> Out</button>` : "Done"}</td>
      </tr>`;
  });

  const todayKey = new Date().toLocaleDateString();
  const todays = records.filter(r => {
    if (!r.entryDate) return false;
    const d = new Date(parseInt(r.entryDate));
    return d.toLocaleDateString() === todayKey;
  });
  const totalToday = todays.reduce((s, r) => s + (parseFloat(r.earnings) || 0), 0);
  const te = document.getElementById("totalEarnings");
  if (te) te.textContent = `💰 Total Earnings Today: ₱${totalToday.toFixed(2)}`;

  renderParkingGrid();
}

/* ===== ADD VEHICLE ===== */
function addRecord() {
  const plate = document.getElementById("plate").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const spot = document.getElementById("spotInput").value.trim();

  if (!plate || !contact || !spot) {
    Swal.fire({
      icon: 'error',
      title: 'Missing fields!',
      text: 'Please complete all fields before continuing.',
      confirmButtonText: 'OK'
    });
    return;
  }

  const records = JSON.parse(localStorage.getItem("records")) || [];
  if (records.find(r => r.plate === plate && r.status === "Parked")) {
    return alert("🚫 This vehicle is already parked.");
  }
  if (records.find(r => r.spot === spot && r.status === "Parked")) {
    return alert("🚫 This spot is already occupied.");
  }

  const entryDate = Date.now();
  const entryTime = new Date(entryDate).toLocaleTimeString();

  const newRecord = {
    plate,
    contact,
    spot,
    entry: entryTime,
    entryDate: entryDate.toString(),
    exit: "",
    hours: "",
    earnings: "",
    status: "Parked"
  };

  records.push(newRecord);
  localStorage.setItem("records", JSON.stringify(records));
  saveDailyReport(newRecord);

  Swal.fire({
    icon: "success",
    title: "Vehicle Parked!",
    text: `${plate} successfully parked at ${spot}.`,
    timer: 1800,
    showConfirmButton: false
  });

  closeEntryForm();
  loadRecords();
}

/* ===== EXIT VEHICLE ===== */
function exitVehicle(index) {
  let records = JSON.parse(localStorage.getItem("records")) || [];
  if (!records[index]) return alert("Record not found.");
  const rec = records[index];
  if (rec.status !== "Parked") return alert("This vehicle is already out.");

  const exitTime = Date.now();
  const hours = Math.ceil((exitTime - parseInt(rec.entryDate)) / (1000 * 60 * 60));
  const earnings = hours <= 12 ? rate12hrs : rate24hrs;

  rec.exit = new Date(exitTime).toLocaleTimeString();
  rec.hours = `${hours} hr(s)`;
  rec.earnings = earnings.toFixed(2);
  rec.status = "Out";

  records[index] = rec;
  localStorage.setItem("records", JSON.stringify(records));
  updateDailyReport(rec);

  Swal.fire({
    icon: "info",
    title: "Vehicle Exited!",
    text: `${rec.plate} left. Charge: ₱${earnings.toFixed(2)}`,
    timer: 2000,
    showConfirmButton: false
  });

  loadRecords();
}

/* ===== RENDER PARKING GRID ===== */
function renderParkingGrid() {
  const grid = document.getElementById("parkingGrid");
  if (!grid) return;
  const records = JSON.parse(localStorage.getItem("records")) || [];
  const occupied = records.filter(r => r.status === "Parked").map(r => r.spot);
  grid.innerHTML = "";

  const carSection = document.createElement("div");
  carSection.className = "parking-section";
  carSection.innerHTML = `<h2><img src="download-removebg-preview.png" class="icon-img"> Car Parking</h2><div class="car-grid"></div>`;

  const motorSection = document.createElement("div");
  motorSection.className = "parking-section";
  motorSection.innerHTML = `<h2><img src="images-removebg-preview.png" class="icon-img"> Motorcycle Parking</h2><div class="motor-grid"></div>`;

  const carGrid = carSection.querySelector(".car-grid");
  const motorGrid = motorSection.querySelector(".motor-grid");

  for (let i = 1; i <= carSpots; i++) {
    const spot = "A" + i;
    const div = document.createElement("div");
    div.className = "slot car-slot";
    div.innerHTML = `<img src="download-removebg-preview.png" class="slot-icon"><br>${spot}`;
    if (occupied.includes(spot)) div.classList.add("occupied");
    else div.classList.add("available");

    div.addEventListener("click", () => {
      if (!occupied.includes(spot)) {
        document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
        div.classList.add("selected");
        document.getElementById("spotInput").value = spot;
        showEntryForm();
      }
    });
    carGrid.appendChild(div);
  }

  for (let i = 1; i <= motorSpots; i++) {
    const spot = "M" + i;
    const div = document.createElement("div");
    div.className = "slot motor-slot";
    div.innerHTML = `<img src="images-removebg-preview.png" class="slot-icon"><br>${spot}`;
    if (occupied.includes(spot)) div.classList.add("occupied");
    else div.classList.add("available");

    div.addEventListener("click", () => {
      if (!occupied.includes(spot)) {
        document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
        div.classList.add("selected");
        document.getElementById("spotInput").value = spot;
        showEntryForm();
      }
    });
    motorGrid.appendChild(div);
  }

  grid.appendChild(carSection);
  grid.appendChild(motorSection);
}

/* ===== DAILY REPORT FUNCTIONS ===== */
function saveDailyReport(record) {
  const reports = JSON.parse(localStorage.getItem("dailyReports")) || [];
  const dateKey = new Date(parseInt(record.entryDate)).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  let day = reports.find(d => d.date === dateKey);
  if (!day) { day = { date: dateKey, records: [] }; reports.push(day); }
  day.records.push(Object.assign({}, record));
  localStorage.setItem("dailyReports", JSON.stringify(reports));
}

function updateDailyReport(updatedRecord) {
  const reports = JSON.parse(localStorage.getItem("dailyReports")) || [];
  const entryDay = new Date(parseInt(updatedRecord.entryDate)).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  let day = reports.find(d => d.date === entryDay);
  if (!day) { day = { date: entryDay, records: [] }; reports.push(day); }
  const recIdx = day.records.findIndex(r => r.entryDate === updatedRecord.entryDate && r.plate === updatedRecord.plate);
  if (recIdx !== -1) day.records[recIdx] = Object.assign({}, updatedRecord);
  else day.records.push(Object.assign({}, updatedRecord));
  localStorage.setItem("dailyReports", JSON.stringify(reports));
}

/* ===== LOAD DAILY REPORTS ===== */
function loadReports() {
  if (!localStorage.getItem("loggedIn")) { window.location.href = "index.html"; return; }
  const container = document.getElementById("dailyReportsContainer");
  if (!container) return;
  const reports = JSON.parse(localStorage.getItem("dailyReports")) || [];
  container.innerHTML = "";

  if (reports.length === 0) { container.innerHTML = "<p>No records yet.</p>"; return; }

  reports.sort((a,b)=> new Date(b.date) - new Date(a.date));
  reports.forEach(day => {
    const total = day.records.reduce((s,r)=> s + (parseFloat(r.earnings) || 0), 0);
    let html = `<div class="report-day"><h3>📅 ${day.date} — ${day.records.length} record(s) — 💰 ₱${total.toFixed(2)}</h3>`;
    html += `<table><thead><tr><th>Plate</th><th>Contact</th><th>Spot</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Earnings</th><th>Status</th></tr></thead><tbody>`;
    day.records.forEach(r => {
      html += `<tr>
        <td>${r.plate}</td>
        <td>${r.contact}</td>
        <td>${r.spot}</td>
        <td>${r.entry}</td>
        <td>${r.exit || "-"}</td>
        <td>${r.hours || "-"}</td>
        <td>${r.earnings ? "₱" + r.earnings : "-"}</td>
        <td>${r.status}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML += html;
  });
}

/* ===== CLEAR BUTTONS ===== */
function clearAllRecords() {
  Swal.fire({
    title: "Are you sure?",
    text: "This will permanently delete ALL vehicle records.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, clear all!"
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("records");
      Swal.fire({ 
        icon: "success", 
        title: "All Records Cleared!", 
        timer: 1800, 
        showConfirmButton: false 
      });
      loadRecords();
      updateDashboard();
      renderParkingGrid();
    }
  });
}

function clearAllDailyReports() {
  Swal.fire({
    title: "Are you sure?",
    text: "This will permanently delete ALL daily reports.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, clear all!"
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("dailyReports");
      Swal.fire({ 
        icon: "success", 
        title: "Daily Reports Cleared!", 
        timer: 1800, 
        showConfirmButton: false 
      });
      loadReports();
    }
  });
}

/* ===== DASHBOARD DATA UPDATE ===== */
function loadDashboard() {
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("adminName").textContent = localStorage.getItem("adminName") || "Admin";

  const records = JSON.parse(localStorage.getItem("records")) || [];
  const total = records.length;
  const inCount = records.filter(r => r.status === "Parked").length;
  const outCount = records.filter(r => r.status === "Out").length;
  const totalEarnings = records.reduce((sum, r) => sum + (parseFloat(r.earnings) || 0), 0);
  // <--- BINAGO ANG AVALAILABLE COUNT FORMULA
  const available = (carSpots + motorSpots) - inCount; // Ginamit ang carSpots at motorSpots variables

  document.getElementById("totalVehiclePark").textContent = total;
  document.getElementById("vehicleIn").textContent = inCount;
  document.getElementById("vehicleOut").textContent = outCount;
  document.getElementById("availableParking").textContent = available;
  document.getElementById("totalEarningsDashboard").textContent = `₱${totalEarnings.toFixed(2)}`;

  const now = new Date();
  document.getElementById("datetime").textContent =
    now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" });
}