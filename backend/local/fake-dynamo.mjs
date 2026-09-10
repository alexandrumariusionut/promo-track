/**
 * Minimal in-memory stand-in for @aws-sdk/lib-dynamodb used ONLY by the local
 * dev servers. It understands just the expression shapes our handlers use:
 *
 *   UpdateExpression:  SET a = :v, #n.#k = :v, x = if_not_exists(x, :z) + :o
 *   ConditionExpression: attribute_exists(k), attribute_not_exists(k),
 *                        a = :v, and combinations with AND / OR
 *   ProjectionExpression: comma-separated attribute names (with #aliases)
 *
 * Anything else throws loudly so a new query shape is noticed in dev.
 */

const tables = new Map(); // tableName -> Map(pkValue -> item)

function table(name) {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name);
}

function pkOf(key) {
  const values = Object.values(key);
  if (values.length !== 1) throw new Error('fake-dynamo: only single-attribute keys are supported');
  return String(values[0]);
}

function resolveName(token, names) {
  return token.startsWith('#') ? names[token] : token;
}

function conditionError() {
  const err = new Error('The conditional request failed');
  err.name = 'ConditionalCheckFailedException';
  return err;
}

function evalCondition(expr, item, names, values) {
  const orParts = expr.split(/\s+OR\s+/i);
  return orParts.some((orPart) =>
    orPart.split(/\s+AND\s+/i).every((raw) => {
      const clause = raw.trim();
      let m;
      if ((m = clause.match(/^attribute_exists\((\S+)\)$/i))) return item !== undefined && item[resolveName(m[1], names)] !== undefined;
      if ((m = clause.match(/^attribute_not_exists\((\S+)\)$/i))) return item === undefined || item[resolveName(m[1], names)] === undefined;
      if ((m = clause.match(/^(\S+)\s*=\s*(:\S+)$/))) return item !== undefined && item[resolveName(m[1], names)] === values[m[2]];
      throw new Error(`fake-dynamo: unsupported condition clause "${clause}"`);
    }),
  );
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function applyUpdate(item, expr, names, values) {
  const m = expr.match(/^\s*SET\s+(.+)$/is);
  if (!m) throw new Error(`fake-dynamo: unsupported UpdateExpression "${expr}"`);
  const updated = {};
  for (const raw of splitTopLevel(m[1])) {
    const clause = raw.trim();
    let mm;
    if ((mm = clause.match(/^(\S+)\s*=\s*if_not_exists\((\S+),\s*(:\S+)\)\s*\+\s*(:\S+)$/))) {
      const target = resolveName(mm[1], names);
      const base = item[resolveName(mm[2], names)] ?? values[mm[3]];
      item[target] = base + values[mm[4]];
      updated[target] = item[target];
    } else if ((mm = clause.match(/^(\S+)\.(\S+)\s*=\s*(:\S+)$/))) {
      const parent = resolveName(mm[1], names);
      const child = resolveName(mm[2], names);
      item[parent] = { ...(item[parent] || {}), [child]: values[mm[3]] };
      updated[parent] = item[parent];
    } else if ((mm = clause.match(/^(\S+)\s*=\s*(:\S+)$/))) {
      const target = resolveName(mm[1], names);
      item[target] = values[mm[2]];
      updated[target] = item[target];
    } else {
      throw new Error(`fake-dynamo: unsupported SET clause "${clause}"`);
    }
  }
  return updated;
}

function project(item, projection, names) {
  if (!projection) return { ...item };
  const out = {};
  for (const raw of projection.split(',')) {
    const attr = resolveName(raw.trim(), names || {});
    if (item[attr] !== undefined) out[attr] = item[attr];
  }
  return out;
}

class Command { constructor(params) { this.params = params; } }
export class GetCommand extends Command {}
export class PutCommand extends Command {}
export class UpdateCommand extends Command {}
export class DeleteCommand extends Command {}

export const DynamoDBDocumentClient = {
  from() {
    return {
      async send(cmd) {
        const p = cmd.params;
        const t = table(p.TableName);
        if (cmd instanceof GetCommand) {
          const item = t.get(pkOf(p.Key));
          return { Item: item ? project(item, p.ProjectionExpression, p.ExpressionAttributeNames) : undefined };
        }
        if (cmd instanceof PutCommand) {
          const key = pkOf(Object.fromEntries(Object.entries(p.Item).slice(0, 1)));
          if (p.ConditionExpression && !evalCondition(p.ConditionExpression, t.get(key), p.ExpressionAttributeNames || {}, p.ExpressionAttributeValues || {})) throw conditionError();
          t.set(key, structuredClone(p.Item));
          return {};
        }
        if (cmd instanceof UpdateCommand) {
          const key = pkOf(p.Key);
          const existing = t.get(key);
          if (p.ConditionExpression && !evalCondition(p.ConditionExpression, existing, p.ExpressionAttributeNames || {}, p.ExpressionAttributeValues || {})) throw conditionError();
          const item = existing ? structuredClone(existing) : { ...p.Key };
          const updated = applyUpdate(item, p.UpdateExpression, p.ExpressionAttributeNames || {}, p.ExpressionAttributeValues || {});
          t.set(key, item);
          return { Attributes: p.ReturnValues === 'UPDATED_NEW' ? updated : item };
        }
        if (cmd instanceof DeleteCommand) {
          const key = pkOf(p.Key);
          if (p.ConditionExpression && !evalCondition(p.ConditionExpression, t.get(key), p.ExpressionAttributeNames || {}, p.ExpressionAttributeValues || {})) throw conditionError();
          t.delete(key);
          return {};
        }
        throw new Error('fake-dynamo: unsupported command');
      },
    };
  },
};

/** Debug helper for the local server: dump a table. */
export function _dump(tableName) {
  return Object.fromEntries(table(tableName));
}
