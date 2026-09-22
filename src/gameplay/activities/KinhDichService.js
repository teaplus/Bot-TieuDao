import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(
  process.cwd(),
  "src/data/kinhdich/kinhdich.json"
);

export default class KinhDichService {
  constructor() {
    this.queData = [];
    this.loadData();
  }

  loadData() {
    try {
      const rawData = fs.readFileSync(DATA_PATH, "utf-8");
      this.queData = JSON.parse(rawData);
    } catch (error) {
      console.error("Failed to load KinhDich data:", error);
    }
  }

  getAllQue() {
    return this.queData;
  }

  getRandomQue() {
    if (this.queData.length === 0) return null;
    const index = Math.floor(Math.random() * this.queData.length);
    return this.queData[index];
  }

  pickUnique(n) {
    if (this.queData.length === 0) return [];
    const picked = [];
    const used = new Set();
    while (picked.length < n) {
      const index = Math.floor(Math.random() * this.queData.length);
      const q = this.queData[index];
      if (!used.has(q.id)) {
        used.add(q.id);
        picked.push(q);
      }
    }
    return picked;
  }

  getTypeStyle(type) {
    switch (type) {
      case "Đại Cát":
        return { color: 0xffaa00, label: "Đại Cát (Rất tốt)" };
      case "Cát":
        return { color: 0x00ff00, label: "Cát (Tốt)" };
      case "Bình":
        return { color: 0xaaaaaa, label: "Bình (Bình thường)" };
      case "Hung":
        return { color: 0xff0000, label: "Hung (Xấu)" };
      case "Đại Hung":
        return { color: 0x8b0000, label: "Đại Hung (Rất xấu)" };
      default:
        return { color: 0x5865f2, label: type };
    }
  }
}
