import { Completion } from "@finos/vuu-codemirror";
import { useTypeaheadSuggestions } from "@finos/vuu-data";
import {
  ColumnExpressionOperator,
  ColumnExpressionSuggestionType,
  IExpressionSuggestionProvider,
} from "@finos/vuu-datagrid-extras";
import { ColumnDescriptor } from "@finos/vuu-datagrid-types";
import { TypeaheadParams, VuuTable } from "@finos/vuu-protocol-types";
import { isNumericColumn, isTextColumn } from "@finos/vuu-utils";
import { useCallback, useRef } from "react";
import {
  ColumnFunctionDescriptor,
  columnFunctionDescriptors,
} from "./column-function-descriptors";
import { functionDocInfo } from "./functionDocInfo";

const NO_OPERATORS = [] as Completion[];

const withApplySpace = (suggestions: Completion[]): Completion[] =>
  suggestions.map((suggestion) => ({
    ...suggestion,
    apply: (suggestion.apply ?? suggestion.label) + " ",
  }));

type ColumnOptions = {
  functionName?: string;
  operator?: ColumnExpressionOperator;
  prefix?: string;
};

const getValidColumns = (
  columns: ColumnDescriptor[],
  { functionName, operator }: ColumnOptions
) => {
  if (operator) {
    return columns.filter(isNumericColumn);
  } else if (functionName) {
    const fn = columnFunctionDescriptors.find((f) => f.name === functionName);
    if (fn) {
      switch (fn.accepts) {
        case "string":
          return columns.filter(isTextColumn);
        case "number":
          return columns.filter(isNumericColumn);
        default:
          return columns;
      }
    }
  }
  return columns;
};

const getColumns = (columns: ColumnDescriptor[], options: ColumnOptions) => {
  const validColumns = getValidColumns(columns, options);
  return validColumns.map((column) => {
    const label = column.label ?? column.name;
    return {
      apply: options.prefix ? `${options.prefix}${label}` : label,
      label,
      boost: 5,
      type: "column",
      expressionType: column.serverDataType,
    };
  });
};

// prettier-ignore
const operators = [
  { apply: "* ", boost: 2, label: "*", type: "operator" },
  { apply: "/ ", boost: 2, label: "/", type: "operator" },
  { apply: "+ ", boost: 2, label: "+", type: "operator" },
  { apply: "- ", boost: 2, label: "-", type: "operator" },
];

const getOperators = (column?: ColumnDescriptor) => {
  if (column === undefined || isNumericColumn(column)) {
    return operators;
  } else {
    return NO_OPERATORS;
  }
};

// prettier-ignore
const conditionOperators = [
  { apply: "= ", boost: 2, label: "=", type: "operator" },
  { apply: "!= ", boost: 2, label: "!=", type: "operator" },
  { apply: "> ", boost: 2, label: ">", type: "operator" },
  { apply: "< ", boost: 2, label: "<", type: "operator" },
  { apply: ">= ", boost: 2, label: ">=", type: "operator" },
  { apply: "<= ", boost: 2, label: "<=", type: "operator" },
];

const getConditionOperators = (column?: ColumnDescriptor) => {
  console.log(`get condition operator for ${column?.name}`);
  // if (column === undefined || isNumericColumn(column)) {
  return conditionOperators;
  // } else {
  //   return NO_OPERATORS;
  // }
};

const toFunctionCompletion = (
  functionDescriptor: ColumnFunctionDescriptor
) => ({
  apply: `${functionDescriptor.name}( `,
  boost: 2,
  expressionType: functionDescriptor.type,
  info: () => functionDocInfo(functionDescriptor),
  label: functionDescriptor.name,
  type: "function",
});

const getAcceptedTypes = (fn?: ColumnFunctionDescriptor) => {
  if (fn) {
    if (typeof fn.accepts === "string") {
      return fn.accepts;
    } else if (Array.isArray(fn.accepts)) {
      if (fn.accepts.every((s) => s === "string")) {
        return "string";
      } else {
        return "any";
      }
    }
  }
  return "any";
};

const functions: Completion[] =
  columnFunctionDescriptors.map(toFunctionCompletion);

const getFunctions = ({ functionName }: ColumnOptions) => {
  if (functionName) {
    const fn = columnFunctionDescriptors.find((f) => f.name === functionName);
    const acceptedTypes = getAcceptedTypes(fn);
    if (fn) {
      switch (acceptedTypes) {
        case "string":
          return columnFunctionDescriptors
            .filter((f) => f.type === "string" || f.type === "variable")
            .map(toFunctionCompletion);
        case "number":
          return columnFunctionDescriptors
            .filter((f) => f.type === "number" || f.type === "variable")
            .map(toFunctionCompletion);
        default:
      }
    }
  }
  return functions;
};

export interface SuggestionProviderHookProps {
  columns: ColumnDescriptor[];
  table: VuuTable;
}

const NONE = {};

export const useColumnExpressionSuggestionProvider = ({
  columns,
  table,
}: SuggestionProviderHookProps): IExpressionSuggestionProvider => {
  const findColumn = useCallback(
    (name?: string) =>
      name ? columns.find((col) => col.name === name) : undefined,
    [columns]
  );

  const latestSuggestionsRef = useRef<Completion[]>();
  const getSuggestions: IExpressionSuggestionProvider["getSuggestions"] =
    useCallback(
      async (suggestionType, options = NONE): Promise<Completion[]> => {
        const { columnName, functionName, prefix } = options;

        switch (suggestionType) {
          case "expression": {
            const suggestions = await withApplySpace(
              getColumns(columns, { functionName, prefix })
            ).concat(getFunctions(options));
            return (latestSuggestionsRef.current = suggestions);
          }
          case "column": {
            const suggestions = await getColumns(columns, options);
            return (latestSuggestionsRef.current = withApplySpace(suggestions));
          }
          case "operator": {
            const suggestions = await getOperators(findColumn(columnName));
            return (latestSuggestionsRef.current = withApplySpace(suggestions));
          }
          case "condition-operator": {
            const suggestions = await getConditionOperators(
              findColumn(columnName)
            );
            return (latestSuggestionsRef.current = withApplySpace(suggestions));
          }
        }

        return [];
      },
      [columns, findColumn]
    );

  const isPartialMatch = useCallback(
    async (
      valueType: ColumnExpressionSuggestionType,
      columnName?: string,
      pattern?: string
    ) => {
      const { current: latestSuggestions } = latestSuggestionsRef;
      let maybe = false;
      const suggestions =
        latestSuggestions || (await getSuggestions(valueType, { columnName }));
      if (pattern && suggestions) {
        for (const option of suggestions) {
          if (option.label === pattern) {
            return false;
          } else if (option.label.startsWith(pattern)) {
            maybe = true;
          }
        }
      }
      return maybe;
    },
    [getSuggestions]
  );

  return {
    getSuggestions,
    isPartialMatch,
  };
};
