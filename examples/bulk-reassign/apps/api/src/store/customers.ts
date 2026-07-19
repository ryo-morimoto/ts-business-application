import type { Customer } from "@bulk-reassign/contracts";
import { SEED_CUSTOMERS } from "../fixtures/seed";

let customers: Customer[] = structuredClone(SEED_CUSTOMERS);

export function getCustomers(): Customer[] {
  return customers;
}

export function getCustomerMap(): Map<string, Customer> {
  return new Map(customers.map((c) => [c.id, c]));
}

export function replaceCustomers(next: Map<string, Customer>): void {
  customers = [...next.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function resetCustomers(): void {
  customers = structuredClone(SEED_CUSTOMERS);
}
