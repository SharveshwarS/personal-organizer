import { useState } from "react";
import { validateState } from "../shared/domain";
import { Button, Field, Modal, type Save } from "./components";

export function ListEditor({ save, onClose, onCreated }: { save: Save; onClose: () => void; onCreated: (name: string) => void }) {
  const [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <Modal title="New list" onClose={() => !busy && onClose()}>
    <form onSubmit={async e => {
      e.preventDefault(); setError("");
      const label = name.trim();
      if (!label) { setError("Give your list a name."); return; }
      setBusy(true);
      const success = await save(s => {
        if (s.taskLists.some(item => item.toLowerCase() === label.toLowerCase())) throw new Error("A list with this name already exists.");
        return validateState({ ...s, taskLists: [...s.taskLists, label] });
      });
      setBusy(false);
      if (success) onCreated(label); else setError("The list could not be added. Use a unique name and try again.");
    }}><fieldset disabled={busy}>
      <Field label="List name"><input autoFocus required maxLength={100} placeholder="Projects, Shopping, Study…" value={name} onChange={e => setName(e.target.value)} /></Field>
      <p className="help">Group related tasks here. You can rename or remove lists in Settings.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><Button onClick={onClose}>Cancel</Button><Button kind="primary" type="submit">{busy ? "Adding…" : "Create list"}</Button></div>
    </fieldset></form>
  </Modal>;
}
