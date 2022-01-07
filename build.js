import { readStringDelim } from "https://deno.land/std/io/mod.ts";
import { $ } from 'https://deno.land/x/bazx/mod.ts';

function existsSync(filepath) {
  try {
    Deno.lstatSync(filepath);
    return true;
  } catch {
    return false;
  }
}

// https://storage.googleapis.com/books/ngrams/books/datasetsv3.html
const range = [
  { from:0, to:23 },
  { from:0, to:588 },
  { from:0, to:6880 },
];

// TODO: /tmp が爆発するので100件ずつ手動ダウンロードしたほうがいい
for (let i = range[2].from; i <= range[2].to; i++) {
  const result = {};
  const baseUrl = "http://storage.googleapis.com/books/ngrams/books/20200217/eng"
  // const fileName = `1-${i.toString().padStart(5, '0')}-of-00024`;
  // const fileName = `2-${i.toString().padStart(5, '0')}-of-00589`;
  const fileName = `3-${i.toString().padStart(5, '0')}-of-06881`;
  console.log(fileName);
  const url = `${baseUrl}/${fileName}.gz`;
  await $`wget ${url} -P ngram`;
  await $`gzip -d ngram/${fileName}.gz`;
  const fileReader = await Deno.open(`ngram/${fileName}`);
  // TODO: readLines では失敗
  // for await (const line of readLines(fileReader)) {
  for await (const line of readStringDelim(fileReader, "\n")) {
    if (!line) continue;
    const arr = line.split("\t");
    const word = arr[0];
    if (/^[a-zA-Z_].*/.test(word)) {
      const last = arr.slice(-1)[0];
      const [_date, count1, _count2] = last.split(",");
      if (count1.length >= 4) {
        const abc = word[0];
        if (abc in result) {
          result[abc].push([word, count1]);
        } else {
          result[abc] = [[word, count1]];
        }
      }
    }
  }
  Deno.removeSync(`ngram/${fileName}`);
  Deno.mkdirSync("dist/3gram", { recursive: true });
  for (const [abc, words] of Object.entries(result)) {
    const outFilePath = `dist/3gram/${abc}.lst`;
    if (existsSync(outFilePath)) {
      Deno.writeTextFileSync(outFilePath, "\n" + words.join("\n"), { append: true });
    } else {
      Deno.writeTextFileSync(outFilePath, words.join("\n"));
    }
  }
}
