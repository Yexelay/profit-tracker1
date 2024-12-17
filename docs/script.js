window.onload = function() {
  const token = localStorage.getItem('authToken'); // Получаем токен из localStorage

  if (token) {
    // Если токен есть, сразу показываем основной контент
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    // Загрузка данных профитов и покупок
    loadProfits();
    loadPurchases();
  } else {
    // Если токен нет, показываем формы авторизации и регистрации
    document.getElementById('registerSection').style.display = 'block';
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
  }
}

function logout() {
  // Удаляем токен из localStorage
  localStorage.removeItem('authToken');
  
  // Показываем формы авторизации и регистрации
  document.getElementById('registerSection').style.display = 'block';
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
}

// Логика регистрации
async function registerUser() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  if (!email || !password) {
    document.getElementById('registerMessage').textContent = 'Пожалуйста, заполните все поля!';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      document.getElementById('registerMessage').textContent = 'Регистрация прошла успешно!';
    } else {
      const data = await response.json();
      document.getElementById('registerMessage').textContent = data.error || 'Ошибка регистрации.';
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
    document.getElementById('registerMessage').textContent = 'Ошибка при подключении к серверу.';
  }
}

let token = null;

function loginUser(event) {
  event.preventDefault(); // Предотвращаем перезагрузку страницы при отправке формы

  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    document.getElementById('authMessage').textContent = 'Пожалуйста, заполните все поля!';
    return;
  }

  console.log('Отправка данных на сервер:', { email, password });

  fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        // Сохраняем токен в localStorage
        localStorage.setItem('authToken', data.token);

        // Скрываем формы регистрации и авторизации
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        // Загрузка данных профитов и покупок
        loadProfits();
        loadPurchases();
      } else {
        document.getElementById('authMessage').textContent = 'Ошибка авторизации. Попробуйте еще раз.';
      }
    })
    .catch(error => {
      console.error('Ошибка:', error);
      document.getElementById('authMessage').textContent = 'Ошибка при подключении к серверу.';
    });
}




let purchases = [];

// Загрузка покупок с сервера
async function loadPurchases() {
  try {
    const response = await fetch('http://localhost:3000/purchases');
    purchases = await response.json();
    updatePurchaseList();
  } catch (error) {
    console.error('Ошибка загрузки покупок:', error);
  }
}

// Сохранение покупки на сервер
async function addPurchase() {
  const title = document.getElementById('titleInput').value;
  const price = parseFloat(document.getElementById('priceInput').value);
  const date = document.getElementById('purchaseDateInput').value;

  if (!title || isNaN(price) || !date) {
    alert('Пожалуйста, заполните все поля корректно.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price, date }),
    });

    if (response.ok) {
      loadPurchases(); // Обновляем список покупок

      titleInput.value = '';
      priceInput.value = '';
    }
  } catch (error) {
    console.error('Ошибка добавления покупки:', error);
  }
}

// Удаление покупки
async function deletePurchase(id) {
  try {
    const response = await fetch(`http://localhost:3000/purchases/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      loadPurchases(); // Обновляем список покупок
    }
  } catch (error) {
    console.error('Ошибка удаления покупки:', error);
  }
}

// Загрузка профитов с сервера
async function loadProfits() {
  try {
    const response = await fetch('http://localhost:3000/profits');
    const profits = await response.json();

    document.getElementById('totalProfit').textContent = profits.totalProfit.toFixed(2);
    document.getElementById('monthlyProfit').textContent = profits.monthlyProfit.toFixed(2);
    document.getElementById('dailyProfit').textContent = profits.dailyProfit.toFixed(2);
  } catch (error) {
    console.error('Ошибка загрузки профитов:', error);
  }
}

// Функция для продажи товара
async function sellItem() {
  const title = document.getElementById('saleTitleInput').value;
  const price = parseFloat(document.getElementById('salePriceInput').value);
  const date = document.getElementById('saleDateInput').value;

  if (!title || isNaN(price) || !date) {
    alert('Пожалуйста, заполните все поля корректно.');
    return;
  }

  const purchase = purchases.find(item => item.title === title);

  if (!purchase) {
    alert('Товар не найден в списке покупок');
    return;
  }

  const profit = price - purchase.price;
  const saleDate = new Date(date);

  try {
    // Загрузка текущих профитов с сервера
    const response = await fetch('http://localhost:3000/profits');
    const currentProfits = await response.json();

    const today = new Date();
    const isSameDay = today.toISOString().split('T')[0] === saleDate.toISOString().split('T')[0];
    const isSameMonth = today.getFullYear() === saleDate.getFullYear() && today.getMonth() === saleDate.getMonth();

    // Обновляем профиты для указанной даты
    const updatedProfits = {
      totalProfit: currentProfits.totalProfit + profit,
      monthlyProfit: isSameMonth ? currentProfits.monthlyProfit + profit : currentProfits.monthlyProfit,
      dailyProfit: isSameDay ? currentProfits.dailyProfit + profit : currentProfits.dailyProfit,
    };

    // Сохраняем обновлённые профиты на сервере
    await fetch('http://localhost:3000/profits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProfits),
    });

    // Удаляем покупку после продажи
    await deletePurchase(purchase.id);

    // Обновляем профиты на клиенте
    loadProfits();

    saleTitleInput.value = '';
    salePriceInput.value = '';
  } catch (error) {
    console.error('Ошибка обновления профита:', error);
  }
}

// Обновление списка покупок на экране
function updatePurchaseList() {
  const purchaseList = document.getElementById('purchaseList');
  purchaseList.innerHTML = '';

  purchases.forEach(purchase => {
    const listItem = document.createElement('li');
    listItem.textContent = `${purchase.title} - ${purchase.price.toFixed(2)}$ (Дата: ${purchase.date})`;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Удалить';
    deleteButton.classList.add('delete-button');
    deleteButton.onclick = () => {
      const confirmation = confirm("Вы уверены, что хотите удалить эту покупку?");
      if (confirmation) {
        deletePurchase(purchase.id);  // Если пользователь подтвердил, удаляем покупку
      }
    };

    listItem.appendChild(deleteButton);
    purchaseList.appendChild(listItem);
  });
}

function confirmResetProfits() {
  const confirmation = confirm("Вы уверены, что хотите обнулить профиты?");
  if (confirmation) {
    resetProfits();  // Если пользователь подтвердил, вызываем функцию сброса профита
  }
}

// Функция для обнуления профитов
async function resetProfits() {
  const resetData = {
    totalProfit: 0,
    monthlyProfit: 0,
    dailyProfit: 0,
  };

  try {
    await fetch('http://localhost:3000/profits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetData),
    });

    // Обновляем информацию о профитах на странице
    loadProfits();
  } catch (error) {
    console.error('Ошибка сброса профитов:', error);
  }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  loadPurchases();
  loadProfits();
  setCurrentDate();
});

// Установка текущей даты в инпуты
function setCurrentDate() {
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  document.getElementById('purchaseDateInput').value = formattedDate;
  document.getElementById('saleDateInput').value = formattedDate;
}
