import type {
  VocabularyTopicInput,
  VocabularyWordInput,
} from "./schemas/vocabulary.schema.ts";

export type CsvCell = string | number | boolean | null | undefined;

export type CsvSerializeOptions = {
  includeBom?: boolean;
  protectFormulas?: boolean;
};

export type VocabularyWordCsvInput = VocabularyWordInput & {
  audioUrl: string;
};

export const VOCABULARY_TOPIC_CSV_COLUMNS = [
  "title",
  "description",
  "languageCode",
  "icon",
  "accent",
  "order",
  "isVisible",
] as const;

export const VOCABULARY_WORD_CSV_COLUMNS = [
  "term",
  "meaning",
  "pronunciation",
  "example",
  "exampleMeaning",
  "imageUrl",
  "audioUrl",
  "order",
  "isVisible",
] as const;

export class CsvError extends Error {
  readonly row: number;
  readonly column: number;
  readonly columnName?: string;

  constructor(
    message: string,
    location: { row: number; column: number; columnName?: string },
  ) {
    const columnLabel = location.columnName
      ? `${location.column} (${location.columnName})`
      : String(location.column);
    super(`${message} (dòng ${location.row}, cột ${columnLabel})`);
    this.name = "CsvError";
    this.row = location.row;
    this.column = location.column;
    this.columnName = location.columnName;
  }
}

/**
 * Parses RFC 4180 records. Newlines inside quoted fields are normalized to `\n`.
 * File-size and record-count limits intentionally belong to the caller.
 */
export function parseCsv(input: string): string[][] {
  const source = input.startsWith("\uFEFF") ? input.slice(1) : input;
  if (source.length === 0) return [];

  const rows: string[][] = [];
  let record: string[] = [];
  let field = "";
  let state: "unquoted" | "quoted" | "after-quote" = "unquoted";
  let recordTouched = false;
  let index = 0;
  let row = 1;
  let column = 1;

  const finishField = () => {
    record.push(field);
    field = "";
    state = "unquoted";
  };

  const finishRecord = () => {
    rows.push(record);
    record = [];
    recordTouched = false;
  };

  const consumeNewline = () => {
    if (source[index] === "\r" && source[index + 1] === "\n") {
      index += 2;
    } else {
      index += 1;
    }
    row += 1;
    column = 1;
  };

  while (index < source.length) {
    const character = source[index];
    const isNewline = character === "\r" || character === "\n";

    if (state === "quoted") {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          column += 2;
        } else {
          state = "after-quote";
          index += 1;
          column += 1;
        }
      } else if (isNewline) {
        field += "\n";
        consumeNewline();
      } else {
        field += character;
        index += 1;
        column += 1;
      }
      continue;
    }

    if (state === "after-quote") {
      if (character === ",") {
        finishField();
        recordTouched = true;
        index += 1;
        column += 1;
      } else if (isNewline) {
        finishField();
        finishRecord();
        consumeNewline();
      } else {
        throw new CsvError("Ký tự không hợp lệ sau dấu ngoặc kép đóng", {
          row,
          column,
        });
      }
      continue;
    }

    if (character === ",") {
      finishField();
      recordTouched = true;
      index += 1;
      column += 1;
    } else if (character === '"') {
      if (field.length > 0) {
        throw new CsvError("Dấu ngoặc kép phải nằm ở đầu một trường", {
          row,
          column,
        });
      }
      state = "quoted";
      recordTouched = true;
      index += 1;
      column += 1;
    } else if (isNewline) {
      finishField();
      finishRecord();
      consumeNewline();
    } else {
      field += character;
      recordTouched = true;
      index += 1;
      column += 1;
    }
  }

  if (state === "quoted") {
    throw new CsvError("Trường có dấu ngoặc kép chưa được đóng", { row, column });
  }

  if (recordTouched || record.length > 0 || field.length > 0 || state === "after-quote") {
    finishField();
    finishRecord();
  }

  return rows;
}

const FORMULA_PREFIX = /^[\u0009\u000a\u000d ]*[=+\-@]/u;

export function protectCsvFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function serializeCell(value: CsvCell, protectFormulas: boolean): string {
  let text = value == null ? "" : String(value);
  if (protectFormulas && typeof value === "string") {
    text = protectCsvFormula(text);
  }
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Serializes RFC 4180 records using CRLF. Formula protection is enabled by default. */
export function serializeCsv(
  rows: readonly (readonly CsvCell[])[],
  options: CsvSerializeOptions = {},
): string {
  const { includeBom = false, protectFormulas = true } = options;
  const body = rows
    .map((record) => record.map((cell) => serializeCell(cell, protectFormulas)).join(","))
    .join("\r\n");
  return `${includeBom ? "\uFEFF" : ""}${body}${rows.length > 0 ? "\r\n" : ""}`;
}

type TopicColumn = (typeof VOCABULARY_TOPIC_CSV_COLUMNS)[number];
type WordColumn = (typeof VOCABULARY_WORD_CSV_COLUMNS)[number];

type ImportRow<Column extends string> = {
  values: string[];
  rowNumber: number;
  headerIndexes: ReadonlyMap<Column, number>;
  expectedColumns: readonly Column[];
};

function csvLocation<Column extends string>(
  row: ImportRow<Column>,
  columnName: Column,
): { row: number; column: number; columnName: string } {
  const actualIndex = row.headerIndexes.get(columnName);
  const expectedIndex = row.expectedColumns.indexOf(columnName);
  return {
    row: row.rowNumber,
    column: (actualIndex ?? expectedIndex) + 1,
    columnName,
  };
}

function readCell<Column extends string>(row: ImportRow<Column>, columnName: Column): string {
  const index = row.headerIndexes.get(columnName);
  return index === undefined ? "" : (row.values[index] ?? "");
}

function parseText<Column extends string>(
  row: ImportRow<Column>,
  columnName: Column,
  options: { required?: boolean; defaultValue?: string; maxLength: number },
): string {
  const value = readCell(row, columnName).trim();
  if (value.length === 0) {
    if (options.required) {
      throw new CsvError("Giá trị bắt buộc đang để trống", csvLocation(row, columnName));
    }
    return options.defaultValue ?? "";
  }
  if (value.length > options.maxLength) {
    throw new CsvError(
      `Giá trị vượt quá ${options.maxLength} ký tự`,
      csvLocation(row, columnName),
    );
  }
  return value;
}

function parseEnum<Column extends string, Value extends string>(
  row: ImportRow<Column>,
  columnName: Column,
  allowedValues: readonly Value[],
  defaultValue: Value,
): Value {
  const value = readCell(row, columnName).trim();
  if (value.length === 0) return defaultValue;
  if (!allowedValues.includes(value as Value)) {
    throw new CsvError(
      `Giá trị phải là một trong: ${allowedValues.join(", ")}`,
      csvLocation(row, columnName),
    );
  }
  return value as Value;
}

function parseOrder<Column extends string>(row: ImportRow<Column>, columnName: Column): number {
  const value = readCell(row, columnName).trim();
  if (value.length === 0) return 0;
  if (!/^\d+$/u.test(value)) {
    throw new CsvError("Thứ tự phải là số nguyên không âm", csvLocation(row, columnName));
  }
  const order = Number(value);
  if (!Number.isSafeInteger(order) || order > 10_000) {
    throw new CsvError("Thứ tự phải nằm trong khoảng 0 đến 10000", csvLocation(row, columnName));
  }
  return order;
}

function parseBoolean<Column extends string>(
  row: ImportRow<Column>,
  columnName: Column,
): boolean {
  const value = readCell(row, columnName).trim().toLowerCase();
  if (value.length === 0) return true;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new CsvError("Giá trị boolean phải là true, false, 1 hoặc 0", csvLocation(row, columnName));
}

function parseOptionalHttpUrl<Column extends string>(
  row: ImportRow<Column>,
  columnName: Column,
): string {
  const value = readCell(row, columnName).trim();
  if (value.length === 0) return "";
  if (value.length > 2_000) {
    throw new CsvError("URL vượt quá 2000 ký tự", csvLocation(row, columnName));
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
  } catch {
    throw new CsvError("URL phải là địa chỉ HTTP hoặc HTTPS hợp lệ", csvLocation(row, columnName));
  }
  return value;
}

function prepareImportRows<Column extends string>(
  csv: string,
  expectedColumns: readonly Column[],
  requiredColumns: readonly Column[],
): ImportRow<Column>[] {
  const records = parseCsv(csv);
  if (records.length === 0) {
    throw new CsvError("Tệp CSV không có hàng tiêu đề", { row: 1, column: 1 });
  }

  const headers = records[0].map((header) => header.trim());
  const headerIndexes = new Map<Column, number>();
  const knownColumns = new Set<string>(expectedColumns);

  headers.forEach((header, index) => {
    if (!knownColumns.has(header)) {
      throw new CsvError(
        header.length === 0 ? "Tên cột không được để trống" : `Cột không được hỗ trợ: ${header}`,
        { row: 1, column: index + 1, columnName: header || undefined },
      );
    }
    if (headerIndexes.has(header as Column)) {
      throw new CsvError(`Cột bị lặp: ${header}`, {
        row: 1,
        column: index + 1,
        columnName: header,
      });
    }
    headerIndexes.set(header as Column, index);
  });

  for (const requiredColumn of requiredColumns) {
    if (!headerIndexes.has(requiredColumn)) {
      throw new CsvError(`Thiếu cột bắt buộc: ${requiredColumn}`, {
        row: 1,
        column: expectedColumns.indexOf(requiredColumn) + 1,
        columnName: requiredColumn,
      });
    }
  }

  const importRows: ImportRow<Column>[] = [];
  records.slice(1).forEach((values, index) => {
    if (values.every((value) => value.trim().length === 0)) return;
    if (values.length > headers.length) {
      throw new CsvError("Hàng có nhiều trường hơn hàng tiêu đề", {
        row: index + 2,
        column: headers.length + 1,
      });
    }
    importRows.push({
      values,
      rowNumber: index + 2,
      headerIndexes,
      expectedColumns,
    });
  });
  return importRows;
}

export function parseVocabularyTopicsCsv(csv: string): VocabularyTopicInput[] {
  const rows = prepareImportRows<TopicColumn>(
    csv,
    VOCABULARY_TOPIC_CSV_COLUMNS,
    ["title"],
  );
  return rows.map((row) => ({
    title: parseText(row, "title", { required: true, maxLength: 120 }),
    description: parseText(row, "description", { maxLength: 500 }),
    languageCode: parseEnum(row, "languageCode", ["en", "ja", "zh"], "en"),
    icon: parseText(row, "icon", { defaultValue: "📚", maxLength: 16 }),
    accent: parseEnum(
      row,
      "accent",
      ["emerald", "blue", "violet", "amber", "rose", "cyan"],
      "emerald",
    ),
    order: parseOrder(row, "order"),
    isVisible: parseBoolean(row, "isVisible"),
  }));
}

export function serializeVocabularyTopicsCsv(
  topics: readonly Readonly<VocabularyTopicInput>[],
  options: CsvSerializeOptions = {},
): string {
  const rows: CsvCell[][] = [
    [...VOCABULARY_TOPIC_CSV_COLUMNS],
    ...topics.map((topic) => [
      topic.title,
      topic.description,
      topic.languageCode,
      topic.icon,
      topic.accent,
      topic.order,
      topic.isVisible,
    ]),
  ];
  return serializeCsv(rows, { ...options, includeBom: options.includeBom ?? true });
}

export function parseVocabularyWordsCsv(csv: string): VocabularyWordCsvInput[] {
  const rows = prepareImportRows<WordColumn>(
    csv,
    VOCABULARY_WORD_CSV_COLUMNS,
    ["term", "meaning"],
  );
  return rows.map((row) => ({
    term: parseText(row, "term", { required: true, maxLength: 120 }),
    meaning: parseText(row, "meaning", { required: true, maxLength: 240 }),
    pronunciation: parseText(row, "pronunciation", { maxLength: 160 }),
    example: parseText(row, "example", { maxLength: 500 }),
    exampleMeaning: parseText(row, "exampleMeaning", { maxLength: 500 }),
    imageUrl: parseOptionalHttpUrl(row, "imageUrl"),
    audioUrl: parseOptionalHttpUrl(row, "audioUrl"),
    order: parseOrder(row, "order"),
    isVisible: parseBoolean(row, "isVisible"),
  }));
}

export function serializeVocabularyWordsCsv(
  words: readonly Readonly<VocabularyWordCsvInput>[],
  options: CsvSerializeOptions = {},
): string {
  const rows: CsvCell[][] = [
    [...VOCABULARY_WORD_CSV_COLUMNS],
    ...words.map((word) => [
      word.term,
      word.meaning,
      word.pronunciation,
      word.example,
      word.exampleMeaning,
      word.imageUrl,
      word.audioUrl,
      word.order,
      word.isVisible,
    ]),
  ];
  return serializeCsv(rows, { ...options, includeBom: options.includeBom ?? true });
}
