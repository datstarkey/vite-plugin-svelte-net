import path from "path";
import type {Plugin} from "vite";
import {normalizePath} from "vite";
import glob from "glob";
import {svelte} from "@sveltejs/vite-plugin-svelte";
const __dirname = process.cwd();

export type SvelteNetOptions = {
  serverLocation?: string;
  clientLocation?: string;
  outDir?: string;
  pagesDir?: string;
};

function getSvelteFiles(options?: SvelteNetOptions) {
  const input = options?.pagesDir ?? "Routes";
  return Object.fromEntries(
    glob
      .globSync(input + "/**/*.svelte")
      .map((file) => [
        normalizePath(
          path.relative(
            input,
            file.slice(0, file.length - path.extname(file).length),
          ),
        ),
        normalizePath(path.join(__dirname, file)),
      ]),
  );
}

export default function svelteEntry(options?: SvelteNetOptions): Plugin[] {
  const p: Plugin = {
    name: "svelte-net",
    config(config, env) {
      const isSsr = env.ssrBuild ?? false;
      const outDir = normalizePath(
        path.join(__dirname, options?.outDir ?? "wwwroot"),
      );

      const entry = getSvelteFiles(options);
      console.log(entry);
      config.server ??= {};
      config.server.port ??= 3000;

      config.server.hmr = {
        protocol: "ws",
      };
      config.server.watch = {
        usePolling: true,
      };

      config.build ??= {};
      config.build.sourcemap ??= env.command !== "build";
      config.build.emptyOutDir ??= true;
      config.build.outDir ??=
        outDir +
        (isSsr
          ? options?.serverLocation ?? "/server"
          : options?.clientLocation ?? "/client");
      config.build.assetsDir ??= "assets";
      config.build.manifest = true;

      config.build.lib = isSsr
        ? false
        : {
            entry: entry,
            formats: ["es"],
          };

      config.build.rollupOptions = {
        input: entry,
      };
      console.log(config);
    },
  };

  return [
    p,
    ...svelte({
      compilerOptions: {
        hydratable: true,
      },
    }),
  ];
}
