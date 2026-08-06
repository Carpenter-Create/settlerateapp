import { describe, expect, it, vi, beforeEach } from "vitest";

const captureException = vi.fn();

vi.mock("@/lib/observability", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

function collectText(node: unknown, acc: string[] = []): string[] {
  if (typeof node === "string" || typeof node === "number") {
    acc.push(String(node));
  } else if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, acc));
  } else if (node && typeof node === "object" && "props" in (node as Record<string, unknown>)) {
    collectText((node as { props?: { children?: unknown } }).props?.children, acc);
  }
  return acc;
}

describe("ErrorBoundary — normal rendering", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("renders children unchanged when there is no error", async () => {
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    const children = "child-content";
    const instance = new ErrorBoundary({ children });
    expect(instance.state).toEqual({ hasError: false });
    expect(instance.render()).toBe(children);
  });
});

describe("ErrorBoundary — fallback rendering", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("getDerivedStateFromError flips state to hasError", async () => {
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    expect(ErrorBoundary.getDerivedStateFromError(new Error("boom"))).toEqual({
      hasError: true,
    });
  });

  it("renders only the approved neutral fallback message and a Reload control — no technical details", async () => {
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    const instance = new ErrorBoundary({ children: "child-content" });
    instance.state = { hasError: true };

    const fallback = instance.render() as { type: string; props: Record<string, unknown> };
    expect(fallback.type).toBe("div");
    expect(fallback.props.role).toBe("alert");

    const text = collectText(fallback);
    expect(text).toEqual(["Something went wrong. Reload the page to continue.", "Reload"]);

    const serialized = JSON.stringify(fallback);
    expect(serialized).not.toContain("child-content");
    expect(serialized.toLowerCase()).not.toContain("stack");
    expect(serialized.toLowerCase()).not.toContain("error:");
  });

  it("does not expose the caught error object anywhere in the fallback tree", async () => {
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    const instance = new ErrorBoundary({ children: "child-content" });
    instance.componentDidCatch(new Error("sensitive stack detail: income=120000"), {
      componentStack: "",
    });
    instance.state = { hasError: true };
    const serialized = JSON.stringify(instance.render());
    expect(serialized).not.toContain("sensitive stack detail");
    expect(serialized).not.toContain("120000");
  });
});

describe("ErrorBoundary — observability capture", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("reports the caught error via captureException", async () => {
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    const instance = new ErrorBoundary({ children: null });
    const error = new Error("render failure");
    instance.componentDidCatch(error, { componentStack: "" });
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("behaves safely when the underlying observability capture is disabled (real module, no mock)", async () => {
    vi.doUnmock("@/lib/observability");
    vi.resetModules();
    const { ErrorBoundary } = await import("@/components/system/ErrorBoundary");
    const instance = new ErrorBoundary({ children: "child-content" });
    // Real captureException no-ops outside production / without a DSN
    // (see src/lib/__tests__/observability.test.ts) — this only asserts the
    // boundary itself never throws when that no-op path is exercised.
    expect(() =>
      instance.componentDidCatch(new Error("boom"), { componentStack: "" })
    ).not.toThrow();
    instance.state = { hasError: true };
    expect(() => instance.render()).not.toThrow();
  });
});
