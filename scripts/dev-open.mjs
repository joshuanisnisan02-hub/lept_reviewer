import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = "http://localhost:3000";
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

const next = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit"
});

function openBrowser() {
  if (process.platform === "win32") {
    const opener = spawn("cmd.exe", ["/d", "/s", "/c", "start", "", "chrome", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });

    opener.on("error", () => {
      const fallback = spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      });
      fallback.unref();
    });

    opener.unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "google-chrome";
  const args = process.platform === "darwin" ? ["-a", "Google Chrome", url] : [url];
  const opener = spawn(command, args, { detached: true, stdio: "ignore" });
  opener.unref();
}

setTimeout(openBrowser, 1800);

next.on("error", error => {
  console.error("Unable to start Next.js:", error);
  process.exit(1);
});

next.on("exit", code => {
  process.exit(code ?? 0);
});
