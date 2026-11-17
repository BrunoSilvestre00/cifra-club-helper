import { defineConfig } from "vitest/config";
import ts from "typescript";

export default defineConfig({
  resolve: { preserveSymlinks: true },
  esbuild: false,
  plugins: [
    {
      name: "test-typescript",
      enforce: "pre",
      transform(code, id) {
        if (
          !/\.tsx?$/.test(id) ||
          id.replace(/\\/g, "/").includes("/node_modules/")
        )
          return;
        // Tests compile in-process, including on hosts that cannot spawn esbuild.
        const result = ts.transpileModule(code, {
          fileName: id,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            sourceMap: true,
            inlineSources: true,
          },
        });
        return { code: result.outputText, map: result.sourceMapText };
      },
    },
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"], pool: "threads" },
});
