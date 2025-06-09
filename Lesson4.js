const express = require('express');
const app = express();

const port = 3000;

app.use(express.json());

let users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

// GET all users
app.get('/users', (req, res) => {
  res.json(users);
});
 
// GET user by ID
app.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  if (user) {
    res.json(user);
  } else {
    res.status(404).send('User not found');
  }
});

// POST create a new user
app.post('/users', (req, res) => {
  const newUser = { id: users.length + 1, name: req.body.name };
  users.push(newUser);
  res.status(201).json(users);
});

// PUT update (replace) a user
app.put('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex] = { id: userId, name: req.body.name };
    res.json(users);
  } else {
    res.status(404).send('User not found');
  }
});

// PATCH partially update a user
app.patch('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  if (user) {
    if (req.body.name) {
      user.name = req.body.name;
    }
    res.json(user);
  } else {
    res.status(404).send('User not found');
  }
});

// DELETE a user by ID
app.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
    res.status(204).send(users);
  } else {
    res.status(404).send('User not found');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
