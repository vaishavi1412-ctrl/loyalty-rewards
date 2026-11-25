const express = require('express');
const admin = require('../services/admin');
const codes = require('../services/codes');
const rewards = require('../services/rewards');
const { AppError } = require('../errors');

function idParam(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError('NOT_FOUND', 'Not found.', 404);
  return id;
}

module.exports = function adminRoutes(db) {
  const router = express.Router();

  router.get('/stats', (req, res) => res.json(admin.getStats(db)));

  // Customers
  router.get('/customers', (req, res) => res.json({ customers: admin.listCustomers(db, { q: req.query.q }) }));
  router.patch('/customers/:id', (req, res) => {
    admin.setCustomerActive(db, idParam(req), Boolean((req.body || {}).isActive));
    res.json({ ok: true });
  });

  // Codes and batches
  router.get('/codes', (req, res) => res.json(admin.listCodes(db, req.query)));
  router.patch('/codes/:id', (req, res) => {
    admin.setCodeStatus(db, idParam(req), (req.body || {}).status);
    res.json({ ok: true });
  });
  router.get('/batches', (req, res) => res.json({ batches: admin.listBatches(db) }));
  router.post('/batches', (req, res) => {
    const result = codes.generateBatch(db, req.body || {});
    res.status(201).json({ message: `Generated ${result.codes.length} codes.`, ...result });
  });
  router.get('/batches/:id/csv', (req, res) => {
    const { filename, csv } = admin.batchCsv(db, idParam(req));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });

  // Monitoring
  router.get('/attempts', (req, res) => res.json(admin.listAttempts(db, req.query)));
  router.get('/transactions', (req, res) => res.json(admin.listAllTransactions(db, req.query)));

  // Rewards
  router.get('/rewards', (req, res) => res.json({ rewards: rewards.listRewards(db) }));
  router.post('/rewards', (req, res) => {
    const id = rewards.createReward(db, req.body || {});
    res.status(201).json({ id, message: 'Reward created.' });
  });
  router.put('/rewards/:id', (req, res) => {
    rewards.updateReward(db, idParam(req), req.body || {});
    res.json({ message: 'Reward updated.' });
  });

  return router;
};
