import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Export the same React presentation used by /present, with no server required.
const frontend = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = path.join(frontend, "presentation-dist");
const outputFile = path.join(outputDirectory, "Hokie_Wallet_Presentation.html");
const mediaModule = path.join(frontend, "src/features/presentation/presentation-media.ts");
const imageFiles = {
  campus: "campus/origami.png",
  finbot: "finbot/team-logo.png",
  overview: "presentation/overview.jpg",
  dining: "presentation/dining.jpg",
};

function appUrlFromArguments(args) {
  if (args.length === 0) return "http://localhost:3000";
  if (args.length !== 2 || args[0] !== "--app-url") {
    throw new Error("Usage: npm run presentation:export -- [--app-url https://your-app.example]");
  }
  const url = new URL(args[1]);
  if (!["http:", "https:"].includes(url.protocol)
    || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("--app-url must be an HTTP(S) origin without credentials, a path, or query parameters.");
  }
  return url.origin;
}

async function dataUrl(filename, mimeType) {
  // A missing screenshot/font is a build error, never an empty presentation image.
  const bytes = await readFile(filename);
  if (bytes.length === 0) throw new Error(`Presentation asset is empty: ${filename}`);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

const presentationAppUrl = appUrlFromArguments(process.argv.slice(2));
await readFile(mediaModule, "utf8");
const presentationMedia = Object.fromEntries(await Promise.all(
  Object.entries(imageFiles).map(async ([name, filename]) => [
    name, await dataUrl(path.join(frontend, "public", filename), filename.endsWith(".jpg") ? "image/jpeg" : "image/png"),
  ]),
));

const fonts = await Promise.all([
  ["Lato-Regular.woff2", 400],
  ["Lato-Bold.woff2", 700],
  ["Lato-Black.woff2", 900],
].map(async ([filename, weight]) => {
  const source = await dataUrl(path.join(frontend, "src/app/fonts", filename), "font/woff2");
  return `@font-face{font-family:PresentationLato;font-style:normal;font-weight:${weight};font-display:swap;src:url("${source}") format("woff2")}`;
}));
const fontLicense = await readFile(path.join(frontend, "src/app/fonts/Lato-OFL.txt"), "utf8");

const result = await build({
  absWorkingDir: frontend,
  stdin: {
    contents: `import { createRoot } from "react-dom/client";
import { Presentation } from "./src/features/presentation/presentation";
createRoot(document.getElementById("presentation-root")).render(<Presentation />);`,
    sourcefile: "presentation-entry.tsx",
    resolveDir: frontend,
    loader: "tsx",
  },
  outfile: path.join(outputDirectory, "presentation.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  legalComments: "inline",
  write: false,
  metafile: true,
  plugins: [{
    name: "standalone-presentation-assets",
    setup(builder) {
      builder.onResolve({ filter: /^next\/image$/ }, () => ({
        path: "image", namespace: "presentation-image",
      }));
      builder.onLoad({ filter: /.*/, namespace: "presentation-image" }, () => ({
        loader: "jsx",
        resolveDir: frontend,
        contents: `import { createElement } from "react";
export default function Image({ src, fill, style, priority, preload, unoptimized, loader, quality, placeholder, blurDataURL, onLoadingComplete, overrideSrc, ...props }) {
  const imageSource = typeof src === "string" ? src : src.src;
  const imageStyle = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style;
  return createElement("img", { ...props, src: imageSource, style: imageStyle });
}`,
      }));
      builder.onLoad({ filter: /presentation-media\.ts$/ }, ({ path: filename }) => {
        if (filename !== mediaModule) return undefined;
        return {
          loader: "ts",
          contents: `export const presentationMedia = ${JSON.stringify(presentationMedia)};
export const presentationAppUrl = ${JSON.stringify(presentationAppUrl)};`,
        };
      });
    },
  }],
});

const script = result.outputFiles.find(file => file.path.endsWith(".js"))?.text;
const presentationCss = result.outputFiles.find(file => file.path.endsWith(".css"))?.text;
if (!script || !presentationCss) throw new Error("Presentation script or stylesheet was not generated.");
for (const output of Object.values(result.metafile.outputs)) {
  if (output.imports.some(item => item.external)) throw new Error("Presentation export contains an external dependency.");
}
for (const match of presentationCss.matchAll(/url\(\s*["']?([^\s"')]+)/gi)) {
  if (!match[1].startsWith("data:")) throw new Error(`Presentation CSS references a nonembedded asset: ${match[1]}`);
}
for (const filename of Object.values(imageFiles)) {
  if (script.includes(`/${filename}`)) throw new Error(`Presentation image was not embedded: ${filename}`);
}

// Browsers parse closing HTML tags even inside JavaScript/CSS strings.
const safeScript = script.replace(/<\/script/gi, "<\\/script");
const reset = `:root{--font-lato:PresentationLato}html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4}html,body{margin:0;padding:0}body{font-family:PresentationLato,Arial,sans-serif;-webkit-font-smoothing:antialiased}button,input{font:inherit;letter-spacing:inherit;color:inherit}button{cursor:pointer}img,svg{display:block;vertical-align:middle}img{max-width:100%;height:auto}a{color:inherit}*{box-sizing:border-box}`;
const safeCss = `${fonts.join("\n")}\n${reset}\n${presentationCss}`.replace(/<\/style/gi, "\\3c /style");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
  <meta name="description" content="Hokie Wallet — a four-minute student budgeting presentation with speaker notes.">
  <title>Hokie Wallet · Presentation</title>
  <script type="text/plain" id="presentation-font-license">${fontLicense.replace(/<\/script/gi, "<\\/script")}</script>
  <style>${safeCss}</style>
</head>
<body>
  <noscript>This interactive presentation needs JavaScript enabled. All presentation assets are included in this file.</noscript>
  <div id="presentation-root"></div>
  <script>${safeScript}</script>
</body>
</html>
`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, html, "utf8");
console.log(`Exported ${outputFile} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB).`);
console.log(`Open the HTML file directly in a browser. Optional product links open ${presentationAppUrl}.`);
