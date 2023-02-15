export const rowFields = Symbol('fields');

export function query(connection) {
  async function* query(strings, ...args) {
    const tokens = [];
    const params = [];
    for (const [ index, string ] of strings.entries()) {
      tokens.push(string);
      if (index < args.length) {
        tokens.push('??');
        params.push(args[index]);
      }
    }
    const sql = tokens.join('');
    const queue = new RowQueue({
      size: 5,
      pause: () => connection.pause(),
      resume: () => connection.resume(),
    });

    connection.query(sql, params)
      .on('error', err => queue.throw(err))
      .on('fields', fields => queue.describe(fields))
      .on('result', row => queue.push(row))
      .on('end', _ => queue.close());

    for (;;) {
      const row = await queue.pull();
      if (!row) {
        break;
      }
      row[rowFields] = queue.fields;
      yield row;
    }
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
  query.one = one;
  query.value = query.id = value;
  query.values = query.ids = values;
  return query;
}

class RowQueue {
  constructor({ size, pause, resume }) {
    this.size = size;
    this.pause = pause;
    this.resume = resume;
    this.items = [];
    this.fields = null;    
    this.promise = null;
    this.resolve = null;
    this.reject = null;
    this.closed = false;
    this.paused = false;
  }

  describe(fields) {
    this.fields = fields;
  }
  
  async pull() {
    if (this.items.length === 0) {
      if (!this.closed) {
        if (!this.promise) {
          this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
          });
        }
        if (this.paused) {
          this.resume();
        }
        await promise;
      }
    }
    return this.items.shift();
  }

  push(item) {
    const count = this.items.push(item);
    if (count >= this.size && !this.paused) {
      this.pause();
      this.paused = true;
    }
    this.signal();
  }

  close() {
    this.closed = true;
    this.signal();
  }

  throw(err) {
    if (this.reject) {
      this.reject(err);
    } else if (!this.promise) {
      this.promise = Promise.reject(err);
    }
  }

  signal() {
    if (this.resolve) {
      this.resolve();
      this.promise = null;
      this.resolve = null;
      this.reject = null;
    }
  }
}