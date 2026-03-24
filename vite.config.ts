import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Pages from "vite-plugin-pages";

const normalizeBase = (rawBase: string) => {
  if (!rawBase) {
    return "/";
  }
  const withLeadingSlash = rawBase.startsWith("/") ? rawBase : `/${rawBase}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const defaultBase =
  repository && !repository.endsWith(".github.io") ? `/${repository}/` : "/";
const base = normalizeBase(process.env.VITE_BASE_URL ?? defaultBase);

export default defineConfig({
  base,
  plugins: [react(), Pages()],
});
