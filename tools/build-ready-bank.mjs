// Kullanım (kendi bilgisayarında): node tools/build-ready-bank.mjs
// Soru + cevap bankasını functions/ready_bank.json dosyasına yazar. Bu dosya SADECE sunucuda (Cloud Functions) durur.
import { READY_TESTS } from "./full/curriculum.mjs";
import { writeFileSync } from "node:fs";
const bank = {};
for (const t of READY_TESTS) {
  bank[t.id] = {
    questions: t.questions.map((q) => ({ question: q.question, options: q.options, focus: q.focus || "" })),
    answers: t.questions.map((q) => Number(q.correctAnswer))
  };
}
writeFileSync(new URL("../functions/ready_bank.json", import.meta.url), JSON.stringify(bank));
console.log("Test sayısı:", Object.keys(bank).length);
