const ydb_serverless = require("@dieugene/ydb-serverless");
const I = require("@dieugene/utils");

/**
 * Инициализирует экземпляр key-value базы данных с поддержкой доменов
 * @param {string} domain - Префикс домена для всех ключей (по умолчанию пустая строка)
 * @param {Object} options - Опции конфигурации
 * @param {string} options.table_name - Имя таблицы в базе данных (по умолчанию 'key_object_db')
 * @param {string} options.database - Адрес базы данных YDB (по умолчанию process.env.YDB_ADDRESS)
 * @returns {{
 *   get: function(string, *): Promise<*> & {
 *     list: function(string[]): Promise<Array<{id: string, data: object}>>,
 *     where_id_starts_with: function(string): Promise<Array<{id: string, data: *}>>,
 *     where_id_ends_with: function(string): Promise<Array<{id: string, data: *}>>,
 *     all: function(): Promise<Array<{id: string, data: *}>>
 *   },
 *   set: function(string, *): Promise<*> & {
 *     bulk: function(Array<{id: string, data: *}>): Promise<void>,
 *     sub_domain: function(string): Object
 *   },
 *   del: function(string): Promise<void>,
 *   copy: function(string, string, *): Promise<void>
 * }} Объект с методами для работы с БД
 */
function init(domain = '', {table_name = 'key_object_db', database = process.env.YDB_ADDRESS} = {}) {

    const ydb = ydb_serverless.init(database);

    /**
     * Создает SQL декларацию для переменной $id
     * @param {string} id - Идентификатор ключа
     * @returns {string} SQL строка с декларацией переменной $id
     */
    function declareId(id = '') {
        // id = id.startsWith(domain) ? id : domain + "::" + id;
        return `DECLARE $id AS Utf8;
$id = '${define_id(id)}';`
    }

    /**
     * Формирует полный идентификатор с доменным префиксом
     * @param {string} id - Исходный идентификатор
     * @returns {string} Идентификатор с доменным префиксом
     */
    function define_id(id = '') {
        return id.startsWith(domain) ? id : domain + "::" + id;
    }

    /**
     * Получает значение по ключу из базы данных
     * @param {string} id - Идентификатор ключа
     * @param {*} by_default - Значение по умолчанию, если ключ не найден
     * @returns {Promise<*>} Сохраненные данные или значение по умолчанию
     */
    async function get(id = '', by_default) {
        let query = declareId(id) + `
SELECT data FROM ${table_name} WHERE id = $id;`,
            result = await ydb.execute(query);
        return I.arr.isEmpty(result) ? by_default : JSON.parse(result[0].data);
    }
    /**
     * Получает список значений по массиву идентификаторов
     * @param {string[]} id_list - Массив идентификаторов ключей
     * @returns {Promise<Array<{id: string, data: object}>>} Массив объектов, содержащих id и данные для каждого ключа
     */
    async function get_list(id_list = []) {
        if (I.arr.isEmpty(id_list)) return [];
        let result = await ydb.get_by_id_list(table_name, id_list, 'id');
        result.forEach(r => r.data = JSON.parse(r.data));
        return result;
    }

    /**
     * Получает все записи, у которых идентификатор начинается с заданной строки
     * @param {string} startsWith - Префикс для поиска (по умолчанию используется домен)
     * @returns {Promise<Array<{id: string, data: *}>>} Массив найденных записей
     */
    async function get_by_starts_with(startsWith = '') {
        if (!I.notEmpty(startsWith)) startsWith = domain;
        else if (!startsWith.startsWith(domain)) startsWith = domain + "::" + startsWith;
        let query = `
SELECT * FROM ${table_name} 
WHERE StartsWith(id, '${startsWith}');`,
            result = await ydb.execute(query);
        return result.map(rec => ({id: rec.id, data: JSON.parse(rec.data)}));
    }

    /**
     * Получает все записи домена, у которых идентификатор заканчивается заданной строкой
     * @param {string} endsWith - Суффикс для поиска
     * @returns {Promise<Array<{id: string, data: *}>>} Массив найденных записей
     */
    async function get_by_ends_with(endsWith = '') {
        let query = `
SELECT * FROM ${table_name}  
WHERE StartsWith(id, '${domain}') AND EndsWith(id, '${endsWith}');`,
            result = await ydb.execute(query);
        return result.map(rec => ({id: rec.id, data: JSON.parse(rec.data)}));
    }
    get.list = get_list;
    get.where_id_starts_with = get_by_starts_with;
    get.where_id_ends_with = get_by_ends_with;
    get.all = async () => get_by_starts_with();

    /**
     * Сохраняет данные по ключу в базе данных
     * @param {string} id - Идентификатор ключа
     * @param {*} data - Данные для сохранения (будут сериализованы в JSON)
     * @returns {Promise<*>} Сохраненные данные
     */
    async function set(id = '', data = {}) {
        let query = `
DECLARE $data AS Json;
` + declareId(id) + `
UPSERT INTO ${table_name} (id, data) VALUES ($id, $data);`;
        await ydb.apply(query, {"$data": data});
        return data
    }

    /**
     * Копирует данные от одного ключа к другому
     * @param {string} from_id - Исходный идентификатор
     * @param {string} to_id - Целевой идентификатор
     * @param {*} value_if_null - Значение по умолчанию, если исходный ключ не найден
     * @returns {Promise<void>}
     */
    async function copy(from_id = '', to_id = '', value_if_null = {}) {
        from_id = define_id(from_id);
        to_id = define_id(to_id);
        let query = `
DECLARE $data AS Json;
DECLARE $value_if_null AS Json;
$data = SELECT data FROM ${table_name} WHERE id = "${from_id}";
$data = IF($data ISNULL, $value_if_null, $data);
UPSERT INTO ${table_name} (id, data) VALUES ("${to_id}", $data);
`;
        await ydb.apply(query, { "$value_if_null": value_if_null });
    }

    /**
     * Массовое сохранение данных в базе данных
     * @param {Array<{id: string, data: *}>} data_list - Массив объектов с идентификаторами и данными
     * @returns {Promise<void>}
     */
    async function bulk_set(data_list = []){
        data_list.forEach(d => d.id = define_id(d.id));

        await ydb.upsert_struct(table_name, data_list);
    }

    set.bulk = bulk_set;
    set.sub_domain = subDomain => init(domain + '::' + subDomain, {table_name, database});

    /**
     * Удаляет запись по ключу из базы данных
     * @param {string} id - Идентификатор ключа для удаления
     * @returns {Promise<void>}
     */
    async function del(id = '') {
        let query = declareId(id) + `
DELETE FROM ${table_name} WHERE id=$id;`;
        await ydb.apply(query);
    }

    return { get, set, del, copy }
}

module.exports = { init };