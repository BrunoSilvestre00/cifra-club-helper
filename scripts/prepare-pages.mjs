import { copyFile, writeFile } from "node:fs/promises";
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
console.log(
  "Fallback de rotas e arquivos estáticos preparados para GitHub Pages.",
);
