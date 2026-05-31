const { body, validationResult } = require('express-validator');
const { healthProfileRules } = require('./src/validations/user.validation.js');
const express = require('express');
const app = express();
app.use(express.json());
app.post('/test', healthProfileRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  res.send('ok');
});

const server = app.listen(0, async () => {
  const port = server.address().port;
  const payload = {
    goal: null,
    dietType: null
  };
  const fetch = require('node-fetch');
  const response = await fetch(`http://localhost:${port}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.text();
  console.log(data);
  server.close();
});
