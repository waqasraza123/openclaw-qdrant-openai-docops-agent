import { createHash } from "node:crypto";

const toDeterministicUuid = (value: string) => {
  const hexChars = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hexChars[12] = "5";
  const variantIndex = parseInt(hexChars[16] ?? "0", 16) % 4;
  hexChars[16] = ["8", "9", "a", "b"][variantIndex] ?? "8";

  return [
    hexChars.slice(0, 8).join(""),
    hexChars.slice(8, 12).join(""),
    hexChars.slice(12, 16).join(""),
    hexChars.slice(16, 20).join(""),
    hexChars.slice(20, 32).join("")
  ].join("-");
};

export const getQdrantPointId = (namespace: string, value: string) =>
  toDeterministicUuid(`${namespace}:${value}`);
