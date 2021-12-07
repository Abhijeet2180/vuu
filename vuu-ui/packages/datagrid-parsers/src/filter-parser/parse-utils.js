import { ErrorNode, TerminalNode } from 'antlr4ts/tree';

//TODO need to ingestthese in a non-specific way
import { FilterParser } from '../../generated/parsers/filter/FilterParser';
const singleCharacterSymbols = new Set([
  FilterParser.EQ,
  FilterParser.GT,
  FilterParser.LT,
  FilterParser.COMMA,
  FilterParser.LBRACK,
  FilterParser.RBRACK
]);

const FALSE = [false];
const caretAtEndOfText = (tokens, caretPosition) => {
  if (tokens.length < 2) {
    return FALSE;
  }
  const [lastToken] = tokens.slice(-2);
  const { start, text } = lastToken;
  if (text.length > 0 && start + text.length === caretPosition) {
    return [true, text];
  } else {
    return FALSE;
  }
};

export function extractFilter([parseResult]) {
  console.log(JSON.stringify(parseResult, null, 2));

  const { tokenPosition, label, ...filter } = parseResult;

  return { filter, name: label };
}

export function computeTokenIndexAndText(parser, parseTree, caretPosition) {
  const [atEndOfText, caretText = ''] = caretAtEndOfText(parser.inputStream.tokens, caretPosition);
  const {
    index,
    text,
    singleCharacterSymbol = false
  } = computeTokenPosition(parseTree, caretPosition);

  return atEndOfText && !singleCharacterSymbol
    ? { index, text, alternative: { index: index - 1, text: caretText } }
    : { index, text };
}

function computeTokenPosition(parseTree, caretPosition) {
  if (parseTree instanceof ErrorNode) {
    return;
  } else if (parseTree instanceof TerminalNode) {
    return computeTokenPositionOfTerminal(parseTree, caretPosition);
  } else {
    return computeTokenPositionOfChildNode(parseTree, caretPosition);
  }
}

function positionOfToken(token, text, caretPosition) {
  let start = token.charPositionInLine;
  let stop = token.charPositionInLine + text.length;
  if (start <= caretPosition && stop >= caretPosition) {
    let index = token.tokenIndex;
    if (singleCharacterSymbols.has(token.type)) {
      return {
        index: index + 1,
        singleCharacterSymbol: true,
        text: ''
      };
    } else {
      return {
        index: index,
        start,
        text: text.substring(0, caretPosition - start)
      };
    }
  } else {
    return undefined;
  }
}

function computeTokenPositionOfTerminal(parseTree, caretPosition) {
  return positionOfToken(parseTree.symbol, parseTree.text, caretPosition, parseTree);
}

function computeTokenPositionOfChildNode(parseTree, caretPosition) {
  for (let i = 0; i < parseTree.childCount; i++) {
    let position = computeTokenPosition(parseTree.getChild(i), caretPosition);
    if (position !== undefined) {
      return position;
    }
  }
}