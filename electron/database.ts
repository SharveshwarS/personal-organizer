import { DatabaseSync } from "node:sqlite";
import {
  initialState,
  validateState,
  hasFinancialData,
  type State,
  type Snapshot,
} from "../shared/domain.js";

const collections = ["tasks", "habits", "notes", "transactions"] as const;
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS reminder_delivery (key TEXT PRIMARY KEY, attempted_at TEXT NOT NULL, status TEXT NOT NULL);",
    );
    for (const table of collections)
      this.db.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL)`,
      );
    if (!this.meta("revision")) this.save(initialState(), 0);
    else if (JSON.parse(this.meta("base")!).schema === 1) {
      // Keep the exact legacy payload before writing the normalized schema.
      const legacy = JSON.parse(this.meta("base")!);
      for (const table of collections) legacy[table] = this.db.prepare(`SELECT payload FROM ${table} ORDER BY rowid`).all().map(row => JSON.parse(row.payload as string));
      if (!this.meta("preMigrationV1")) this.put("preMigrationV1", JSON.stringify(legacy));
      const migrated = this.read();
      this.save(migrated.state, migrated.revision);
    }
  }
  meta(key: string): string | undefined {
    return (
      this.db.prepare("SELECT value FROM metadata WHERE key=?").get(key) as
        { value: string } | undefined
    )?.value;
  }
  put(key: string, value: string) {
    this.db
      .prepare("INSERT OR REPLACE INTO metadata (key,value) VALUES (?,?)")
      .run(key, value);
  }
  read(): Snapshot {
    const state = JSON.parse(this.meta("base")!) as State;
    for (const table of collections)
      (state[table] as unknown[]) = this.db
        .prepare(`SELECT payload FROM ${table} ORDER BY rowid`)
        .all()
        .map((row) => JSON.parse(row.payload as string));
    return {
      state: validateState(state),
      revision: Number(this.meta("revision")),
    };
  }
  save(input: unknown, expected: number): Snapshot {
    const state = validateState(input);
    if (this.meta("revision")) {
      const previous = this.read().state;
      if (state.settings.currency !== previous.settings.currency && hasFinancialData(previous))
        throw new Error("Currency cannot change while financial records or planned amounts exist. No conversion was performed.");
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const revision = Number(this.meta("revision") || 0);
      if (expected !== revision)
        throw new Error(
          "Data changed in another window. Reload before saving.",
        );
      for (const table of collections) {
        this.db.exec(`DELETE FROM ${table}`);
        const insert = this.db.prepare(
          `INSERT INTO ${table} (id,payload) VALUES (?,?)`,
        );
        for (const item of state[table])
          insert.run(item.id, JSON.stringify(item));
      }
      this.put(
        "base",
        JSON.stringify({
          ...state,
          tasks: [],
          habits: [],
          notes: [],
          transactions: [],
        }),
      );
      this.put("revision", String(revision + 1));
      this.db.exec("COMMIT");
      return { state, revision: revision + 1 };
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  restore(input: unknown): Snapshot {
    const state = validateState(input),
      before = this.read();
    // The undo snapshot and replacement are committed together by the same outer transaction.
    this.db.exec("SAVEPOINT restore_workspace");
    try {
      this.put("restoreUndo", JSON.stringify(before.state));
      for (const table of collections) {
        this.db.exec(`DELETE FROM ${table}`);
        const insert = this.db.prepare(
          `INSERT INTO ${table} (id,payload) VALUES (?,?)`,
        );
        for (const item of state[table])
          insert.run(item.id, JSON.stringify(item));
      }
      this.put(
        "base",
        JSON.stringify({
          ...state,
          tasks: [],
          habits: [],
          notes: [],
          transactions: [],
        }),
      );
      this.put("revision", String(before.revision + 1));
      this.db.exec("DELETE FROM reminder_delivery; RELEASE restore_workspace");
      return this.read();
    } catch (e) {
      this.db.exec("ROLLBACK TO restore_workspace; RELEASE restore_workspace");
      throw e;
    }
  }
  undoRestore(): Snapshot {
    const previous = this.meta("restoreUndo");
    if (!previous) throw new Error("No restore to undo.");
    return this.restore(JSON.parse(previous));
  }
  attempted(key: string) {
    return !!this.db
      .prepare("SELECT key FROM reminder_delivery WHERE key=?")
      .get(key);
  }
  mark(key: string, status: string) {
    this.db
      .prepare("INSERT OR REPLACE INTO reminder_delivery VALUES (?,?,?)")
      .run(key, new Date().toISOString(), status);
  }
  close() {
    this.db.close();
  }
}
