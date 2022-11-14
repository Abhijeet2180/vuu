import { Tree } from "@lezer/common";

class Filter {
  expression?: OrExpression;
  get lastExpression(): AndExpression | undefined {
    if (this.expression) {
      const { filters: f } = this.expression;
      return f[f.length - 1];
    }
  }
  get lastFilterClause(): FilterClause | undefined {
    const andExpression = this.lastExpression;
    if (andExpression) {
      const { filters: f } = andExpression;
      return f[f.length - 1];
    }
  }
  toJson() {
    return this.expression?.toJson();
  }
}
class OrExpression {
  add(expression: AndExpression) {
    this.filters.push(expression);
  }
  filters: any[] = [];
  toJson() {
    if (this.filters.length === 1) {
      return this.filters[0].toJson();
    } else if (this.filters.length > 1) {
      return {
        type: "or",
        filters: this.filters.map((f) => f.toJson()),
      };
    }
  }
}
class AndExpression {
  add(expression: FilterClause) {
    this.filters.push(expression);
  }
  filters: FilterClause[] = [];
  toJson() {
    if (this.filters.length === 1) {
      return this.filters[0].toJson();
    } else if (this.filters.length > 1) {
      return {
        type: "and",
        filters: this.filters.map((f) => f.toJson()),
      };
    }
  }
}
class ColumnValueExpression {
  column?: Column;
  operator?: string;
  value?: string | number;
  toJson() {
    return {
      column: this.column?.name,
      operator: this.operator,
      value: this.value,
    };
  }
}
class ColumnSetExpression {
  column?: Column;
  operator?: "in";
  values: (string | number)[] = [];
  toJson() {
    return {
      column: this.column?.name,
      operator: "in",
      values: this.values,
    };
  }
}

type FilterClause = ColumnValueExpression | ColumnSetExpression;

class Column {
  constructor(public name: string, private from: number, private to: number) {}
}

const peek = <T extends unknown>(arr: unknown[]) => arr[arr.length - 1] as T;

export const walkTree = (tree: Tree, source: string) => {
  const queue: unknown[] = [];
  let cursor = tree.cursor();
  do {
    const { name, from, to } = cursor;
    console.log(
      `Node ${name} [${from}:${to}] '${source.substring(
        cursor.from,
        cursor.to
      )}'`
    );

    switch (name) {
      case "Filter":
        queue.push(new Filter());
        break;
      case "OrExpression":
        peek<Filter>(queue).expression = new OrExpression();
        break;
      case "AndExpression":
        peek<Filter>(queue).expression?.add(new AndExpression());
        break;
      case "And":
      case "In":
      case "LBrack":
      case "RBrack":
      case "Quote":
      case "Comma":
      case "Value":
      case "Values":
      case "FilterClause":
        // nothing to do
        break;
      case "ColumnValueExpression":
        {
          const lastExpression = peek<Filter>(queue).lastExpression;
          if (lastExpression) {
            lastExpression.add(new ColumnValueExpression());
          } else {
            throw Error("boo");
          }
        }
        break;

      case "ColumnSetExpression":
        const lastExpression = peek<Filter>(queue).lastExpression;
        if (lastExpression) {
          lastExpression.add(new ColumnSetExpression());
        } else {
          throw Error("hoo");
        }
        break;

      case "Column":
        {
          const lastFilterClause = peek<Filter>(queue).lastFilterClause;
          if (lastFilterClause) {
            const value = source.substring(from, to);
            lastFilterClause.column = new Column(value, from, to);
            cursor.next();
          } else {
            throw Error("wah");
          }
        }
        break;

      case "Operator":
        {
          const lastFilterClause = peek<Filter>(queue).lastFilterClause;
          if (lastFilterClause) {
            const value = source.substring(from, to);
            lastFilterClause.operator = value;
            cursor.next();
          } else {
            throw Error("wah");
          }
        }
        break;

      case "String":
        // skip the open and close quote
        cursor.next();
        cursor.next();
        cursor.next();
      // fall thru
      case "Int":
        {
          const lastFilterClause = peek<Filter>(queue).lastFilterClause;
          if (lastFilterClause) {
            const value = source.substring(from, to);
            const typedValue = name === "Int" ? parseInt(value, 10) : value;
            if (lastFilterClause instanceof ColumnSetExpression) {
              lastFilterClause.values.push(typedValue);
            } else {
              lastFilterClause.value = typedValue;
            }
          } else {
            throw Error("wah");
          }
        }
        break;

      case "Or":
        {
          // lets p0retend for now that Or clauses only occur at te top
          peek<Filter>(queue).expression?.add(new AndExpression());
        }
        break;

      case "AsClause":
        {
          // peek<Filter>(queue).expression?.add(new AndExpression());
          debugger;
        }
        break;

      default:
        console.log(`%cwhat do we do with a ${name}`, "color:red");
    }
  } while (cursor.next());

  return queue[0] as Filter;
};