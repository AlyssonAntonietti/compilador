export const tokens = {
    KEYWORD:     /\b(if|else|while|for|function|return|int|float|string|void)\b/,
    STRING:      /"(?:[^"\\]|\\.)*"/,
    INTEGER:     /\b\d+\b/,
    IDENTIFIER:  /\b[a-zA-Z_][a-zA-Z0-9_]*\b/,
    OPERATOR:    /!=|==|<=|>=|&&|\|\||[+\-*/<>]=?|=|!/,
    SYMBOL:      /[;(),{}]/,
    WHITESPACE:  /\s+/,
  };
  

export function tokenize(code) {
    const tokenRegex = new RegExp(
        Object.entries(tokens)
            .map(([name, pattern]) => `(?<${name}>${pattern.source})`)
            .join('|'),
        'g'
    );

    let result = [];
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
        for (let key in match.groups) {
            if (match.groups[key] && key !== 'WHITESPACE') {
                result.push({ type: key, value: match.groups[key] });
            }
        }
    }
    return result;
}