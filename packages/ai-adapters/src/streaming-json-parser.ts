/**
 * Streaming JSON Parser
 *
 * Parses JSON tokens as they stream in, calling callbacks for specific field values.
 * Used to stream tool call arguments from AI providers.
 *
 * Based on the approach from the legacy DownPat codebase.
 */

export interface ParserState {
  key: string;
  value: string;
  isKey: boolean;
  isValue: boolean;
  checkSpecial: boolean;
  escapeNext: boolean;
}

/**
 * Initialize parser state for a new parsing session.
 */
export function initializeParserState(): ParserState {
  return {
    key: '',
    value: '',
    isKey: false,
    isValue: false,
    checkSpecial: true,
    escapeNext: false,
  };
}

/**
 * Parse a token of JSON and update the response object.
 * Calls callbacks for registered field names as their values are streamed.
 *
 * @param token - The JSON token/chunk to parse
 * @param response - Object accumulating the parsed response
 * @param state - Parser state (mutated during parsing)
 * @param callbacks - Map of field names to streaming callbacks
 */
export function parseJsonToken(
  token: string,
  response: Record<string, string>,
  state: ParserState,
  callbacks: Record<string, (chunk: string) => void>
): void {
  for (const ch of token) {
    if (state.checkSpecial) {
      if (ch === '{') {
        state.isKey = true;
        state.isValue = false;
        state.key = '';
        state.value = '';
        continue;
      } else if (ch === ':') {
        state.isKey = false;
        state.isValue = true;
        response[state.key] = '';
        state.value = '';
        continue;
      } else if (ch === ',') {
        writeResponseAndCall(state.key, state.value, response, callbacks);
        state.isKey = true;
        state.isValue = false;
        state.key = '';
        continue;
      } else if (ch === '}') {
        writeResponseAndCall(state.key, state.value, response, callbacks);
        state.isKey = false;
        state.isValue = false;
        state.key = '';
        state.value = '';
        continue;
      } else if ([' ', '\n', '\t', '\r'].includes(ch)) {
        continue;
      }
    }

    if (ch === '\\') {
      if (state.escapeNext) {
        if (state.isKey) {
          state.key += ch;
        } else {
          state.value += ch;
        }
        state.escapeNext = false;
      } else {
        state.escapeNext = true;
      }
      continue;
    }

    if (ch === '"' && !state.escapeNext) {
      state.checkSpecial = !state.checkSpecial;
    } else if (ch === 'n' && state.escapeNext) {
      if (state.isKey) {
        state.key += '\n';
      } else {
        state.value += '\n';
      }
    } else if (ch === 't' && state.escapeNext) {
      if (state.isKey) {
        state.key += '\t';
      } else {
        state.value += '\t';
      }
    } else if (ch === 'r' && state.escapeNext) {
      if (state.isKey) {
        state.key += '\r';
      } else {
        state.value += '\r';
      }
    } else if (state.isKey) {
      state.key += ch;
    } else if (state.isValue) {
      state.value += ch;
    }

    state.escapeNext = false;
  }

  // Flush any pending value
  if (state.isValue && state.value.length > 0) {
    writeResponseAndCall(state.key, state.value, response, callbacks);
    state.value = '';
  }
}

/**
 * Write the value to the response and call the callback if registered.
 */
function writeResponseAndCall(
  key: string,
  value: string,
  response: Record<string, string>,
  callbacks: Record<string, (chunk: string) => void>
): void {
  response[key] += value;

  if (callbacks[key]) {
    callbacks[key](value);
  }
}
