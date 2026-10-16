// Small RFC-style CSV reader: quoted commas, escaped quotes, CRLF and multiline notes.
export function parseCsv(text: string): Record<string, string>[] {
  if (Buffer.byteLength(text, "utf8") > 1_000_000)
    throw new Error("Choose a CSV smaller than 1 MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error("Check the quotes in your CSV.");
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
      closed = false;
    } else {
      if (closed && char.trim())
        throw new Error("Check the text after a quoted CSV field.");
      if (!closed) cell += char;
    }
  }
  if (quoted)
    throw new Error("A quoted CSV field is missing its closing quote.");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("Include a header row and at least one person.");
  if (rows.length > 501) throw new Error("Import up to 500 people at a time.");
  const headers = rows.shift()!.map((v) => v.trim());
  if (new Set(headers).size !== headers.length || headers.some((v) => !v))
    throw new Error("Use unique, nonempty column names.");
  if (!headers.includes("name") || !headers.includes("email"))
    throw new Error("Your CSV needs name and email columns.");
  return rows.map((cells, index) => {
    if (cells.length !== headers.length)
      throw new Error(`Row ${index + 2} has a different number of columns.`);
    return Object.fromEntries(
      headers.map((header, i) => [header, cells[i].trim()]),
    );
  });
}
