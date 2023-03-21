/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Tree } from "@lezer/common";
type expressionType =
  | "arithmeticExpression"
  | "booleanCondition"
  | "booleanLiteralExpression"
  | "callExpression"
  | "colExpression"
  | "conditionalExpression"
  | "numberLiteralExpression"
  | "relationalExpression"
  | "stringLiteralExpression";

type arithmeticOp = "*" | "/" | "+" | "-";
type booleanOp = "and" | "or";
type relationalOp = "=" | "!=" | ">" | ">=" | "<" | "<=";

export interface Expression {
  type: expressionType;
  value?: string | number | boolean;
}

interface ArithmeticExpression extends Expression {
  expressions: [Expression, Expression];
  op: arithmeticOp;
  type: "arithmeticExpression";
}

interface BooleanCondition extends Expression {
  expressions: Expression[];
  op: booleanOp;
  type: "booleanCondition";
}
interface RelationalExpression extends Expression {
  expressions: Expression[];
  op: relationalOp;
  type: "relationalExpression";
}

interface ColExpression extends Expression {
  column?: string;
  type: "colExpression";
}

interface CallExpression extends Expression {
  arguments: Expression[];
  functionName?: string;
  type: "callExpression";
}

type ConditionExpression = RelationalExpression | BooleanCondition;

interface ConditionalExpression extends Expression {
  type: "conditionalExpression";
  condition: ConditionExpression;
  truthyExpression: Expression;
  falsyExpression: Expression;
}

class BooleanConditionImp implements BooleanCondition {
  // @ts-ignore
  #expressions: [Expression, Expression] = [];
  #op: "and" | "or";
  type = "booleanCondition" as const;
  constructor(booleanOperator: "and" | "or") {
    this.#op = booleanOperator;
  }
  get op() {
    return this.#op;
  }
  get expressions() {
    return this.#expressions;
  }
  toJson() {
    return {
      type: this.type,
      op: this.#op,
      expressions: this.#expressions,
    };
  }
}

class ConditionalExpressionImpl implements ConditionalExpression {
  // @ts-ignore
  #expressions: [ConditionExpression, Expression, Expression] = [];
  type = "conditionalExpression" as const;

  constructor(booleanOperator?: "and" | "or") {
    // @ts-ignore
    this.#expressions[0] = booleanOperator
      ? new BooleanConditionImp(booleanOperator)
      : {
          type: "relationalExpression",
          op: undefined,
          expressions: [],
        };
  }

  get condition(): ConditionExpression {
    return this.#expressions[0];
  }
  get truthyExpression(): Expression {
    return this.#expressions[1];
  }
  set truthyExpression(expression: Expression) {
    this.#expressions[1] = expression;
  }
  get falsyExpression(): Expression {
    return this.#expressions[2];
  }
  set falsyExpression(expression: Expression) {
    this.#expressions[2] = expression;
  }

  toJson() {
    return {
      type: this.type,
      condition: this.condition.toJson(),
      truthyExpression: this.truthyExpression,
      falsyExpression: this.falsyExpression,
    };
  }
}

type PartialExpression =
  | ArithmeticExpression
  | RelationalExpression
  | ColExpression
  | CallExpression
  | BooleanCondition
  | Partial<ConditionalExpression>;

const isArithmeticExpression = (
  expression: PotentiallyUnresolvedExpression
): expression is ArithmeticExpression =>
  expression.type === "arithmeticExpression";
const isCallExpression = (
  expression: PotentiallyUnresolvedExpression
): expression is CallExpression => expression.type === "callExpression";
const isConditionalExpression = (
  expression: PotentiallyUnresolvedExpression
): expression is ConditionalExpression =>
  expression.type === "conditionalExpression";

const isCondition = (
  expression: Expression | PartialExpression
): expression is ConditionExpression =>
  expression.type === "relationalExpression" ||
  expression.type === "booleanCondition";

const booleanConditionIsIncomplete = (
  condition: ConditionExpression
): boolean =>
  condition.expressions.length < 2 ||
  condition.expressions.some((e) => conditionIsIncomplete(e));

const isBooleanCondition = (
  expression: Expression
): expression is BooleanCondition => expression.type === "booleanCondition";

const isRelationalExpression = (
  expression: Expression
): expression is RelationalExpression =>
  expression.type === "relationalExpression";

const conditionIsIncomplete = (
  condition: Expression
): condition is ConditionExpression =>
  (isBooleanCondition(condition) && booleanConditionIsIncomplete(condition)) ||
  (isRelationalExpression(condition) && condition.expressions.length < 2);

const firstIncompleteExpression = (
  expression: Expression
): Expression | undefined => {
  if (isCondition(expression)) {
    const { expressions = [] } = expression;
    if (expressions.length === 0) {
      return expression;
    } else if (expressions.length === 1) {
      if (conditionIsIncomplete(expressions[0])) {
        return firstIncompleteExpression(expressions[0]);
      } else {
        return expression;
      }
    } else if (expressions.length === 2) {
      if (conditionIsIncomplete(expressions[1])) {
        return expressions[1];
      }
    }
  } else if (isConditionalExpression(expression)) {
    const { condition, truthyExpression, falsyExpression } = expression;
    if (expressionIsIncomplete(condition)) {
      return firstIncompleteExpression(condition);
    }
    // else if (expressionIsIncomplete(truthyExpression)) {
    // }
  }
};

const expressionIsIncomplete = (expression: Expression): boolean => {
  if (isConditionalExpression(expression)) {
    return (
      expressionIsIncomplete(expression.condition) ||
      expressionIsIncomplete(expression.truthyExpression) ||
      expressionIsIncomplete(expression.falsyExpression)
    );
  } else if (isRelationalExpression(expression)) {
    return (
      expression.op !== undefined ||
      expression.expressions.length < 2 ||
      expression.expressions.some((e) => expressionIsIncomplete(e))
    );
  }
  return false;
};

type PotentiallyUnresolvedExpression = Expression | PartialExpression;

const addExpression = (
  targetExpression: Expression,
  subExpression: PartialExpression | Expression
) => {
  console.log("add expression", {
    targetExpression,
    subExpression,
  });
};

//TODO still does not fully support deeply nested expressions
class ColumnExpression {
  #expression: PotentiallyUnresolvedExpression | undefined;
  #callStack: CallExpression[] = [];

  setCondition(booleanOperator?: "and" | "or") {
    if (this.#expression === undefined) {
      this.addExpression(new ConditionalExpressionImpl(booleanOperator));
    } else if (isConditionalExpression(this.#expression)) {
      const condition = booleanOperator
        ? new BooleanConditionImp(booleanOperator)
        : {
            type: "relationalExpression",
            op: undefined,
            expressions: [],
          };
      // @ts-ignore
      this.addExpression(condition);
    } else {
      console.error("setCondition called unexpectedly");
    }
  }

  private addExpression(expression: PartialExpression) {
    if (this.#callStack.length > 0) {
      const currentCallExpression = this.#callStack.at(-1);
      currentCallExpression?.arguments.push(expression as Expression);
    } else if (this.#expression === undefined) {
      this.#expression = expression;
    } else if (isArithmeticExpression(this.#expression)) {
      this.#expression.expressions.push(expression as Expression);
    } else if (isConditionalExpression(this.#expression)) {
      const { condition, truthyExpression } = this.#expression;
      if (conditionIsIncomplete(condition)) {
        const targetExpression = firstIncompleteExpression(
          condition
        ) as ConditionExpression;
        if (targetExpression) {
          targetExpression.expressions.push(expression as Expression);
        } else {
          console.error("no target expression found");
        }
      } else if (truthyExpression === undefined) {
        this.#expression.truthyExpression = expression as Expression;
      } else if (this.#expression.falsyExpression === undefined) {
        this.#expression.falsyExpression = expression as Expression;
      } else if (expressionIsIncomplete(this.#expression.falsyExpression)) {
        console.log(`falsy expression is incomplete`);
        addExpression(this.#expression.falsyExpression, expression);
        // const targetExpression = firstIncompleteExpression(
        //   this.#expression.falsyExpression
        // ) as ConditionExpression;
        // if (targetExpression) {
        //   targetExpression.expressions.push(expression as Expression);
        // } else {
        //   console.error("no target expression found");
        // }
      }
    }
  }

  setFunction(value: string) {
    const callExpression: CallExpression = {
      arguments: [],
      functionName: value,
      type: "callExpression",
    };
    this.addExpression(callExpression);
    this.#callStack.push(callExpression);
  }

  setColumn(columnName: string) {
    const columnExpression: ColExpression = {
      type: "colExpression",
      column: columnName,
    };
    this.addExpression(columnExpression);
  }

  setOp(value: string) {
    const op = value as arithmeticOp;
    const expression = this.#expression as Expression;
    if (
      expression?.type === "colExpression" ||
      expression?.type === "numberLiteralExpression" ||
      expression?.type === "stringLiteralExpression"
    ) {
      this.#expression = {
        op,
        type: "arithmeticExpression",
        expressions: [this.#expression],
      } as unknown as ArithmeticExpression;
    }
    //  else {
    //   const targetExpression = firstIncompleteExpression(this.#expression);
    //   if (targetExpression) {
    //     targetExpression.op = op;
    //   }
    // }
  }

  setRelationalOperator(value: string) {
    const op = value as relationalOp;
    if (this.#expression && isConditionalExpression(this.#expression)) {
      const targetExpression = firstIncompleteExpression(
        this.#expression.condition
      ) as ConditionExpression;
      if (targetExpression) {
        targetExpression.op = op;
      } else {
        console.error(`no target expression found (op = ${value})`);
      }
    }
  }

  private getTypeLiteralType(type: string | number | boolean) {
    if (typeof type === "boolean") {
      return "booleanLiteralExpression";
    } else if (typeof type === "number") {
      return "numberLiteralExpression";
    } else {
      return "stringLiteralExpression";
    }
  }

  setValue(value: string | number | boolean) {
    const literalExpression: Expression = {
      type: this.getTypeLiteralType(value),
      value,
    };
    if (this.#expression === undefined) {
      this.#expression = literalExpression;
    } else if (isArithmeticExpression(this.#expression)) {
      this.#expression.expressions.push(literalExpression);
    } else if (isCallExpression(this.#expression)) {
      // TODO this might not be correct if call arguments include nested expression(s)
      this.#expression.arguments.push(literalExpression);
    } else if (isConditionalExpression(this.#expression)) {
      const { condition, truthyExpression } = this.#expression;
      if (conditionIsIncomplete(condition)) {
        const targetExpression = firstIncompleteExpression(
          condition
        ) as ConditionExpression;
        if (targetExpression) {
          targetExpression.expressions.push(literalExpression);
        } else {
          console.error(`no target expression found (op = ${value})`);
        }
      } else if (truthyExpression === undefined) {
        this.#expression.truthyExpression = literalExpression;
      } else {
        this.#expression.falsyExpression = literalExpression;
      }
    }
  }

  closeBrace() {
    this.#callStack.pop();
  }

  get expression() {
    return this.#expression;
  }
}

export const walkTree = (tree: Tree, source: string) => {
  const columnExpression = new ColumnExpression();
  const cursor = tree.cursor();
  do {
    const { name, from, to } = cursor;
    switch (name) {
      case "AndCondition":
        columnExpression.setCondition("and");
        break;

      case "OrCondition":
        columnExpression.setCondition("or");
        break;

      case "RelationalExpression":
        columnExpression.setCondition();
        break;

      case "Column":
        {
          const columnName = source.substring(from, to);
          columnExpression.setColumn(columnName);
        }
        break;

      case "Function":
        {
          const functionName = source.substring(from, to);
          columnExpression.setFunction(functionName);
        }
        break;

      case "Times":
      case "Divide":
      case "Plus":
      case "Minus":
        {
          const op = source.substring(from, to);
          columnExpression.setOp(op);
        }
        break;

      case "RelationalOperator":
        {
          const op = source.substring(from, to);
          columnExpression.setRelationalOperator(op);
        }
        break;

      case "False":
      case "True":
        {
          const value = source.substring(from, to);
          columnExpression.setValue(value === "true" ? true : false);
        }
        break;

      case "String":
        columnExpression.setValue(source.substring(from + 1, to - 1));
        break;

      case "Number":
        columnExpression.setValue(parseFloat(source.substring(from, to)));
        break;

      case "CloseBrace":
        columnExpression.closeBrace();
        break;

      default:
    }
  } while (cursor.next());

  return columnExpression.expression;
};
