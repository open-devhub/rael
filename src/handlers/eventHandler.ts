import type { Client, ClientEvents } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../utils/getAllFiles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (client: Client) => {
  const eventFolders = getAllFiles(path.join(__dirname, "..", "events"), true);

  for (const eventFolder of eventFolders) {
    let eventFiles = getAllFiles(eventFolder);
    eventFiles.sort();

    const eventName = eventFolder.replace(/\\/g, "/").split("/").pop() || "";

    if (!eventName) continue;

    client.on(eventName as keyof ClientEvents, async (...args) => {
      for (const eventFile of eventFiles) {
        const eventFunction = await import(`file://${eventFile}`);
        await eventFunction.default(client, ...args);
      }
    });
  }
};
