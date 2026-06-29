import { ActivityType, Client, type PresenceData } from "discord.js";

let presenceInterval: NodeJS.Timeout | null = null;
export default (client: Client) => {
  const opts: PresenceData = {
    activities: [
      {
        name: "@ping me",
        type: ActivityType.Listening,
      },
    ],
    status: "online",
  };
  client?.user?.setPresence(opts);
  if (presenceInterval) {
    clearInterval(presenceInterval);
  }
  presenceInterval = setInterval(
    () => {
      client?.user?.setPresence(opts);
    },
    60 * 60 * 1000,
  );
};
