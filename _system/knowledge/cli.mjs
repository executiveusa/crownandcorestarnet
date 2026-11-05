import {listKnowledge, searchKnowledge, getKnowledge} from "./index.mjs";
const [command, ...rest] = process.argv.slice(2);
try {
  let data;
  if (command === "list") data = listKnowledge();
  else if (command === "search") data = searchKnowledge(rest.join(" "));
  else if (command === "get") data = getKnowledge(rest[0]);
  else throw new Error("Usage: node _system/knowledge/cli.mjs list|search <keywords>|get <id>");
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
} catch (error) {
  process.stderr.write("Knowledge interface: " + String(error.message) + "\n");
  process.exitCode = 1;
}
