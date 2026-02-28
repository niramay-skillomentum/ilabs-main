const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.send("AI Labs Server is Running 🚀");
});

// Sample API Route
app.get("/api/status", (req, res) => {
    res.json({
        status: "AI Labs Backend Active",
        version: "1.0.0"
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});