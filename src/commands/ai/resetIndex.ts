import type { CommandCallbackOpts } from "../../types/command.ts";
import { resetIndex } from "./askai.ts";

export default {
  name: "resetindex",
  description: "Reset model index to most performant model",
  aliases: ["resetidx", "resetmodel"],
  async execute({ message }: CommandCallbackOpts) {
    resetIndex();
    message.reply("Model index set to 0.");
  },
};
