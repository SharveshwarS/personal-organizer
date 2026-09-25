import {
  initialState,
  validateState,
  hasFinancialData,
  type Snapshot,
  type State,
} from "../shared/domain";
import { APP_VERSION } from "./version";
import { rewardChanges } from "../shared/features";
export interface OrganizerAPI {
  desktop: boolean;
  load(): Promise<Snapshot>;
  save(state: State, revision: number): Promise<Snapshot>;
  exportBackup(): Promise<boolean>;
  importBackup(): Promise<Snapshot | null>;
  undoRestore(): Promise<Snapshot>;
  testNotification(): Promise<boolean>;
  openAuthor(): Promise<void>;
  openDataFolder(): Promise<void>;
  info(): Promise<{
    dataPath: string;
    version: string;
    packaged: boolean;
    timezone: string;
    latestBackup: string;
    backupCount: number;
    canUndoRestore: boolean;
  }>;
  onNavigate(listener: (id: string, kind?: string) => void): () => void;
  onChange(listener: (snapshot: Snapshot) => void): () => void;
}
declare global {
  interface Window {
    organizer?: OrganizerAPI;
  }
}
const key = "personal-organizer-preview-v1";
function load(): Snapshot {
  const raw = localStorage.getItem(key);
  if (!raw) return { state: initialState(), revision: 0 };
  const parsed = JSON.parse(raw);
  return { state: validateState(parsed.state), revision: parsed.revision };
}
function save(state: State, revision: number): Snapshot {
  const current = load();
  if (current.revision !== revision)
    throw new Error("Preview changed in another tab. Reload before saving.");
  if (
    current.state.settings.currency !== state.settings.currency &&
    hasFinancialData(current.state)
  )
    throw new Error("Currency cannot change while financial amounts exist.");
  const next = {
    state: validateState(rewardChanges(current.state, state)),
    revision: revision + 1,
  };
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
export const api: OrganizerAPI = window.organizer || {
  desktop: false,
  load: async () => load(),
  save: async (s, r) => save(s, r),
  exportBackup: async () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { format: "personal-organizer", version: 2, state: load().state },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Organizer-preview-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },
  importBackup: () =>
    new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.oncancel = () => resolve(null);
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          if (file.size > 20000000) throw new Error("Backup exceeds 20 MB.");
          const parsed = JSON.parse(await file.text());
          if (
            parsed.format !== "personal-organizer" ||
            ![1, 2].includes(parsed.version)
          )
            throw new Error("Unsupported backup.");
          const state = validateState(parsed.state);
          if (
            !confirm(
              "Replace this browser preview with the backup? You can undo this in Settings.",
            )
          )
            return resolve(null);
          const current = load();
          localStorage.setItem(`${key}-undo`, JSON.stringify(current.state));
          const restored = { state, revision: current.revision + 1 };
          localStorage.setItem(key, JSON.stringify(restored));
          resolve(restored);
        } catch (e) {
          reject(e);
        }
      };
      input.click();
    }),
  undoRestore: async () => {
    const raw = localStorage.getItem(`${key}-undo`);
    if (!raw) throw new Error("No restore to undo.");
    const current = load();
    const result = {
      state: validateState(JSON.parse(raw)),
      revision: current.revision + 1,
    };
    localStorage.setItem(key, JSON.stringify(result));
    localStorage.setItem(`${key}-undo`, JSON.stringify(current.state));
    return result;
  },
  testNotification: async () => {
    throw new Error("Open the Windows app to test native reminders.");
  },
  openAuthor: async () => {
    window.open(
      "https://github.com/SharveshwarS",
      "_blank",
      "noopener,noreferrer",
    );
  },
  openDataFolder: async () => {
    throw new Error("Open the desktop app to view its data folder.");
  },
  info: async () => ({
    dataPath: "Browser preview storage (separate from desktop)",
    version: APP_VERSION,
    packaged: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    latestBackup: "",
    backupCount: 0,
    canUndoRestore: !!localStorage.getItem(`${key}-undo`),
  }),
  onNavigate: () => () => {},
  onChange: () => () => {},
};
