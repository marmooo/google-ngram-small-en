import { TextLineStream } from "jsr:@std/streams";

const ranges = [
  { id: 1, from: 6, to: 23, total: 24 },
  { id: 2, from: 0, to: 588, total: 589 },
  { id: 3, from: 0, to: 6880, total: 6881 },
];

const baseUrl = "http://storage.googleapis.com/books/ngrams/books/20200217/eng";

async function appendLines(outFilePath, lines) {
  try {
    await Deno.lstat(outFilePath);
    await Deno.writeTextFile(outFilePath, "\n" + lines.join("\n"), {
      append: true,
    });
  } catch {
    await Deno.writeTextFile(outFilePath, lines.join("\n"));
  }
}

async function processFile(fileName, outDir, id) {
  const buffers = {};

  console.log(`[${id}gram] downloading ${fileName} ...`);
  const res = await fetch(`${baseUrl}/${fileName}.gz`);
  if (!res.ok) throw new Error(`Failed to fetch ${fileName}`);
  const stream = res.body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  for await (const line of stream) {
    if (!line) continue;
    const arr = line.split("\t");
    const word = arr[0];
    if (!/^[a-zA-Z_]/.test(word)) continue;

    const last = arr[arr.length - 1];
    const [_date, count1, _count2] = last.split(",");
    if (!count1 || count1.length < 4) continue;

    const firstLetter = word[0];
    if (!(firstLetter in buffers)) buffers[firstLetter] = [];
    buffers[firstLetter].push(`${word},${count1}`);
  }

  // flush
  await Deno.mkdir(outDir, { recursive: true });
  for (const [letter, lines] of Object.entries(buffers)) {
    const outFilePath = `${outDir}/${letter}.csv`;
    await appendLines(outFilePath, lines);
    console.log(
      `[${id}gram] ${letter}.csv written (from ${fileName} to ${fileName})`,
    );
  }
}

for (const { id, from, to, total } of ranges) {
  const outDir = `dist/${id}gram`;
  for (let i = from; i <= to; i++) {
    const fileName = `${id}-${i.toString().padStart(5, "0")}-of-${
      total
        .toString()
        .padStart(5, "0")
    }`;
    await processFile(fileName, outDir, id);
  }
}
