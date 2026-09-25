import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../build/electron/database.js";
import { initialState } from "../build/shared/domain.js";
test("SQLite changes survive database close and reopen", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "organizer-test-"));
  const file = path.join(directory, "test.db");
  let db = new Store(file);
  try {
    const snapshot = db.read();
    snapshot.state.settings.name = "Persistence test";
    db.save(snapshot.state, snapshot.revision);
    db.close();
    db = new Store(file);
    assert.equal(db.read().state.settings.name, "Persistence test");
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("Stale writes fail without overwriting newer state", () => {
  const db = new Store(":memory:");
  try {
    const original = db.read();
    db.save(
      {
        ...original.state,
        settings: { ...original.state.settings, name: "Latest" },
      },
      original.revision,
    );
    assert.throws(() => db.save(original.state, original.revision), /changed/);
    assert.equal(db.read().state.settings.name, "Latest");
  } finally {
    db.close();
  }
});
test("Invalid restore leaves live data and revision unchanged", () => {
  const db = new Store(":memory:");
  try {
    const before = db.read();
    assert.throws(() => db.restore({ schema: 99 }));
    assert.deepEqual(db.read(), before);
  } finally {
    db.close();
  }
});
test("Restore and undo roundtrip all data including reminder ledger reset", () => {
  const db = new Store(":memory:");
  try {
    const before = db.read();
    const replacement = initialState();
    replacement.settings.name = "Imported";
    replacement.notes = [
      {
        id: "note",
        title: "Restored note",
        body: "A note",
        folder: "Personal",
        pinned: true,
        updatedAt: new Date().toISOString(),
      },
    ];
    db.mark("reminder", "attempted");
    db.restore(replacement);
    assert.equal(db.read().state.notes[0].body, "A note");
    assert.equal(db.attempted("reminder"), false);
    db.undoRestore();
    assert.deepEqual(db.read().state, before.state);
  } finally {
    db.close();
  }
});
test("Reminder delivery ledger persists across repository reads", () => {
  const db = new Store(":memory:");
  try {
    db.mark("key", "attempted");
    assert.equal(db.attempted("key"), true);
    assert.equal(db.attempted("different"), false);
  } finally {
    db.close();
  }
});
