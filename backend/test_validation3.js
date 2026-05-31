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
    age: "30",
    gender: "Male",
    height: "175",
    weight: "75",
    targetWeight: null,
    targetCalories: "2000",
    targetBurn: "500",
    bmi: "24.5",
    bmiCategory: "Normal",
    location: null,
    city: "NY",
    ethnicityCuisine: null,
    activityLevel: "moderate",
    goal: "lose_weight",
    dietType: "Balanced",
    diabetes: "no",
    hypertension: "no",
    cholesterol: null,
    cancerSurvivor: "no",
    hrt: "no",
    otherConditions: null,
    allergies: ["peanuts", "lactose"],
    foodDislikes: [],
    aiNotes: []
  };
  const fetch = require('node-fetch');
  const response = await fetch(`http://localhost:${port}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  server.close();
});
