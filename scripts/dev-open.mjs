import { spawn } from "node:child_process";

const url = "http://localhost:3000";

const next = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev"],
  { stdio: "inherit", shell: false }
);

function openChrome() {
  let command;
  let args;

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", "chrome", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = ["-a", "Google Chrome", url];
  } else {
    command = "google-chrome";
    args = [url];
  }

  const opener = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });

  opener.on("error", () => {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore"
      }).unref();
    }
  });

  opener.unref();
}

setTimeout(openChrome, 1800);

next.on("exit", code => {
  process.exit(code ?? 0);
});
