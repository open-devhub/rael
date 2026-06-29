import fsp from "fs/promises";

export function readFile(path: string) {
  return fsp.readFile(path, "utf-8");
}

export function writeFile(path: string, content: string) {
  return fsp.writeFile(path, content, "utf-8");
}
