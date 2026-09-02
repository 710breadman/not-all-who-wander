import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  afterEach(cleanup);

  it("opens the persistent trip creation flow", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Path A Logical" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start a new trip/i }));
    expect(
      screen.getByRole("dialog", { name: "New camping trip" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /tent camping/i })).toBeChecked();
    expect(screen.getByText("Where do items belong?")).toBeInTheDocument();
  });

  it("opens local profile creation from the home profile switcher", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in / switch profile" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Sign in or switch profile" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create a profile" }));
    expect(
      screen.getByRole("heading", { name: "People & profiles" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Add person" }));
    expect(
      screen.getByRole("textbox", { name: /email or gmail address/i }),
    ).toHaveAttribute("type", "email");
  });
});
