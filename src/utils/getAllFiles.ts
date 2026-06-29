import { readdirSync } from "fs";
import { join } from "path";

export default (directory: string, foldersOnly = false) => {
  let fileNames = [];

  const files = readdirSync(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(directory, file.name);

    if (foldersOnly) {
      if (file.isDirectory()) {
        fileNames.push(filePath);
      }
    } else {
      if (file.isFile()) {
        fileNames.push(filePath);
      }
    }
  }

  return fileNames;
};
