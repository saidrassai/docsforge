// Minimal, dependency-free YAML subset parser.
// Supports nested maps, sequences (including sequences of maps), flow arrays,
// quoted scalars, booleans, null, numbers, and comments. It intentionally does
// not implement anchors, tags, multi-document streams, or block scalars.

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === "\\" && quote === '"') {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function splitFlow(value) {
  const parts = [];
  let current = "";
  let quote = null;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"') {
        current += value[++i] ?? "";
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() || parts.length > 0) parts.push(current.trim());
  return parts;
}

function parseScalar(raw) {
  let value = raw.trim();
  if (value === "") return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0];
    value = value.slice(1, -1);
    if (quote === '"') {
      value = value
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return value;
  }
  if (value === "null" || value === "~" || value === "Null" || value === "NULL") return null;
  if (/^(true|True|TRUE)$/.test(value)) return true;
  if (/^(false|False|FALSE)$/.test(value)) return false;
  if (/^[-+]?\d+$/.test(value)) {
    const n = Number(value);
    if (Number.isSafeInteger(n)) return n;
  }
  if (/^[-+]?\d*\.\d+$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlow(inner).map((item) => parseScalar(item));
  }
  if (value.startsWith("{") && value.endsWith("}")) {
    const inner = value.slice(1, -1).trim();
    const obj = {};
    if (!inner) return obj;
    for (const part of splitFlow(inner)) {
      const idx = part.indexOf(":");
      if (idx === -1) continue;
      obj[parseScalar(part.slice(0, idx))] = parseScalar(part.slice(idx + 1));
    }
    return obj;
  }
  return value;
}

function splitKeyValue(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ":" && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  return null;
}

function tokenize(source) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const tokens = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = stripComment(lines[i]).replace(/\s+$/, "");
    if (!raw.trim()) continue;
    const indentMatch = raw.match(/^ */);
    const indent = indentMatch ? indentMatch[0].length : 0;
    if (raw.trim() === "---" || raw.trim() === "...") continue;
    tokens.push({ indent, text: raw.slice(indent), line: i + 1 });
  }
  return tokens;
}

function parseBlock(tokens, index, indent) {
  if (index >= tokens.length || tokens[index].indent < indent) {
    return [null, index];
  }

  const first = tokens[index];
  if (first.text === "-" || first.text.startsWith("- ")) {
    const arr = [];
    while (index < tokens.length) {
      const tok = tokens[index];
      if (tok.indent !== indent || !(tok.text === "-" || tok.text.startsWith("- "))) break;
      const rest = tok.text === "-" ? "" : tok.text.slice(2).trim();
      index++;
      if (!rest) {
        const [value, next] = parseBlock(tokens, index, indent + 1);
        arr.push(value);
        index = next;
        continue;
      }
      const kv = splitKeyValue(rest);
      if (kv) {
        const obj = {};
        const [key, valueText] = kv;
        if (valueText) {
          obj[key] = parseScalar(valueText);
        } else if (index < tokens.length && tokens[index].indent > indent) {
          const [value, next] = parseBlock(tokens, index, tokens[index].indent);
          obj[key] = value;
          index = next;
        } else {
          obj[key] = null;
        }
        // Continue a map item with additional keys at deeper indentation.
        if (index < tokens.length && tokens[index].indent > indent && !tokens[index].text.startsWith("- ")) {
          const [more, next] = parseBlock(tokens, index, tokens[index].indent);
          if (more && typeof more === "object" && !Array.isArray(more)) {
            Object.assign(obj, more);
          }
          index = next;
        }
        arr.push(obj);
        continue;
      }
      arr.push(parseScalar(rest));
      if (index < tokens.length && tokens[index].indent > indent) {
        // A scalar item cannot have children; skip any malformed continuation.
        const [, next] = parseBlock(tokens, index, tokens[index].indent);
        index = next;
      }
    }
    return [arr, index];
  }

  const obj = {};
  while (index < tokens.length) {
    const tok = tokens[index];
    if (tok.indent !== indent) break;
    if (tok.text.startsWith("- ")) break;
    const kv = splitKeyValue(tok.text);
    if (!kv) {
      index++;
      continue;
    }
    const [key, valueText] = kv;
    index++;
    if (valueText !== "") {
      obj[key] = parseScalar(valueText);
      continue;
    }
    if (index < tokens.length && tokens[index].indent > indent) {
      const [value, next] = parseBlock(tokens, index, tokens[index].indent);
      obj[key] = value;
      index = next;
    } else {
      obj[key] = null;
    }
  }
  return [obj, index];
}

export function parseYaml(source) {
  const trimmed = String(source).trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  const tokens = tokenize(source);
  if (tokens.length === 0) return {};
  const [value, index] = parseBlock(tokens, 0, tokens[0].indent);
  if (index < tokens.length) {
    const err = new Error(`Unexpected YAML content at line ${tokens[index].line}`);
    err.line = tokens[index].line;
    throw err;
  }
  return value;
}

function quote(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const text = String(value);
  if (/^[A-Za-z0-9_./@-]+$/.test(text) && !/^(true|false|null|~)$/i.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

export function stringifyYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (value === null || typeof value !== "object") return `${pad}${quote(value)}\n`;
  if (Array.isArray(value)) {
    let out = "";
    for (const item of value) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const entries = Object.entries(item);
        if (entries.length === 0) {
          out += `${pad}- {}\n`;
          continue;
        }
        const [firstKey, firstValue] = entries[0];
        if (firstValue !== null && typeof firstValue === "object") {
          out += `${pad}- ${firstKey}:\n${stringifyYaml(firstValue, indent + 4)}`;
        } else {
          out += `${pad}- ${firstKey}: ${quote(firstValue)}\n`;
        }
        for (const [key, val] of entries.slice(1)) {
          if (val !== null && typeof val === "object") {
            out += `${pad}  ${key}:\n${stringifyYaml(val, indent + 4)}`;
          } else {
            out += `${pad}  ${key}: ${quote(val)}\n`;
          }
        }
      } else if (item !== null && typeof item === "object") {
        out += `${pad}-\n${stringifyYaml(item, indent + 2)}`;
      } else {
        out += `${pad}- ${quote(item)}\n`;
      }
    }
    return out;
  }
  let out = "";
  for (const [key, val] of Object.entries(value)) {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      out += `${pad}${key}:\n${stringifyYaml(val, indent + 2)}`;
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        out += `${pad}${key}: []\n`;
      } else {
        out += `${pad}${key}:\n${stringifyYaml(val, indent + 2)}`;
      }
    } else {
      out += `${pad}${key}: ${quote(val)}\n`;
    }
  }
  return out;
}
