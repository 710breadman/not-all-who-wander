import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("opens the persistent trip creation flow", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Pack well. Wander far." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start a new trip/i }));
    expect(screen.getByRole("dialog", { name: "New camping trip" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /tent camping/i })).toBeChecked();
    expect(screen.getByText("Where do items belong?")).toBeInTheDocument();
  });
});
