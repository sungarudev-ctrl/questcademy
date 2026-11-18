// stdin: JSON replay request. stdout: JSON replay response. Exit 2 on malformed input.
import { replay } from "./replay.mjs";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
try {
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!Array.isArray(request.attempts)) throw new Error("attempts[] required");
  process.stdout.write(JSON.stringify(replay(request)));
} catch (err) {
  process.stderr.write(String(err instanceof Error ? err.message : err));
  process.exit(2);
}
