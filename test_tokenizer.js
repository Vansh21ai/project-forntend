import { AutoTokenizer, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

env.allowLocalModels = false;

async function test() {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2');
    const encoded = tokenizer('The neuron fires a signal');
    const ids = Array.from(encoded.input_ids.data);
    console.log("IDs:", ids);
    // Usually convert_ids_to_tokens is on the tokenizer
    const tokens = tokenizer.model ? tokenizer.model.convert_ids_to_tokens(ids) : [];
    console.log("Tokens:", tokens);
}

test();