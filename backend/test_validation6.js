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
    "name": "Anubhav",
    "age": 25,
    "gender": "Male",
    "height": 180,
    "weight": 70,
    "targetWeight": null,
    "targetCalories": 2500,
    "targetBurn": 600,
    "targetCarbs": 300,
    "targetProtein": 150,
    "targetFat": 80,
    "bmi": 21.6,
    "bmiCategory": "Normal Weight",
    "location": "Earth",
    "city": "Metropolis",
    "ethnicityCuisine": "Indian",
    "activityLevel": "very_active",
    "goal": "lose_weight",
    "dietType": "Vegetarian",
    "diabetes": "no",
    "hypertension": "no",
    "cholesterol": "no",
    "cancerSurvivor": "no",
    "hrt": "no",
    "otherConditions": null,
    "allergies": ["peanuts", "lactose"],
    "foodDislikes": ["olives"],
    "aiNotes": []
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
