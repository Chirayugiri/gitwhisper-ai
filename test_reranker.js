import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

async function test() {
  const rerank = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2');
  const res = await rerank("how to read file", { text_pair: "import fs from 'fs'; fs.readFileSync('foo.txt');" });
  console.log(res);
}

test();
