import { DatasetRow, DatasetColumn, FormulaColumn, DataType } from '../types';

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  sum: (...args) => args.reduce((a, b) => a + b, 0),
  avg: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
};

const tokenize = (formula: string): string[] => {
  const tokens: string[] = [];
  let i = 0;
  while (i < formula.length) {
    const char = formula[i];
    if (char === ' ') {
      i++;
      continue;
    }
    if ('+-*/()%,'.includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }
    if (/\d/.test(char) || char === '.') {
      let num = '';
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i];
        i++;
      }
      tokens.push(num);
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let name = '';
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        name += formula[i];
        i++;
      }
      tokens.push(name);
      continue;
    }
    throw new Error(`无法识别的字符: ${char}`);
  }
  return tokens;
};

interface ParserContext {
  tokens: string[];
  pos: number;
  row: DatasetRow;
}

const peek = (ctx: ParserContext): string | undefined => ctx.tokens[ctx.pos];
const consume = (ctx: ParserContext): string | undefined => ctx.tokens[ctx.pos++];

const parseExpression = (ctx: ParserContext): number => {
  let result = parseTerm(ctx);
  while (peek(ctx) === '+' || peek(ctx) === '-') {
    const op = consume(ctx);
    const right = parseTerm(ctx);
    result = op === '+' ? result + right : result - right;
  }
  return result;
};

const parseTerm = (ctx: ParserContext): number => {
  let result = parseFactor(ctx);
  while (peek(ctx) === '*' || peek(ctx) === '/') {
    const op = consume(ctx);
    const right = parseFactor(ctx);
    result = op === '*' ? result * right : result / right;
  }
  return result;
};

const parseFactor = (ctx: ParserContext): number => {
  const token = peek(ctx);
  if (token === '+') {
    consume(ctx);
    return parseFactor(ctx);
  }
  if (token === '-') {
    consume(ctx);
    return -parseFactor(ctx);
  }
  if (token === '(') {
    consume(ctx);
    const result = parseExpression(ctx);
    if (consume(ctx) !== ')') throw new Error('缺少右括号');
    return result;
  }
  return parseAtom(ctx);
};

const parseAtom = (ctx: ParserContext): number => {
  const token = consume(ctx);
  if (token === undefined) throw new Error('意外的表达式结束');
  if (!isNaN(Number(token))) return Number(token);
  if (peek(ctx) === '(') {
    consume(ctx);
    const args: number[] = [];
    if (peek(ctx) !== ')') {
      args.push(parseExpression(ctx));
      while (peek(ctx) === ',') {
        consume(ctx);
        args.push(parseExpression(ctx));
      }
    }
    if (consume(ctx) !== ')') throw new Error('函数调用缺少右括号');
    const fn = FUNCTIONS[token];
    if (!fn) throw new Error(`未知函数: ${token}`);
    return fn(...args);
  }
  if (token in ctx.row) {
    const value = ctx.row[token];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !isNaN(Number(value))) return Number(value);
    return 0;
  }
  throw new Error(`未知变量或函数: ${token}`);
};

export const evaluateFormula = (formula: string, row: DatasetRow): number | string | null => {
  try {
    const tokens = tokenize(formula);
    if (tokens.length === 0) return null;
    const ctx: ParserContext = { tokens, pos: 0, row };
    const result = parseExpression(ctx);
    if (ctx.pos < tokens.length) throw new Error('表达式未完全解析');
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export const evaluateFormulaToString = (formula: string, row: DatasetRow): string => {
  const result = evaluateFormula(formula, row);
  return result === null ? '' : String(result);
};

export const validateFormula = (formula: string, columns: DatasetColumn[]): { valid: boolean; error?: string } => {
  try {
    const tokens = tokenize(formula);
    if (tokens.length === 0) return { valid: false, error: '公式不能为空' };
    const columnNames = new Set(columns.map((c) => c.name));
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (/^[a-zA-Z_]/.test(token) && tokens[i + 1] !== '(') {
        if (!columnNames.has(token) && !(token in FUNCTIONS)) {
          return { valid: false, error: `未知字段或函数: ${token}` };
        }
      }
    }
    const testRow: DatasetRow = {};
    columns.forEach((col) => {
      testRow[col.name] = col.type === DataType.Number ? 1 : col.type === DataType.Boolean ? true : 'test';
    });
    const result = evaluateFormula(formula, testRow);
    if (result === null) return { valid: false, error: '公式计算失败，请检查语法' };
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : '公式语法错误' };
  }
};

export const computeDatasetWithFormulas = (dataset: {
  columns: DatasetColumn[];
  data: DatasetRow[];
}): { columns: DatasetColumn[]; data: DatasetRow[] } => {
  const formulaColumns = dataset.columns.filter((col): col is FormulaColumn => 'isFormula' in col && col.isFormula);
  if (formulaColumns.length === 0) {
    return { columns: dataset.columns, data: dataset.data };
  }
  const computedData = dataset.data.map((row) => {
    const newRow = { ...row };
    formulaColumns.forEach((col) => {
      newRow[col.name] = evaluateFormula(col.formula, newRow);
    });
    return newRow;
  });
  return { columns: dataset.columns, data: computedData };
};

export const getFormulaAvailableFunctions = (): { name: string; description: string }[] => [
  { name: 'abs(x)', description: '绝对值' },
  { name: 'sqrt(x)', description: '平方根' },
  { name: 'log(x)', description: '自然对数' },
  { name: 'log10(x)', description: '以10为底的对数' },
  { name: 'log2(x)', description: '以2为底的对数' },
  { name: 'exp(x)', description: 'e的x次方' },
  { name: 'pow(x, y)', description: 'x的y次方' },
  { name: 'sin(x)', description: '正弦函数' },
  { name: 'cos(x)', description: '余弦函数' },
  { name: 'tan(x)', description: '正切函数' },
  { name: 'floor(x)', description: '向下取整' },
  { name: 'ceil(x)', description: '向上取整' },
  { name: 'round(x)', description: '四舍五入' },
  { name: 'min(a, b, ...)', description: '最小值' },
  { name: 'max(a, b, ...)', description: '最大值' },
  { name: 'sum(a, b, ...)', description: '求和' },
  { name: 'avg(a, b, ...)', description: '平均值' },
];
