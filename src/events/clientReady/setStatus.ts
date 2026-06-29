import { ActivityType, Client, type PresenceData } from "discord.js";

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
  setInterval(
    () => {
      client?.user?.setPresence(opts);
    },
    60 * 60 * 1000,
  );
};
