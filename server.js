// Импорты модулей
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // Для хеширования паролей
const jwt = require('jsonwebtoken'); // Для создания токенов
const auth = require('basic-auth');
require('dotenv').config();


const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_secret_key';

app.use((req, res, next) => {
  const user = auth(req);
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || user.name !== username || user.pass !== password) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
    // return res.status(401).json({ error: 'Доступ запрещен' });
  }
  next();
});


app.use(express.static('public'));  // Assuming your images are in a 'public' folder
app.use(bodyParser.json());

// Подключаемся к SQLite базе данных
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных SQLite.');
  }
});

// Создаем таблицы при запуске сервера
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS profits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    totalProfit REAL DEFAULT 0,
    monthlyProfit REAL DEFAULT 0,
    dailyProfit REAL DEFAULT 0
  )`);

  // Инициализируем запись для профитов, если ее нет
  db.get(`SELECT * FROM profits LIMIT 1`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO profits (totalProfit, monthlyProfit, dailyProfit) VALUES (0, 0, 0)`);
    }
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Маршруты

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все поля' });
  }

  // Хешируем пароль
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка хеширования пароля' });
    }

    // Сохраняем пользователя в базе данных
    db.run(
      `INSERT INTO users (email, password) VALUES (?, ?)`,
      [email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка сохранения пользователя' });
        }
        res.status(200).json({ message: 'Пользователь зарегистрирован' });
      }
    );
  });
});

// Авторизация пользователя
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все поля' });
  }

  // Находим пользователя по email
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при поиске пользователя' });
    }

    if (!row) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    // Сравниваем пароли
    bcrypt.compare(password, row.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка сравнения паролей' });
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Неверный пароль' });
      }

      // Генерация JWT токена
      const token = jwt.sign({ email: row.email, id: row.id }, SECRET_KEY, { expiresIn: '1h' });

      res.json({ token });
    });
  });
});

// Получение всех покупок
app.get('/purchases', (req, res) => {
  db.all(`SELECT * FROM purchases`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});


// Добавление покупки
app.post('/purchases', (req, res) => {
  const { title, price, date } = req.body;
  db.run(
    `INSERT INTO purchases (title, price, date) VALUES (?, ?, ?)`,
    [title, price, date],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID });
      }
    }
  );
});

// Удаление покупки
app.delete('/purchases/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM purchases WHERE id = ?`, [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

// Получение профитов
app.get('/profits', (req, res) => {
  db.get(`SELECT * FROM profits LIMIT 1`, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(row);
    }
  });
});

// Обновление профитов
app.post('/profits', (req, res) => {
  const { totalProfit, monthlyProfit, dailyProfit } = req.body;
  console.log("Обновление профитов: ", totalProfit, monthlyProfit, dailyProfit); // Добавляем отладочную информацию

  db.get(`SELECT * FROM profits LIMIT 1`, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Обновляем данные в базе
    db.run(
      `UPDATE profits SET totalProfit = ?, monthlyProfit = ?, dailyProfit = ?`,
      [totalProfit, monthlyProfit, dailyProfit],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          console.log("Профиты обновлены успешно"); // Добавляем отладочную информацию
          res.status(200).json({
            totalProfit: totalProfit,
            monthlyProfit: monthlyProfit,
            dailyProfit: dailyProfit
          });
        }
      }
    );
  });
});



// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});