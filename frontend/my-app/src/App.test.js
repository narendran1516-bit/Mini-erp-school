import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login heading", () => {
  render(<App />);
  expect(screen.getByText(/mini school erp/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
});
