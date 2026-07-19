import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <div className="space-y-2 p-4">
      <h2 className="text-lg font-semibold">Not found</h2>
      <Link to="/" className="text-blue-700 underline">
        Home
      </Link>
    </div>
  );
}
