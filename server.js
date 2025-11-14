// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Record = require('./models/Record');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- CONFIGURATION ---
const carSpots = 18;
const motorSpots = 60;
const rate12hrs = 60;
const rate24hrs = 120;
const TOTAL_SPOTS = carSpots + motorSpots;

// --- DATABASE CONNECTION ---
// Gumagamit ng MONGODB_URI mula sa .env file (o Render Environment Variables)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));


// --- API ENDPOINTS (ROUTES) ---

// 1. GET /api/records
app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({ entryDate: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch records: " + error.message });
    }
});

// 2. POST /api/records (Check-In)
app.post('/api/records', async (req, res) => {
    const { plate, contact, spot } = req.body;
    try {
        // Validation: Check if spot is occupied OR if the same plate is already parked
        const occupiedSpot = await Record.findOne({ spot, status: "Parked" });
        if (occupiedSpot) { return res.status(409).json({ message: `🚫 Spot ${spot} is already occupied.` }); }
        const parkedPlate = await Record.findOne({ plate, status: "Parked" });
        if (parkedPlate) { return res.status(409).json({ message: `🚫 Vehicle ${plate} is already parked.` }); }

        const newRecord = new Record({
            plate: plate.toUpperCase(),
            contact, spot,
            entry: new Date().toLocaleTimeString(),
            entryDate: Date.now(),
            status: "Parked"
        });
        const savedRecord = await newRecord.save();
        res.status(201).json(savedRecord);
    } catch (error) {
        res.status(400).json({ message: "Error adding record: " + error.message });
    }
});

// 3. PUT /api/records/:id (Check-Out)
app.put('/api/records/:id', async (req, res) => {
    try {
        const rec = await Record.findById(req.params.id);
        if (!rec || rec.status !== "Parked") { return res.status(404).json({ message: "Record not found or already out." }); }
        
        const exitTime = Date.now();
        const entryDate = rec.entryDate.getTime();
        const hours = Math.ceil((exitTime - entryDate) / (1000 * 60 * 60));
        const earnings = hours <= 12 ? rate12hrs : rate24hrs;

        rec.exit = new Date(exitTime).toLocaleTimeString();
        rec.hours = `${hours} hr(s)`;
        rec.earnings = parseFloat(earnings.toFixed(2));
        rec.status = "Out";

        const updatedRecord = await rec.save();
        res.json(updatedRecord);
    } catch (error) {
        res.status(500).json({ message: "Error updating record: " + error.message });
    }
});

// 4. GET /api/dashboard/stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const records = await Record.find();
        const inCount = records.filter(r => r.status === "Parked").length;
        const totalEarnings = records.reduce((sum, r) => sum + r.earnings, 0);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todaysEarnings = records
            .filter(r => r.status === "Out" && new Date(r.entryDate) >= startOfDay)
            .reduce((s, r) => s + (r.earnings || 0), 0);
        
        res.json({
            total: records.length,
            inCount,
            outCount: records.filter(r => r.status === "Out").length,
            totalEarnings: totalEarnings.toFixed(2),
            available: TOTAL_SPOTS - inCount,
            totalToday: todaysEarnings.toFixed(2), 
            spotsConfig: { carSpots, motorSpots, total: TOTAL_SPOTS }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard stats: " + error.message });
    }
});

// 5. DELETE /api/records (Clear All)
app.delete('/api/records', async (req, res) => {
    try {
        await Record.deleteMany({});
        res.json({ message: "All records successfully cleared." });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear records: " + error.message });
    }
});

// Serve Frontend Files
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});