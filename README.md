# @dieugene/key-value-db

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Библиотека для работы с базой данных ключ-значение на основе YDB (Yandex Database). Предоставляет простой интерфейс для сохранения, получения и управления JSON-данными с поддержкой доменов и гибкими возможностями поиска.

## Особенности

- 🔑 **Работа с ключ-значение парами**: Простое сохранение и получение JSON-объектов
- 🏷️ **Поддержка доменов**: Логическое разделение данных по доменам с автоматическим префиксированием
- 🔍 **Гибкий поиск**: Поиск по префиксу, суффиксу или получение всех записей домена
- ⚡ **Массовые операции**: Эффективное сохранение множества записей одновременно
- 📋 **Копирование данных**: Дублирование записей между ключами
- 🗄️ **YDB интеграция**: Использует Yandex Database для надежного хранения

## Установка

```bash
npm install @dieugene/key-value-db
```

## Требования

- Node.js >= 16.0.0
- Yandex Database (YDB) serverless instance

## Быстрый старт

```javascript
const { init } = require('@dieugene/key-value-db');

// Инициализация без домена
const db = init();

// Инициализация с доменом
const userDb = init('users', {
  table_name: 'my_table',
  database: process.env.YDB_ADDRESS
});

// Сохранение данных
await db.set('user:123', { name: 'John', age: 30 });

// Получение данных
const user = await db.get('user:123', null);
console.log(user); // { name: 'John', age: 30 }

// Удаление данных
await db.del('user:123');
```

## Настройка окружения

Убедитесь, что у вас установлена переменная окружения для подключения к YDB:

```bash
export YDB_ADDRESS="/ru-central..."
```

Или создайте файл `.env`:

```env
YDB_ADDRESS=/ru-central...
```

## API

### `init(domain, options)`

Инициализирует экземпляр базы данных ключ-значение с поддержкой доменов.

**Параметры:**
- `domain` (string, по умолчанию: `''`) - Префикс домена для всех ключей. Используется для логического разделения данных
- `options` (Object, по умолчанию: `{}`) - Опции конфигурации:
  - `table_name` (string, по умолчанию: `'key_object_db'`) - Имя таблицы в базе данных YDB
  - `database` (string, по умолчанию: `process.env.YDB_ADDRESS`) - Адрес базы данных YDB

**Возвращает:** `Object` - Объект с методами `get`, `set`, `del`, `copy` для работы с БД

**Пример:**
```javascript
const db = init('users', {
  table_name: 'my_custom_table',
  database: '/ru-central1/b1abc2def3ghi4jkl5/etn6op7qrs8tu9vwx0'
});
```

### Методы работы с данными

#### `get(id, by_default)`

Получает значение по ключу из базы данных.

**Параметры:**
- `id` (string, по умолчанию: `''`) - Идентификатор ключа
- `by_default` (any) - Значение по умолчанию, если ключ не найден

**Возвращает:** `Promise<any>` - Сохраненные данные или значение по умолчанию

**Пример:**
```javascript
const user = await db.get('user:123', { name: 'Unknown' });
```

#### `get.list(id_list)`

Получает список записей по массиву идентификаторов.

**Параметры:**
- `id_list` (Array<string>, по умолчанию: `[]`) - Массив идентификаторов

**Возвращает:** `Promise<Array<{id: string, data: object}>>` - Массив объектов, содержащих id и данные для каждого ключа

> **Важно:** Функция возвращает объекты с полями `id` и `data`, а не только данные. Это позволяет получить как сами данные, так и их полные идентификаторы в БД.

**Пример:**
```javascript
const users = await db.get.list(['user:1', 'user:2', 'user:3']);
// Возвращает: [
//   { id: 'users::user:1', data: { name: 'John' } },
//   { id: 'users::user:2', data: { name: 'Jane' } },
//   { id: 'users::user:3', data: { name: 'Bob' } }
// ]

// Извлечение только данных
const userData = users.map(user => user.data);
```

#### `get.where_id_starts_with(startsWith)`

Получает все записи, у которых идентификатор начинается с заданной строки.

**Параметры:**
- `startsWith` (string, по умолчанию: `''`) - Префикс для поиска. Если не указан, используется домен

**Возвращает:** `Promise<Array<{id: string, data: any}>>` - Массив найденных записей

**Пример:**
```javascript
const users = await db.get.where_id_starts_with('user:');
// Возвращает: [{ id: 'users::user:123', data: { name: 'John' } }, ...]
```

#### `get.where_id_ends_with(endsWith)`

Получает все записи домена, у которых идентификатор заканчивается заданной строкой.

**Параметры:**
- `endsWith` (string, по умолчанию: `''`) - Суффикс для поиска

**Возвращает:** `Promise<Array<{id: string, data: any}>>` - Массив найденных записей

**Пример:**
```javascript
const admins = await db.get.where_id_ends_with(':admin');
// Возвращает записи с ключами, заканчивающимися на ':admin'
```

#### `get.all()`

Получает все записи текущего домена.

**Возвращает:** `Promise<Array<{id: string, data: any}>>` - Массив всех записей домена

**Пример:**
```javascript
const allData = await db.get.all();
```

#### `set(id, data)`

Сохраняет данные по ключу в базе данных.

**Параметры:**
- `id` (string, по умолчанию: `''`) - Идентификатор ключа
- `data` (any, по умолчанию: `{}`) - Данные для сохранения (будут сериализованы в JSON)

**Возвращает:** `Promise<any>` - Сохраненные данные

**Пример:**
```javascript
await db.set('user:123', { name: 'John', role: 'admin' });
```

#### `set.bulk(data_list)`

Массовое сохранение данных в базе данных.

**Параметры:**
- `data_list` (Array<{id: string, data: any}>, по умолчанию: `[]`) - Массив объектов с идентификаторами и данными

**Возвращает:** `Promise<void>`

**Пример:**
```javascript
await db.set.bulk([
  { id: 'user:1', data: { name: 'John' } },
  { id: 'user:2', data: { name: 'Jane' } },
  { id: 'user:3', data: { name: 'Bob' } }
]);
```

#### `set.sub_domain(subDomain)`

Создает новый экземпляр БД с вложенным доменом.

**Параметры:**
- `subDomain` (string) - Имя поддомена

**Возвращает:** `Object` - Новый экземпляр БД с доменом `${currentDomain}::${subDomain}`

**Пример:**
```javascript
const profileDb = db.set.sub_domain('profiles');
// Ключи будут иметь префикс: users::profiles::
await profileDb.set('avatar', { url: '/images/avatar.jpg' });
```

#### `copy(from_id, to_id, value_if_null)`

Копирует данные от одного ключа к другому.

**Параметры:**
- `from_id` (string, по умолчанию: `''`) - Исходный идентификатор
- `to_id` (string, по умолчанию: `''`) - Целевой идентификатор
- `value_if_null` (any, по умолчанию: `{}`) - Значение по умолчанию, если исходный ключ не найден

**Возвращает:** `Promise<void>`

**Пример:**
```javascript
await db.copy('user:123', 'user:123:backup', { name: 'Default' });
```

#### `del(id)`

Удаляет запись по ключу из базы данных.

**Параметры:**
- `id` (string, по умолчанию: `''`) - Идентификатор ключа для удаления

**Возвращает:** `Promise<void>`

**Пример:**
```javascript
await db.del('user:123');
```

## Примеры использования

### Работа с пользователями

```javascript
const { init } = require('@dieugene/key-value-db');

const userDb = init('users');

// Создание пользователя
await userDb.set('123', {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  created: new Date().toISOString()
});

// Получение пользователя
const user = await userDb.get('123');

// Получение всех пользователей
const allUsers = await userDb.get.all();

// Поиск администраторов
const admins = await userDb.get.where_id_ends_with(':admin');

// Получение нескольких пользователей одновременно
const specificUsers = await userDb.get.list(['123', '456', '789']);
// Возвращает массив объектов: [{ id: 'users::123', data: {...} }, ...]

// Работа с результатами get.list()
specificUsers.forEach(user => {
  console.log(`ID: ${user.id}, Name: ${user.data.name}`);
});
```

### Работа с настройками приложения

```javascript
const configDb = init('config');

// Сохранение настроек
await configDb.set('app', {
  theme: 'dark',
  language: 'ru',
  notifications: true
});

// Сохранение настроек пользователя
await configDb.set('user:123', {
  theme: 'light',
  autoSave: true
});

// Получение всех настроек
const allConfigs = await configDb.get.all();
```

### Массовые операции

```javascript
const productDb = init('products');

// Массовое сохранение товаров
await productDb.set.bulk([
  { id: 'product:1', data: { name: 'Laptop', price: 999 } },
  { id: 'product:2', data: { name: 'Mouse', price: 29 } },
  { id: 'product:3', data: { name: 'Keyboard', price: 79 } }
]);

// Поиск товаров по категории
const electronics = await productDb.get.where_id_starts_with('product:');
```

### Работа с поддоменами

```javascript
const mainDb = init('store');

// Создание поддоменов
const productsDb = mainDb.set.sub_domain('products');
const ordersDb = mainDb.set.sub_domain('orders');

// Данные будут сохранены с префиксами:
// store::products:: и store::orders::
await productsDb.set('laptop', { name: 'Gaming Laptop', price: 1299 });
await ordersDb.set('order:1', { productId: 'laptop', quantity: 1 });
```

## Структура доменов

Домены позволяют логически разделять данные. Ключи автоматически получают префикс домена:

```javascript
// Без домена
const db = init();
await db.set('user:123', data); // Ключ: user:123

// С доменом
const userDb = init('users');
await userDb.set('123', data); // Ключ: users::123

// С поддоменом
const profileDb = userDb.set.sub_domain('profiles');
await profileDb.set('avatar', data); // Ключ: users::profiles::avatar
```

## Лицензия

ISC © Eugene Ditkovsky
 
