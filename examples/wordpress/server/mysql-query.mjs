export function query(connection) {
  function query(strings, ...args) {
    const tokens = [];
    for (const [ index, string ] of strings.entries()) {
      tokens.push(string);
      if (index < args.length) {
        tokens.push(connection.escape(args[index]));
      }
    }
    const sql = tokens.join('');
    return connection.query(sql).stream({ highWaterMark: 5 });
  }
  
  async function all(strings, ...args) {
    const rows = [];
    for await (const row of query(strings, ...args)) {
      rows.push(row);
    }
    return rows;
  }

  async function columns(strings, ...args) {
    const columns = [];
    for await (const row of query(strings, ...args)) {
      const values = Object.values(row);
      for (const [ index, value ] of values.entries()) {
        let column = columns[index];
        if (!column) {
          column = columns[index] = [];
        }
        column.push(value);
      }
    }
    return columns;
  }

  async function one(strings, ...args) {
    const [ row ] = await all(strings, ...args);
    return row;
  }

  async function value(strings, ...args) {
    const rows = await all(strings, ...args);
    return rows[0]?.values?.()?.[0];
  }

  async function values(strings, ...args) {
    const rows = await all(strings, ...args);
    const values = [];
    for (const row of rows) {
      values.push(row.values()[0]);
    }
    return values;
  }

  query.all = all;
  query.columns = columns;
  query.one = one;
  query.value = query.id = value;
  query.values = query.ids = values;
  return query;
}
