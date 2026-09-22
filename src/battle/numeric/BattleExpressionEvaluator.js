import {
    addBattleFixed,
    divideBattleFixed,
    multiplyBattleFixed,
    normalizeBattleFixed,
    subtractBattleFixed
} from './BattleFixed.js';

const PRECEDENCE = Object.freeze({ '+': 1, '-': 1, '*': 2, '/': 2 });

function tokenize(expression) {
    const tokens = String(expression || '').match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g) || [];
    const compact = String(expression || '').replace(/\s+/g, '');
    if (tokens.join('') !== compact) throw new Error(`BATTLE_FORMULA_TOKEN_INVALID:${expression}`);
    return tokens;
}

function toPostfix(expression) {
    const output = [];
    const operators = [];
    let previous = null;
    for (const token of tokenize(expression)) {
        if (/^[A-Za-z_\d]/.test(token)) {
            output.push(token);
        } else if (token === '(') {
            operators.push(token);
        } else if (token === ')') {
            while (operators.length && operators.at(-1) !== '(') output.push(operators.pop());
            if (operators.pop() !== '(') throw new Error('BATTLE_FORMULA_PARENTHESES_INVALID');
        } else {
            if (token === '-' && (previous == null || previous === '(' || PRECEDENCE[previous])) output.push('0');
            while (operators.length && PRECEDENCE[operators.at(-1)] >= PRECEDENCE[token]) {
                output.push(operators.pop());
            }
            operators.push(token);
        }
        previous = token;
    }
    while (operators.length) {
        const operator = operators.pop();
        if (operator === '(') throw new Error('BATTLE_FORMULA_PARENTHESES_INVALID');
        output.push(operator);
    }
    return output;
}

export function evaluateBattleExpression(expression, values = {}) {
    const stack = [];
    for (const token of toPostfix(expression)) {
        if (!PRECEDENCE[token]) {
            stack.push(normalizeBattleFixed(Object.hasOwn(values, token) ? values[token] : token));
            continue;
        }
        const right = stack.pop();
        const left = stack.pop();
        if (left == null || right == null) throw new Error('BATTLE_FORMULA_OPERAND_MISSING');
        if (token === '+') stack.push(addBattleFixed(left, right));
        if (token === '-') stack.push(subtractBattleFixed(left, right));
        if (token === '*') stack.push(multiplyBattleFixed(left, right));
        if (token === '/') stack.push(divideBattleFixed(left, right));
    }
    if (stack.length !== 1) throw new Error('BATTLE_FORMULA_EXPRESSION_INVALID');
    return stack[0];
}
