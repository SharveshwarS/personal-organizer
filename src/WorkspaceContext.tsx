import { createContext, useContext } from "react";
import { type State, money, moneyScale, toMinorUnits } from "../shared/domain";
export const WorkspaceContext = createContext<State | null>(null);
export function useWorkspace() {
  const state = useContext(WorkspaceContext);
  if (!state) throw new Error("Workspace is not loaded.");
  return state;
}
export function useMoney() {
  const { settings } = useWorkspace();
  const currency = settings.currency;
  return { currency, scale: moneyScale(currency), money: (amount: number) => money(amount, currency), parseAmount: (value: string) => toMinorUnits(value, currency) };
}
