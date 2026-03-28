import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Pages from "vite-plugin-pages";
import { existsSync } from "node:fs";

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
const hasCustomDomain = existsSync("CNAME");
const defaultBase = hasCustomDomain
  ? "/"
  : repository && !repository.endsWith(".github.io")
    ? `/${repository}/`
    : "/";
const base = normalizeBase(process.env.VITE_BASE_URL ?? defaultBase);

export default defineConfig({
  base,
  plugins: [react(), Pages()],
});
