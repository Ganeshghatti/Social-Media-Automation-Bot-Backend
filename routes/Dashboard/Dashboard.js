const express = require('express');
const router = express.Router();
const { GetDashboardStats } = require('../../controller/Dashboard/Dashboard');

router.get('/dashboard', GetDashboardStats);

module.exports = router;