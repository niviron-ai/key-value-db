# @dieugene/key-value-db

[![npm version](https://badge.fury.io/js/@dieugene%2Fkey-value-db.svg)](https://badge.fury.io/js/@dieugene%2Fkey-value-db)
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
YDB_ADDRESS=grpc://your-ydb-endpoint:2135/path/to/database
```

## API

### `init(domain, options)`

Инициализирует экземпляр базы данных ключ-значение.

**Параметры:**
- `domain` (string) - Префикс домена для всех ключей (по умолчанию: пустая строка)
- `options` (Object) - Опции конфигурации
  - `table_name` (string) - Имя таблицы в БД (по умолчанию: 'key_object_db')
  - `database` (string) - Адрес YDB (по умолчанию: process.env.YDB_ADDRESS)

**Возвращает:** Объект с методами `get`, `set`, `del`, `copy`

### Методы работы с данными

#### `get(id, by_default)`

Получает значение по ключу.

```javascript
const data = await db.get('user:123', { name: 'Unknown' });
```

**Параметры:**
- `id` (string) - Идентификатор ключа
- `by_default` (any) - Значение по умолчанию, если ключ не найден

**Возвращает:** Promise с сохраненными данными или значением по умолчанию

#### `get.where_id_starts_with(startsWith)`

Получает все записи с ключами, начинающимися с заданной строки.

```javascript
const users = await db.get.where_id_starts_with('user:');
```

#### `get.where_id_ends_with(endsWith)`

Получает все записи домена с ключами, заканчивающимися заданной строкой.

```javascript
const admins = await db.get.where_id_ends_with(':admin');
```

#### `get.all()`

Получает все записи текущего домена.

```javascript
const allData = await db.get.all();
```

#### `set(id, data)`

Сохраняет данные по ключу.

```javascript
await db.set('user:123', { name: 'John', role: 'admin' });
```

**Параметры:**
- `id` (string) - Идентификатор ключа
- `data` (any) - Данные для сохранения

**Возвращает:** Promise с сохраненными данными

#### `set.bulk(data_list)`

Массовое сохранение данных.

```javascript
await db.set.bulk([
  { id: 'user:1', data: { name: 'John' } },
  { id: 'user:2', data: { name: 'Jane' } }
]);
```

#### `set.sub_domain(subDomain)`

Создает новый экземпляр БД с вложенным доменом.

```javascript
const profileDb = db.set.sub_domain('profiles');
// Ключи будут иметь префикс: domain::profiles::
```

#### `copy(from_id, to_id, value_if_null)`

Копирует данные от одного ключа к другому.

```javascript
await db.copy('user:123', 'user:123:backup', {});
```

#### `del(id)`

Удаляет запись по ключу.

```javascript
await db.del('user:123');
```

## Примеры использования

### Работа с пользователями

```javascript
const { init } = require('./main.js');

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
const dataDb = init('analytics');

// Массовое сохранение метрик
const metrics = [
  { id: 'daily:2024-01-01', data: { views: 1000, clicks: 50 } },
  { id: 'daily:2024-01-02', data: { views: 1200, clicks: 60 } },
  { id: 'daily:2024-01-03', data: { views: 950, clicks: 45 } }
];

await dataDb.set.bulk(metrics);

// Получение всех дневных метрик
const dailyMetrics = await dataDb.get.where_id_starts_with('daily:');
```

## Переменные окружения

- `YDB_ADDRESS` - Адрес подключения к YDB

## Зависимости

- `@dieugene/ydb-serverless` - Клиент для работы с YDB
- `@dieugene/utils` - Утилитарные функции

## Автор

Eugene Ditkovsky

## Лицензия

ISC
 
