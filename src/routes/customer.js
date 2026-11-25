const express = require('express');
const codes = require('../services/codes');
const rewards = require('../services/rewards');
const { getDashboard } = require('../services/customer');
const { AppError } = require('../errors');

module.exports = function customerRoutes(db) {
  const router = express.Router();

  router.get('/dashboard', (req, res) => {
    res.json(getDashboard(db, req.user.id));
  });

  router.post('/codes/redeem', (req, res) => {
    const result = codes.redeemCode(db, req.user.id, (req.body || {}).code);
    res.json({ message: `Success! You earned ${result.points} points.`, ...result });
  });

  router.get('/rewards', (req, res) => {
    res.json({ rewards: rewards.listRewards(db, { activeOnly: true }) });
  });

  router.post('/rewards/:id/redeem', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError('NOT_FOUND', 'This reward is not available.', 404);
    const result = rewards.redeemReward(db, req.user.id, id);
    res.json({ message: `Done! You redeemed "${result.reward}".`, ...result });
  });

  return router;
};
