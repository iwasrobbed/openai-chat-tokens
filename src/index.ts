import OpenAI from "openai";
import { Tiktoken } from "tiktoken";
import cl100k_base from "tiktoken/encoders/cl100k_base.json";
import { FunctionDef, formatFunctionDefinitions } from "./functions";

type Message = OpenAI.Chat.CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Message;
type Function = OpenAI.Chat.CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Function;

/**
 * Estimate the number of tokens a prompt will use.
 * @param {Object} prompt OpenAI prompt data
 * @param {Message[]} prompt.messages OpenAI chat messages
 * @param {Function[]} prompt.functions OpenAI function definitions
 * @returns An estimate for the number of tokens the prompt will use
 */
export function promptTokensEstimate({ messages, functions }: { messages: Message[], functions?: Function[] }): number {
  let tokens = messages.map(messageTokensEstimate).reduce((a, b) => a + b, 0);
  tokens += 3; // Add three per completion
  if (functions) {
    tokens += functionsTokensEstimate(functions as any as FunctionDef[]);
  }
  return tokens;
}

/**
 * Count the number of tokens in a string.
 * @param s The string to count tokens in
 * @returns The number of tokens in the string
 */
export function stringTokens(s: string): number {
  const encoding = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str
  );
  const tokens = encoding.encode(s).length;
  encoding.free();
  return tokens;
}

/**
 * Estimate the number of tokens a message will use. Note that using the message within a prompt will add extra
 * tokens, so you might want to use `promptTokensEstimate` instead.
 * @param message An OpenAI chat message
 * @returns An estimate for the number of tokens the message will use
 */
export function messageTokensEstimate(message: Message): number {
  const components = [message.role, message.content, message.name].filter((v): v is string => !!v);
  let tokens = components.map(stringTokens).reduce((a, b) => a + b, 0);
  tokens += 3; // Add three per message
  if (message.name) {
    tokens -= 1; // Subtract one if there's a function name
  }
  return tokens;
}

/**
 * Estimate the number of tokens a function definition will use. Note that using the function definition within 
 * a prompt will add extra tokens, so you might want to use `promptTokensEstimate` instead.
 * @param funcs An array of OpenAI function definitions
 * @returns An estimate for the number of tokens the function definitions will use
 */
export function functionsTokensEstimate(funcs: FunctionDef[]) {
  const promptDefinitions = formatFunctionDefinitions(funcs);
  let tokens = stringTokens(promptDefinitions);
  tokens += 9; // Add nine per completion
  return tokens;
}