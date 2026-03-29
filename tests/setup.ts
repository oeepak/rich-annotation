import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// CSS Modules return identity mapping in test environment
// so className={styles.badge} produces className="badge"
vi.mock("../src/ui/styles", () => ({
  default: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));
