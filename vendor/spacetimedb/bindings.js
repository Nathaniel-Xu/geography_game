var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// server/node_modules/safe-stable-stringify/index.js
var require_safe_stable_stringify = __commonJS((exports, module) => {
  var { hasOwnProperty } = Object.prototype;
  var stringify = configure();
  stringify.configure = configure;
  stringify.stringify = stringify;
  stringify.default = stringify;
  exports.stringify = stringify;
  exports.configure = configure;
  module.exports = stringify;
  var strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
  function strEscape(str) {
    if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
      return `"${str}"`;
    }
    return JSON.stringify(str);
  }
  function sort(array, comparator) {
    if (array.length > 200 || comparator) {
      return array.sort(comparator);
    }
    for (let i2 = 1;i2 < array.length; i2++) {
      const currentValue = array[i2];
      let position = i2;
      while (position !== 0 && array[position - 1] > currentValue) {
        array[position] = array[position - 1];
        position--;
      }
      array[position] = currentValue;
    }
    return array;
  }
  var typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array)), Symbol.toStringTag).get;
  function isTypedArrayWithEntries(value) {
    return typedArrayPrototypeGetSymbolToStringTag.call(value) !== undefined && value.length !== 0;
  }
  function stringifyTypedArray(array, separator, maximumBreadth) {
    if (array.length < maximumBreadth) {
      maximumBreadth = array.length;
    }
    const whitespace = separator === "," ? "" : " ";
    let res = `"0":${whitespace}${array[0]}`;
    for (let i2 = 1;i2 < maximumBreadth; i2++) {
      res += `${separator}"${i2}":${whitespace}${array[i2]}`;
    }
    return res;
  }
  function getCircularValueOption(options) {
    if (hasOwnProperty.call(options, "circularValue")) {
      const circularValue = options.circularValue;
      if (typeof circularValue === "string") {
        return `"${circularValue}"`;
      }
      if (circularValue == null) {
        return circularValue;
      }
      if (circularValue === Error || circularValue === TypeError) {
        return {
          toString() {
            throw new TypeError("Converting circular structure to JSON");
          }
        };
      }
      throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
    }
    return '"[Circular]"';
  }
  function getDeterministicOption(options) {
    let value;
    if (hasOwnProperty.call(options, "deterministic")) {
      value = options.deterministic;
      if (typeof value !== "boolean" && typeof value !== "function") {
        throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
      }
    }
    return value === undefined ? true : value;
  }
  function getBooleanOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "boolean") {
        throw new TypeError(`The "${key}" argument must be of type boolean`);
      }
    }
    return value === undefined ? true : value;
  }
  function getPositiveIntegerOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "number") {
        throw new TypeError(`The "${key}" argument must be of type number`);
      }
      if (!Number.isInteger(value)) {
        throw new TypeError(`The "${key}" argument must be an integer`);
      }
      if (value < 1) {
        throw new RangeError(`The "${key}" argument must be >= 1`);
      }
    }
    return value === undefined ? Infinity : value;
  }
  function getItemCount(number) {
    if (number === 1) {
      return "1 item";
    }
    return `${number} items`;
  }
  function getUniqueReplacerSet(replacerArray) {
    const replacerSet = new Set;
    for (const value of replacerArray) {
      if (typeof value === "string" || typeof value === "number") {
        replacerSet.add(String(value));
      }
    }
    return replacerSet;
  }
  function getStrictOption(options) {
    if (hasOwnProperty.call(options, "strict")) {
      const value = options.strict;
      if (typeof value !== "boolean") {
        throw new TypeError('The "strict" argument must be of type boolean');
      }
      if (value) {
        return (value2) => {
          let message = `Object can not safely be stringified. Received type ${typeof value2}`;
          if (typeof value2 !== "function")
            message += ` (${value2.toString()})`;
          throw new Error(message);
        };
      }
    }
  }
  function configure(options) {
    options = { ...options };
    const fail = getStrictOption(options);
    if (fail) {
      if (options.bigint === undefined) {
        options.bigint = false;
      }
      if (!("circularValue" in options)) {
        options.circularValue = Error;
      }
    }
    const circularValue = getCircularValueOption(options);
    const bigint = getBooleanOption(options, "bigint");
    const deterministic = getDeterministicOption(options);
    const comparator = typeof deterministic === "function" ? deterministic : undefined;
    const maximumDepth = getPositiveIntegerOption(options, "maximumDepth");
    const maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
    function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
      let value = parent[key];
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      value = replacer.call(parent, key, value);
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          let join = ",";
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyFnReplacer(String(i2), value, stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyFnReplacer(String(i2), value, stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let whitespace = "";
          let separator = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (deterministic && !isTypedArrayWithEntries(value)) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          let res = "";
          let join = ",";
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyArrayReplacer(String(i2), value[i2], stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyArrayReplacer(String(i2), value[i2], stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          stack.push(value);
          let whitespace = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          let separator = "";
          for (const key2 of replacer) {
            const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyIndent(key, value, stack, spacer, indentation) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifyIndent(key, value, stack, spacer, indentation);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            indentation += spacer;
            let res2 = `
${indentation}`;
            const join2 = `,
${indentation}`;
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyIndent(String(i2), value[i2], stack, spacer, indentation);
              res2 += tmp2 !== undefined ? tmp2 : "null";
              res2 += join2;
            }
            const tmp = stringifyIndent(String(i2), value[i2], stack, spacer, indentation);
            res2 += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            res2 += `
${originalIndentation}`;
            stack.pop();
            return `[${res2}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          indentation += spacer;
          const join = `,
${indentation}`;
          let res = "";
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, join, maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = join;
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}: ${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (separator !== "") {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifySimple(key, value, stack) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifySimple(key, value, stack);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          const hasLength = value.length !== undefined;
          if (hasLength && Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifySimple(String(i2), value[i2], stack);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += ",";
            }
            const tmp = stringifySimple(String(i2), value[i2], stack);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `,"... ${getItemCount(removedKeys)} not stringified"`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (hasLength && isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, ",", maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = ",";
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifySimple(key2, value[key2], stack);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${tmp}`;
              separator = ",";
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringify2(value, replacer, space) {
      if (arguments.length > 1) {
        let spacer = "";
        if (typeof space === "number") {
          spacer = " ".repeat(Math.min(space, 10));
        } else if (typeof space === "string") {
          spacer = space.slice(0, 10);
        }
        if (replacer != null) {
          if (typeof replacer === "function") {
            return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
          }
          if (Array.isArray(replacer)) {
            return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
          }
        }
        if (spacer.length !== 0) {
          return stringifyIndent("", value, [], spacer, "");
        }
      }
      return stringifySimple("", value, []);
    }
    return stringify2;
  }
});

// server/node_modules/base64-js/index.js
var $fromByteArray = fromByteArray;
var lookup = [];
var revLookup = [];
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (i = 0, len = code.length;i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}
var i;
var len;
revLookup[45] = 62;
revLookup[95] = 63;
function tripletToBase64(num) {
  return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i2 = start;i2 < end; i2 += 3) {
    tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
    output.push(tripletToBase64(tmp));
  }
  return output.join("");
}
function fromByteArray(uint8) {
  var tmp;
  var len2 = uint8.length;
  var extraBytes = len2 % 3;
  var parts = [];
  var maxChunkLength = 16383;
  for (var i2 = 0, len22 = len2 - extraBytes;i2 < len22; i2 += maxChunkLength) {
    parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
  }
  if (extraBytes === 1) {
    tmp = uint8[len2 - 1];
    parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
  } else if (extraBytes === 2) {
    tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
    parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
  }
  return parts.join("");
}

// server/node_modules/safe-stable-stringify/esm/wrapper.js
var import___ = __toESM(require_safe_stable_stringify(), 1);
var configure = import___.default.configure;
var stringify = import___.default;

// server/node_modules/spacetimedb/dist/index.browser.mjs
var BinaryReader = class {
  view;
  offset = 0;
  constructor(input) {
    this.view = input instanceof DataView ? input : new DataView(input.buffer, input.byteOffset, input.byteLength);
    this.offset = 0;
  }
  reset(input) {
    this.view = input instanceof DataView ? input : new DataView(input.buffer, input.byteOffset, input.byteLength);
    this.offset = 0;
  }
  get remaining() {
    return this.view.byteLength - this.offset;
  }
  #ensure(n) {
    if (this.offset + n > this.view.byteLength) {
      throw new RangeError(`Tried to read ${n} byte(s) at relative offset ${this.offset}, but only ${this.remaining} byte(s) remain`);
    }
  }
  readUInt8Array() {
    const length = this.readU32();
    this.#ensure(length);
    return this.readBytes(length);
  }
  readBool() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value !== 0;
  }
  readByte() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }
  readBytes(length) {
    const array = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
    this.offset += length;
    return array;
  }
  readI8() {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }
  readU8() {
    return this.readByte();
  }
  readI16() {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }
  readU16() {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }
  readI32() {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readU32() {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readI64() {
    const value = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readU64() {
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readU128() {
    const lowerPart = this.view.getBigUint64(this.offset, true);
    const upperPart = this.view.getBigUint64(this.offset + 8, true);
    this.offset += 16;
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readI128() {
    const lowerPart = this.view.getBigUint64(this.offset, true);
    const upperPart = this.view.getBigInt64(this.offset + 8, true);
    this.offset += 16;
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readU256() {
    const p0 = this.view.getBigUint64(this.offset, true);
    const p1 = this.view.getBigUint64(this.offset + 8, true);
    const p2 = this.view.getBigUint64(this.offset + 16, true);
    const p3 = this.view.getBigUint64(this.offset + 24, true);
    this.offset += 32;
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readI256() {
    const p0 = this.view.getBigUint64(this.offset, true);
    const p1 = this.view.getBigUint64(this.offset + 8, true);
    const p2 = this.view.getBigUint64(this.offset + 16, true);
    const p3 = this.view.getBigInt64(this.offset + 24, true);
    this.offset += 32;
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readF32() {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readF64() {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readString() {
    const uint8Array = this.readUInt8Array();
    return new TextDecoder("utf-8").decode(uint8Array);
  }
};
var ArrayBufferPrototypeTransfer = ArrayBuffer.prototype.transfer ?? function(newByteLength) {
  if (newByteLength === undefined) {
    return this.slice();
  } else if (newByteLength <= this.byteLength) {
    return this.slice(0, newByteLength);
  } else {
    const copy = new Uint8Array(newByteLength);
    copy.set(new Uint8Array(this));
    return copy.buffer;
  }
};
var ResizableBuffer = class {
  buffer;
  view;
  constructor(init) {
    this.buffer = typeof init === "number" ? new ArrayBuffer(init) : init;
    this.view = new DataView(this.buffer);
  }
  get capacity() {
    return this.buffer.byteLength;
  }
  grow(newSize) {
    if (newSize <= this.buffer.byteLength)
      return;
    this.buffer = ArrayBufferPrototypeTransfer.call(this.buffer, newSize);
    this.view = new DataView(this.buffer);
  }
};
var BinaryWriter = class {
  buffer;
  offset = 0;
  constructor(init) {
    this.buffer = typeof init === "number" ? new ResizableBuffer(init) : init;
  }
  clear() {
    this.offset = 0;
  }
  reset(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }
  expandBuffer(additionalCapacity) {
    const minCapacity = this.offset + additionalCapacity + 1;
    if (minCapacity <= this.buffer.capacity)
      return;
    let newCapacity = this.buffer.capacity * 2;
    if (newCapacity < minCapacity)
      newCapacity = minCapacity;
    this.buffer.grow(newCapacity);
  }
  toBase64() {
    return $fromByteArray(this.getBuffer());
  }
  getBuffer() {
    return new Uint8Array(this.buffer.buffer, 0, this.offset);
  }
  get view() {
    return this.buffer.view;
  }
  writeUInt8Array(value) {
    const length = value.length;
    this.expandBuffer(4 + length);
    this.writeU32(length);
    new Uint8Array(this.buffer.buffer, this.offset).set(value);
    this.offset += length;
  }
  writeBool(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value ? 1 : 0);
    this.offset += 1;
  }
  writeByte(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }
  writeBytes(value) {
    this.expandBuffer(value.length);
    new Uint8Array(this.buffer.buffer, this.offset, value.length).set(value);
    this.offset += value.length;
  }
  writeI8(value) {
    this.expandBuffer(1);
    this.view.setInt8(this.offset, value);
    this.offset += 1;
  }
  writeU8(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }
  writeI16(value) {
    this.expandBuffer(2);
    this.view.setInt16(this.offset, value, true);
    this.offset += 2;
  }
  writeU16(value) {
    this.expandBuffer(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }
  writeI32(value) {
    this.expandBuffer(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }
  writeU32(value) {
    this.expandBuffer(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }
  writeI64(value) {
    this.expandBuffer(8);
    this.view.setBigInt64(this.offset, value, true);
    this.offset += 8;
  }
  writeU64(value) {
    this.expandBuffer(8);
    this.view.setBigUint64(this.offset, value, true);
    this.offset += 8;
  }
  writeU128(value) {
    this.expandBuffer(16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    this.view.setBigUint64(this.offset, lowerPart, true);
    this.view.setBigUint64(this.offset + 8, upperPart, true);
    this.offset += 16;
  }
  writeI128(value) {
    this.expandBuffer(16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    this.view.setBigInt64(this.offset, lowerPart, true);
    this.view.setBigInt64(this.offset + 8, upperPart, true);
    this.offset += 16;
  }
  writeU256(value) {
    this.expandBuffer(32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    this.view.setBigUint64(this.offset + 8 * 0, p0, true);
    this.view.setBigUint64(this.offset + 8 * 1, p1, true);
    this.view.setBigUint64(this.offset + 8 * 2, p2, true);
    this.view.setBigUint64(this.offset + 8 * 3, p3, true);
    this.offset += 32;
  }
  writeI256(value) {
    this.expandBuffer(32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    this.view.setBigUint64(this.offset + 8 * 0, p0, true);
    this.view.setBigUint64(this.offset + 8 * 1, p1, true);
    this.view.setBigUint64(this.offset + 8 * 2, p2, true);
    this.view.setBigInt64(this.offset + 8 * 3, p3, true);
    this.offset += 32;
  }
  writeF32(value) {
    this.expandBuffer(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }
  writeF64(value) {
    this.expandBuffer(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }
  writeString(value) {
    const encoder = new TextEncoder;
    const encodedString = encoder.encode(value);
    this.writeUInt8Array(encodedString);
  }
};
function deepEqual(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}
function uint8ArrayToHexString(array) {
  return Array.prototype.map.call(array.reverse(), (x) => ("00" + x.toString(16)).slice(-2)).join("");
}
function uint8ArrayToU128(array) {
  if (array.length != 16) {
    throw new Error(`Uint8Array is not 16 bytes long: ${array}`);
  }
  return new BinaryReader(array).readU128();
}
function uint8ArrayToU256(array) {
  if (array.length != 32) {
    throw new Error(`Uint8Array is not 32 bytes long: [${array}]`);
  }
  return new BinaryReader(array).readU256();
}
function hexStringToUint8Array(str) {
  if (str.startsWith("0x")) {
    str = str.slice(2);
  }
  const matches = str.match(/.{1,2}/g) || [];
  const data = Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
  return data.reverse();
}
function hexStringToU128(str) {
  return uint8ArrayToU128(hexStringToUint8Array(str));
}
function hexStringToU256(str) {
  return uint8ArrayToU256(hexStringToUint8Array(str));
}
function u128ToUint8Array(data) {
  const writer = new BinaryWriter(16);
  writer.writeU128(data);
  return writer.getBuffer();
}
function u128ToHexString(data) {
  return uint8ArrayToHexString(u128ToUint8Array(data));
}
function u256ToUint8Array(data) {
  const writer = new BinaryWriter(32);
  writer.writeU256(data);
  return writer.getBuffer();
}
function u256ToHexString(data) {
  return uint8ArrayToHexString(u256ToUint8Array(data));
}
function coerceToBigInt(value, what) {
  if (typeof value === "bigint")
    return value;
  if (typeof value === "number")
    return BigInt(value);
  if (typeof value === "string" && value.trim() !== "")
    return BigInt(value);
  throw new TypeError(`Cannot convert ${typeof value} to ${what}: expected bigint, integer number, or decimal string`);
}
function toPascalCase(s) {
  const str = toCamelCase(s);
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function toCamelCase(s) {
  const str = s.replace(/[-_]+/g, "_").replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  return str.charAt(0).toLowerCase() + str.slice(1);
}
var hasOwn = Object.hasOwn;
var TimeDuration = class _TimeDuration {
  __time_duration_micros__;
  static MICROS_PER_MILLIS = 1000n;
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__time_duration_micros__",
          algebraicType: AlgebraicType.I64
        }
      ]
    });
  }
  static isTimeDuration(algebraicType) {
    if (algebraicType.tag !== "Product") {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return microsElement.name === "__time_duration_micros__" && microsElement.algebraicType.tag === "I64";
  }
  get micros() {
    return this.__time_duration_micros__;
  }
  get millis() {
    return Number(this.micros / _TimeDuration.MICROS_PER_MILLIS);
  }
  constructor(micros) {
    this.__time_duration_micros__ = coerceToBigInt(micros, "TimeDuration");
  }
  static fromMillis(millis) {
    return new _TimeDuration(BigInt(millis) * _TimeDuration.MICROS_PER_MILLIS);
  }
  toString() {
    const micros = this.micros;
    const sign = micros < 0 ? "-" : "+";
    const pos = micros < 0 ? -micros : micros;
    const secs = pos / 1000000n;
    const micros_remaining = pos % 1000000n;
    return `${sign}${secs}.${String(micros_remaining).padStart(6, "0")}`;
  }
};
var Timestamp = class _Timestamp {
  __timestamp_micros_since_unix_epoch__;
  static MICROS_PER_MILLIS = 1000n;
  get microsSinceUnixEpoch() {
    return this.__timestamp_micros_since_unix_epoch__;
  }
  constructor(micros) {
    this.__timestamp_micros_since_unix_epoch__ = coerceToBigInt(micros, "Timestamp");
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__timestamp_micros_since_unix_epoch__",
          algebraicType: AlgebraicType.I64
        }
      ]
    });
  }
  static isTimestamp(algebraicType) {
    if (algebraicType.tag !== "Product") {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return microsElement.name === "__timestamp_micros_since_unix_epoch__" && microsElement.algebraicType.tag === "I64";
  }
  static UNIX_EPOCH = new _Timestamp(0n);
  static now() {
    return _Timestamp.fromDate(/* @__PURE__ */ new Date);
  }
  toMillis() {
    return this.microsSinceUnixEpoch / 1000n;
  }
  static fromDate(date) {
    const millis = date.getTime();
    const micros = BigInt(millis) * _Timestamp.MICROS_PER_MILLIS;
    return new _Timestamp(micros);
  }
  toDate() {
    const micros = this.__timestamp_micros_since_unix_epoch__;
    const millis = micros / _Timestamp.MICROS_PER_MILLIS;
    if (millis > BigInt(Number.MAX_SAFE_INTEGER) || millis < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError("Timestamp is outside of the representable range of JS's Date");
    }
    return new Date(Number(millis));
  }
  toISOString() {
    const micros = this.__timestamp_micros_since_unix_epoch__;
    const millis = micros / _Timestamp.MICROS_PER_MILLIS;
    if (millis > BigInt(Number.MAX_SAFE_INTEGER) || millis < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError("Timestamp is outside of the representable range for ISO string formatting");
    }
    const date = new Date(Number(millis));
    const isoBase = date.toISOString();
    const microsRemainder = Math.abs(Number(micros % 1000000n));
    const fractionalPart = String(microsRemainder).padStart(6, "0");
    return isoBase.replace(/\.\d{3}Z$/, `.${fractionalPart}Z`);
  }
  since(other) {
    return new TimeDuration(this.__timestamp_micros_since_unix_epoch__ - other.__timestamp_micros_since_unix_epoch__);
  }
};
var Uuid = class _Uuid {
  __uuid__;
  static NIL = new _Uuid(0n);
  static MAX_UUID_BIGINT = 0xffffffffffffffffffffffffffffffffn;
  static MAX = new _Uuid(_Uuid.MAX_UUID_BIGINT);
  constructor(u) {
    const v = coerceToBigInt(u, "Uuid");
    if (v < 0n || v > _Uuid.MAX_UUID_BIGINT) {
      throw new Error("Invalid UUID: must be between 0 and `MAX_UUID_BIGINT`");
    }
    this.__uuid__ = v;
  }
  static fromRandomBytesV4(bytes) {
    if (bytes.length !== 16)
      throw new Error("UUID v4 requires 16 bytes");
    const arr = new Uint8Array(bytes);
    arr[6] = arr[6] & 15 | 64;
    arr[8] = arr[8] & 63 | 128;
    return new _Uuid(_Uuid.bytesToBigInt(arr));
  }
  static fromCounterV7(counter, now, randomBytes) {
    if (randomBytes.length !== 4) {
      throw new Error("`fromCounterV7` requires `randomBytes.length == 4`");
    }
    if (counter.value < 0) {
      throw new Error("`fromCounterV7` uuid `counter` must be non-negative");
    }
    if (now.__timestamp_micros_since_unix_epoch__ < 0) {
      throw new Error("`fromCounterV7` `timestamp` before unix epoch");
    }
    const counterVal = counter.value;
    counter.value = counterVal + 1 & 2147483647;
    const tsMs = now.toMillis() & 0xffffffffffffn;
    const bytes = new Uint8Array(16);
    bytes[0] = Number(tsMs >> 40n & 0xffn);
    bytes[1] = Number(tsMs >> 32n & 0xffn);
    bytes[2] = Number(tsMs >> 24n & 0xffn);
    bytes[3] = Number(tsMs >> 16n & 0xffn);
    bytes[4] = Number(tsMs >> 8n & 0xffn);
    bytes[5] = Number(tsMs & 0xffn);
    bytes[7] = counterVal >>> 23 & 255;
    bytes[9] = counterVal >>> 15 & 255;
    bytes[10] = counterVal >>> 7 & 255;
    bytes[11] = (counterVal & 127) << 1 & 255;
    bytes[12] |= randomBytes[0] & 127;
    bytes[13] = randomBytes[1];
    bytes[14] = randomBytes[2];
    bytes[15] = randomBytes[3];
    bytes[6] = bytes[6] & 15 | 112;
    bytes[8] = bytes[8] & 63 | 128;
    return new _Uuid(_Uuid.bytesToBigInt(bytes));
  }
  static parse(s) {
    const hex = s.replace(/-/g, "");
    if (hex.length !== 32)
      throw new Error("Invalid hex UUID");
    let v = 0n;
    for (let i2 = 0;i2 < 32; i2 += 2) {
      v = v << 8n | BigInt(parseInt(hex.slice(i2, i2 + 2), 16));
    }
    return new _Uuid(v);
  }
  toHexString() {
    return u128ToHexString(this.asBigInt());
  }
  toString() {
    const hex = this.toHexString();
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  asBigInt() {
    return this.__uuid__;
  }
  toBytes() {
    return _Uuid.bigIntToBytes(this.__uuid__);
  }
  static bytesToBigInt(bytes) {
    let result = 0n;
    for (const b of bytes)
      result = result << 8n | BigInt(b);
    return result;
  }
  static bigIntToBytes(value) {
    const bytes = new Uint8Array(16);
    for (let i2 = 15;i2 >= 0; i2--) {
      bytes[i2] = Number(value & 0xffn);
      value >>= 8n;
    }
    return bytes;
  }
  getVersion() {
    const version = this.toBytes()[6] >> 4 & 15;
    switch (version) {
      case 4:
        return "V4";
      case 7:
        return "V7";
      default:
        if (this == _Uuid.NIL) {
          return "Nil";
        }
        if (this == _Uuid.MAX) {
          return "Max";
        }
        throw new Error(`Unsupported UUID version: ${version}`);
    }
  }
  getCounter() {
    const bytes = this.toBytes();
    const high = bytes[7];
    const mid1 = bytes[9];
    const mid2 = bytes[10];
    const low = bytes[11] >>> 1;
    return high << 23 | mid1 << 15 | mid2 << 7 | low | 0;
  }
  compareTo(other) {
    if (this.__uuid__ < other.__uuid__)
      return -1;
    if (this.__uuid__ > other.__uuid__)
      return 1;
    return 0;
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__uuid__",
          algebraicType: AlgebraicType.U128
        }
      ]
    });
  }
};
var Identity = class _Identity {
  __identity__;
  constructor(data) {
    this.__identity__ = typeof data === "string" ? hexStringToU256(data) : coerceToBigInt(data, "Identity");
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [{ name: "__identity__", algebraicType: AlgebraicType.U256 }]
    });
  }
  isEqual(other) {
    return this.toHexString() === other.toHexString();
  }
  equals(other) {
    return this.isEqual(other);
  }
  toHexString() {
    return u256ToHexString(this.__identity__);
  }
  toUint8Array() {
    return u256ToUint8Array(this.__identity__);
  }
  static fromString(str) {
    return new _Identity(str);
  }
  static zero() {
    return new _Identity(0n);
  }
  toString() {
    return this.toHexString();
  }
};
var SERIALIZERS = /* @__PURE__ */ new Map;
var DESERIALIZERS = /* @__PURE__ */ new Map;
var AlgebraicType = {
  Ref: (value) => ({ tag: "Ref", value }),
  Sum: (value) => ({
    tag: "Sum",
    value
  }),
  Product: (value) => ({
    tag: "Product",
    value
  }),
  Array: (value) => ({
    tag: "Array",
    value
  }),
  String: { tag: "String" },
  Bool: { tag: "Bool" },
  I8: { tag: "I8" },
  U8: { tag: "U8" },
  I16: { tag: "I16" },
  U16: { tag: "U16" },
  I32: { tag: "I32" },
  U32: { tag: "U32" },
  I64: { tag: "I64" },
  U64: { tag: "U64" },
  I128: { tag: "I128" },
  U128: { tag: "U128" },
  I256: { tag: "I256" },
  U256: { tag: "U256" },
  F32: { tag: "F32" },
  F64: { tag: "F64" },
  makeSerializer(ty, typespace) {
    if (ty.tag === "Ref") {
      if (!typespace)
        throw new Error("cannot serialize refs without a typespace");
      while (ty.tag === "Ref")
        ty = typespace.types[ty.value];
    }
    switch (ty.tag) {
      case "Product":
        return ProductType.makeSerializer(ty.value, typespace);
      case "Sum":
        return SumType.makeSerializer(ty.value, typespace);
      case "Array":
        if (ty.value.tag === "U8") {
          return serializeUint8Array;
        } else {
          const serialize = AlgebraicType.makeSerializer(ty.value, typespace);
          return (writer, value) => {
            writer.writeU32(value.length);
            for (const elem of value) {
              serialize(writer, elem);
            }
          };
        }
      default:
        return primitiveSerializers[ty.tag];
    }
  },
  serializeValue(writer, ty, value, typespace) {
    AlgebraicType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    if (ty.tag === "Ref") {
      if (!typespace)
        throw new Error("cannot deserialize refs without a typespace");
      while (ty.tag === "Ref")
        ty = typespace.types[ty.value];
    }
    switch (ty.tag) {
      case "Product":
        return ProductType.makeDeserializer(ty.value, typespace);
      case "Sum":
        return SumType.makeDeserializer(ty.value, typespace);
      case "Array":
        if (ty.value.tag === "U8") {
          return deserializeUint8Array;
        } else {
          const deserialize = AlgebraicType.makeDeserializer(ty.value, typespace);
          return (reader) => {
            const length = reader.readU32();
            const result = Array(length);
            for (let i2 = 0;i2 < length; i2++) {
              result[i2] = deserialize(reader);
            }
            return result;
          };
        }
      default:
        return primitiveDeserializers[ty.tag];
    }
  },
  deserializeValue(reader, ty, typespace) {
    return AlgebraicType.makeDeserializer(ty, typespace)(reader);
  },
  intoMapKey: function(ty, value) {
    switch (ty.tag) {
      case "U8":
      case "U16":
      case "U32":
      case "U64":
      case "U128":
      case "U256":
      case "I8":
      case "I16":
      case "I32":
      case "I64":
      case "I128":
      case "I256":
      case "F32":
      case "F64":
      case "String":
      case "Bool":
        return value;
      case "Product":
        return ProductType.intoMapKey(ty.value, value);
      default: {
        const writer = new BinaryWriter(10);
        AlgebraicType.serializeValue(writer, ty, value);
        return writer.toBase64();
      }
    }
  }
};
function bindCall(f) {
  return Function.prototype.call.bind(f);
}
var primitiveSerializers = {
  Bool: bindCall(BinaryWriter.prototype.writeBool),
  I8: bindCall(BinaryWriter.prototype.writeI8),
  U8: bindCall(BinaryWriter.prototype.writeU8),
  I16: bindCall(BinaryWriter.prototype.writeI16),
  U16: bindCall(BinaryWriter.prototype.writeU16),
  I32: bindCall(BinaryWriter.prototype.writeI32),
  U32: bindCall(BinaryWriter.prototype.writeU32),
  I64: bindCall(BinaryWriter.prototype.writeI64),
  U64: bindCall(BinaryWriter.prototype.writeU64),
  I128: bindCall(BinaryWriter.prototype.writeI128),
  U128: bindCall(BinaryWriter.prototype.writeU128),
  I256: bindCall(BinaryWriter.prototype.writeI256),
  U256: bindCall(BinaryWriter.prototype.writeU256),
  F32: bindCall(BinaryWriter.prototype.writeF32),
  F64: bindCall(BinaryWriter.prototype.writeF64),
  String: bindCall(BinaryWriter.prototype.writeString)
};
Object.freeze(primitiveSerializers);
var serializeUint8Array = bindCall(BinaryWriter.prototype.writeUInt8Array);
var primitiveDeserializers = {
  Bool: bindCall(BinaryReader.prototype.readBool),
  I8: bindCall(BinaryReader.prototype.readI8),
  U8: bindCall(BinaryReader.prototype.readU8),
  I16: bindCall(BinaryReader.prototype.readI16),
  U16: bindCall(BinaryReader.prototype.readU16),
  I32: bindCall(BinaryReader.prototype.readI32),
  U32: bindCall(BinaryReader.prototype.readU32),
  I64: bindCall(BinaryReader.prototype.readI64),
  U64: bindCall(BinaryReader.prototype.readU64),
  I128: bindCall(BinaryReader.prototype.readI128),
  U128: bindCall(BinaryReader.prototype.readU128),
  I256: bindCall(BinaryReader.prototype.readI256),
  U256: bindCall(BinaryReader.prototype.readU256),
  F32: bindCall(BinaryReader.prototype.readF32),
  F64: bindCall(BinaryReader.prototype.readF64),
  String: bindCall(BinaryReader.prototype.readString)
};
Object.freeze(primitiveDeserializers);
var deserializeUint8Array = bindCall(BinaryReader.prototype.readUInt8Array);
var primitiveSizes = {
  Bool: 1,
  I8: 1,
  U8: 1,
  I16: 2,
  U16: 2,
  I32: 4,
  U32: 4,
  I64: 8,
  U64: 8,
  I128: 16,
  U128: 16,
  I256: 32,
  U256: 32,
  F32: 4,
  F64: 8
};
var fixedSizePrimitives = new Set(Object.keys(primitiveSizes));
var isFixedSizeProduct = (ty) => ty.elements.every(({ algebraicType }) => fixedSizePrimitives.has(algebraicType.tag));
var productSize = (ty) => ty.elements.reduce((acc, { algebraicType }) => acc + primitiveSizes[algebraicType.tag], 0);
var primitiveJSName = {
  Bool: "Uint8",
  I8: "Int8",
  U8: "Uint8",
  I16: "Int16",
  U16: "Uint16",
  I32: "Int32",
  U32: "Uint32",
  I64: "BigInt64",
  U64: "BigUint64",
  F32: "Float32",
  F64: "Float64"
};
var specialProductDeserializers = {
  __time_duration_micros__: (reader) => new TimeDuration(reader.readI64()),
  __timestamp_micros_since_unix_epoch__: (reader) => new Timestamp(reader.readI64()),
  __identity__: (reader) => new Identity(reader.readU256()),
  __connection_id__: (reader) => new ConnectionId(reader.readU128()),
  __uuid__: (reader) => new Uuid(reader.readU128())
};
Object.freeze(specialProductDeserializers);
var unitDeserializer = () => ({});
var getElementInitializer = (element) => {
  let init;
  switch (element.algebraicType.tag) {
    case "String":
      init = "''";
      break;
    case "Bool":
      init = "false";
      break;
    case "I8":
    case "U8":
    case "I16":
    case "U16":
    case "I32":
    case "U32":
      init = "0";
      break;
    case "I64":
    case "U64":
    case "I128":
    case "U128":
    case "I256":
    case "U256":
      init = "0n";
      break;
    case "F32":
    case "F64":
      init = "0.0";
      break;
    default:
      init = "undefined";
  }
  return `${element.name}: ${init}`;
};
var ProductType = {
  makeSerializer(ty, typespace) {
    let serializer = SERIALIZERS.get(ty);
    if (serializer != null)
      return serializer;
    if (isFixedSizeProduct(ty)) {
      const size = productSize(ty);
      const body2 = `"use strict";
writer.expandBuffer(${size});
const view = writer.view;
${ty.elements.map(({ name, algebraicType: { tag } }) => (tag in primitiveJSName) ? `view.set${primitiveJSName[tag]}(writer.offset, value.${name}, ${primitiveSizes[tag] > 1 ? "true" : ""});
writer.offset += ${primitiveSizes[tag]};` : `writer.write${tag}(value.${name});`).join(`
`)}`;
      serializer = Function("writer", "value", body2);
      SERIALIZERS.set(ty, serializer);
      return serializer;
    }
    const serializers = {};
    const body = `"use strict";
` + ty.elements.map((element) => `this.${element.name}(writer, value.${element.name});`).join(`
`);
    serializer = Function("writer", "value", body).bind(serializers);
    SERIALIZERS.set(ty, serializer);
    for (const { name, algebraicType } of ty.elements) {
      serializers[name] = AlgebraicType.makeSerializer(algebraicType, typespace);
    }
    Object.freeze(serializers);
    return serializer;
  },
  serializeValue(writer, ty, value, typespace) {
    ProductType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    switch (ty.elements.length) {
      case 0:
        return unitDeserializer;
      case 1: {
        const fieldName = ty.elements[0].name;
        if (hasOwn(specialProductDeserializers, fieldName))
          return specialProductDeserializers[fieldName];
      }
    }
    let deserializer = DESERIALIZERS.get(ty);
    if (deserializer != null)
      return deserializer;
    if (isFixedSizeProduct(ty)) {
      const body = `"use strict";
const result = { ${ty.elements.map(getElementInitializer).join(", ")} };
const view = reader.view;
${ty.elements.map(({ name, algebraicType: { tag } }) => (tag in primitiveJSName) ? tag === "Bool" ? `result.${name} = view.getUint8(reader.offset) !== 0;
reader.offset += 1;` : `result.${name} = view.get${primitiveJSName[tag]}(reader.offset, ${primitiveSizes[tag] > 1 ? "true" : ""});
reader.offset += ${primitiveSizes[tag]};` : `result.${name} = reader.read${tag}();`).join(`
`)}
return result;`;
      deserializer = Function("reader", body);
      DESERIALIZERS.set(ty, deserializer);
      return deserializer;
    }
    const deserializers = {};
    deserializer = Function("reader", `"use strict";
const result = { ${ty.elements.map(getElementInitializer).join(", ")} };
${ty.elements.map(({ name }) => `result.${name} = this.${name}(reader);`).join(`
`)}
return result;`).bind(deserializers);
    DESERIALIZERS.set(ty, deserializer);
    for (const { name, algebraicType } of ty.elements) {
      deserializers[name] = AlgebraicType.makeDeserializer(algebraicType, typespace);
    }
    Object.freeze(deserializers);
    return deserializer;
  },
  deserializeValue(reader, ty, typespace) {
    return ProductType.makeDeserializer(ty, typespace)(reader);
  },
  intoMapKey(ty, value) {
    if (ty.elements.length === 1) {
      const fieldName = ty.elements[0].name;
      if (hasOwn(specialProductDeserializers, fieldName)) {
        return value[fieldName];
      }
    }
    const writer = new BinaryWriter(10);
    AlgebraicType.serializeValue(writer, AlgebraicType.Product(ty), value);
    return writer.toBase64();
  }
};
var SumType = {
  makeSerializer(ty, typespace) {
    if (ty.variants.length == 2 && ty.variants[0].name === "some" && ty.variants[1].name === "none") {
      const serialize = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      return (writer, value) => {
        if (value !== null && value !== undefined) {
          writer.writeByte(0);
          serialize(writer, value);
        } else {
          writer.writeByte(1);
        }
      };
    } else if (ty.variants.length == 2 && ty.variants[0].name === "ok" && ty.variants[1].name === "err") {
      const serializeOk = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      const serializeErr = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      return (writer, value) => {
        if ("ok" in value) {
          writer.writeU8(0);
          serializeOk(writer, value.ok);
        } else if ("err" in value) {
          writer.writeU8(1);
          serializeErr(writer, value.err);
        } else {
          throw new TypeError("could not serialize result: object had neither a `ok` nor an `err` field");
        }
      };
    } else {
      let serializer = SERIALIZERS.get(ty);
      if (serializer != null)
        return serializer;
      const serializers = {};
      const body = `switch (value.tag) {
${ty.variants.map(({ name }, i2) => `  case ${JSON.stringify(name)}:
    writer.writeByte(${i2});
    return this.${name}(writer, value.value);`).join(`
`)}
  default:
    throw new TypeError(
      \`Could not serialize sum type; unknown tag \${value.tag}\`
    )
}
`;
      serializer = Function("writer", "value", body).bind(serializers);
      SERIALIZERS.set(ty, serializer);
      for (const { name, algebraicType } of ty.variants) {
        serializers[name] = AlgebraicType.makeSerializer(algebraicType, typespace);
      }
      Object.freeze(serializers);
      return serializer;
    }
  },
  serializeValue(writer, ty, value, typespace) {
    SumType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    if (ty.variants.length == 2 && ty.variants[0].name === "some" && ty.variants[1].name === "none") {
      const deserialize = AlgebraicType.makeDeserializer(ty.variants[0].algebraicType, typespace);
      return (reader) => {
        const tag = reader.readU8();
        if (tag === 0) {
          return deserialize(reader);
        } else if (tag === 1) {
          return;
        } else {
          throw `Can't deserialize an option type, couldn't find ${tag} tag`;
        }
      };
    } else if (ty.variants.length == 2 && ty.variants[0].name === "ok" && ty.variants[1].name === "err") {
      const deserializeOk = AlgebraicType.makeDeserializer(ty.variants[0].algebraicType, typespace);
      const deserializeErr = AlgebraicType.makeDeserializer(ty.variants[1].algebraicType, typespace);
      return (reader) => {
        const tag = reader.readByte();
        if (tag === 0) {
          return { ok: deserializeOk(reader) };
        } else if (tag === 1) {
          return { err: deserializeErr(reader) };
        } else {
          throw `Can't deserialize a result type, couldn't find ${tag} tag`;
        }
      };
    } else {
      let deserializer = DESERIALIZERS.get(ty);
      if (deserializer != null)
        return deserializer;
      const deserializers = {};
      deserializer = Function("reader", `switch (reader.readU8()) {
${ty.variants.map(({ name }, i2) => `case ${i2}: return { tag: ${JSON.stringify(name)}, value: this.${name}(reader) };`).join(`
`)} }`).bind(deserializers);
      DESERIALIZERS.set(ty, deserializer);
      for (const { name, algebraicType } of ty.variants) {
        deserializers[name] = AlgebraicType.makeDeserializer(algebraicType, typespace);
      }
      Object.freeze(deserializers);
      return deserializer;
    }
  },
  deserializeValue(reader, ty, typespace) {
    return SumType.makeDeserializer(ty, typespace)(reader);
  }
};
var ConnectionId = class _ConnectionId {
  __connection_id__;
  constructor(data) {
    this.__connection_id__ = coerceToBigInt(data, "ConnectionId");
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        { name: "__connection_id__", algebraicType: AlgebraicType.U128 }
      ]
    });
  }
  isZero() {
    return this.__connection_id__ === BigInt(0);
  }
  static nullIfZero(addr) {
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
  static random() {
    function randomU8() {
      return Math.floor(Math.random() * 255);
    }
    let result = BigInt(0);
    for (let i2 = 0;i2 < 16; i2++) {
      result = result << BigInt(8) | BigInt(randomU8());
    }
    return new _ConnectionId(result);
  }
  isEqual(other) {
    return this.__connection_id__ == other.__connection_id__;
  }
  equals(other) {
    return this.isEqual(other);
  }
  toHexString() {
    return u128ToHexString(this.__connection_id__);
  }
  toUint8Array() {
    return u128ToUint8Array(this.__connection_id__);
  }
  static fromString(str) {
    return new _ConnectionId(hexStringToU128(str));
  }
  static fromStringOrNull(str) {
    const addr = _ConnectionId.fromString(str);
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
};
var SenderError = class extends Error {
  constructor(message) {
    super(message);
  }
  get name() {
    return "SenderError";
  }
};
var InternalError = class extends Error {
  constructor(message) {
    super(message);
  }
  get name() {
    return "InternalError";
  }
};
var ScheduleAt = {
  interval(value) {
    return Interval(value);
  },
  time(value) {
    return Time(value);
  },
  getAlgebraicType() {
    return AlgebraicType.Sum({
      variants: [
        {
          name: "Interval",
          algebraicType: TimeDuration.getAlgebraicType()
        },
        { name: "Time", algebraicType: Timestamp.getAlgebraicType() }
      ]
    });
  },
  isScheduleAt(algebraicType) {
    if (algebraicType.tag !== "Sum") {
      return false;
    }
    const variants = algebraicType.value.variants;
    if (variants.length !== 2) {
      return false;
    }
    const intervalVariant = variants.find((v) => v.name === "Interval");
    const timeVariant = variants.find((v) => v.name === "Time");
    if (!intervalVariant || !timeVariant) {
      return false;
    }
    return TimeDuration.isTimeDuration(intervalVariant.algebraicType) && Timestamp.isTimestamp(timeVariant.algebraicType);
  }
};
var Interval = (micros) => ({
  tag: "Interval",
  value: new TimeDuration(micros)
});
var Time = (microsSinceUnixEpoch) => ({
  tag: "Time",
  value: new Timestamp(microsSinceUnixEpoch)
});
var schedule_at_default = ScheduleAt;
var Option = {
  getAlgebraicType(innerType) {
    return AlgebraicType.Sum({
      variants: [
        { name: "some", algebraicType: innerType },
        {
          name: "none",
          algebraicType: AlgebraicType.Product({ elements: [] })
        }
      ]
    });
  }
};
var Result = {
  getAlgebraicType(okType, errType) {
    return AlgebraicType.Sum({
      variants: [
        { name: "ok", algebraicType: okType },
        { name: "err", algebraicType: errType }
      ]
    });
  }
};
var QueryBrand = Symbol("QueryBrand");
var isRowTypedQuery = (val) => !!val && typeof val === "object" && (QueryBrand in val);
function toSql(q) {
  return q.toSql();
}
var SemijoinImpl = class _SemijoinImpl {
  constructor(sourceQuery, filterQuery, joinCondition) {
    this.sourceQuery = sourceQuery;
    this.filterQuery = filterQuery;
    this.joinCondition = joinCondition;
    if (sourceQuery.table.sourceName === filterQuery.table.sourceName) {
      throw new Error("Cannot semijoin a table to itself");
    }
  }
  [QueryBrand] = true;
  type = "semijoin";
  build() {
    return this;
  }
  where(predicate) {
    const nextSourceQuery = this.sourceQuery.where(predicate);
    return new _SemijoinImpl(nextSourceQuery, this.filterQuery, this.joinCondition);
  }
  toSql() {
    const left = this.filterQuery;
    const right = this.sourceQuery;
    const leftTable = quoteIdentifier(left.table.sourceName);
    const rightTable = quoteIdentifier(right.table.sourceName);
    let sql = `SELECT ${rightTable}.* FROM ${leftTable} JOIN ${rightTable} ON ${booleanExprToSql(this.joinCondition)}`;
    const clauses = [];
    if (left.whereClause) {
      clauses.push(booleanExprToSql(left.whereClause));
    }
    if (right.whereClause) {
      clauses.push(booleanExprToSql(right.whereClause));
    }
    if (clauses.length > 0) {
      const whereSql = clauses.length === 1 ? clauses[0] : clauses.map(wrapInParens).join(" AND ");
      sql += ` WHERE ${whereSql}`;
    }
    return sql;
  }
};
var FromBuilder = class _FromBuilder {
  constructor(table2, whereClause) {
    this.table = table2;
    this.whereClause = whereClause;
  }
  [QueryBrand] = true;
  where(predicate) {
    const newCondition = normalizePredicateExpr(predicate(this.table.cols));
    const nextWhere = this.whereClause ? this.whereClause.and(newCondition) : newCondition;
    return new _FromBuilder(this.table, nextWhere);
  }
  rightSemijoin(right, on) {
    const sourceQuery = new _FromBuilder(right);
    const joinCondition = on(this.table.indexedCols, right.indexedCols);
    return new SemijoinImpl(sourceQuery, this, joinCondition);
  }
  leftSemijoin(right, on) {
    const filterQuery = new _FromBuilder(right);
    const joinCondition = on(this.table.indexedCols, right.indexedCols);
    return new SemijoinImpl(this, filterQuery, joinCondition);
  }
  toSql() {
    return renderSelectSqlWithJoins(this.table, this.whereClause);
  }
  build() {
    return this;
  }
};
var TableRefImpl = class {
  [QueryBrand] = true;
  type = "table";
  sourceName;
  accessorName;
  cols;
  indexedCols;
  tableDef;
  get columns() {
    return this.tableDef.columns;
  }
  get indexes() {
    return this.tableDef.indexes;
  }
  get rowType() {
    return this.tableDef.rowType;
  }
  get constraints() {
    return this.tableDef.constraints;
  }
  constructor(tableDef) {
    this.sourceName = tableDef.sourceName;
    this.accessorName = tableDef.accessorName;
    this.cols = createRowExpr(tableDef);
    this.indexedCols = this.cols;
    this.tableDef = tableDef;
    Object.freeze(this);
  }
  asFrom() {
    return new FromBuilder(this);
  }
  rightSemijoin(other, on) {
    return this.asFrom().rightSemijoin(other, on);
  }
  leftSemijoin(other, on) {
    return this.asFrom().leftSemijoin(other, on);
  }
  build() {
    return this.asFrom().build();
  }
  toSql() {
    return this.asFrom().toSql();
  }
  where(predicate) {
    return this.asFrom().where(predicate);
  }
};
function createTableRefFromDef(tableDef) {
  return new TableRefImpl(tableDef);
}
function makeQueryBuilder(schema2) {
  const qb = /* @__PURE__ */ Object.create(null);
  for (const table2 of Object.values(schema2.tables)) {
    const ref = createTableRefFromDef(table2);
    qb[table2.accessorName] = ref;
  }
  return Object.freeze(qb);
}
function makeFromBuilder(tables) {
  const result = /* @__PURE__ */ Object.create(null);
  const namespaces = /* @__PURE__ */ Object.create(null);
  for (const table2 of Object.values(tables)) {
    const dotIdx = table2.sourceName.indexOf(".");
    if (dotIdx === -1) {
      result[table2.accessorName] = createTableRefFromDef(table2);
    } else {
      const ns = table2.sourceName.slice(0, dotIdx);
      const key = table2.sourceName.slice(dotIdx + 1);
      (namespaces[ns] ??= /* @__PURE__ */ Object.create(null))[key] = createTableRefFromDef(table2);
    }
  }
  for (const [ns, nsTables] of Object.entries(namespaces)) {
    result[ns] = Object.freeze(nsTables);
  }
  return Object.freeze(result);
}
function createRowExpr(tableDef) {
  const row = {};
  for (const columnName of Object.keys(tableDef.columns)) {
    const columnBuilder = tableDef.columns[columnName];
    const column = new ColumnExpression(tableDef.sourceName, columnName, columnBuilder.typeBuilder.algebraicType, columnBuilder.columnMetadata.name);
    row[columnName] = Object.freeze(column);
  }
  return Object.freeze(row);
}
function renderSelectSqlWithJoins(table2, where, extraClauses = []) {
  const quotedTable = quoteIdentifier(table2.sourceName);
  const sql = `SELECT * FROM ${quotedTable}`;
  const clauses = [];
  if (where)
    clauses.push(booleanExprToSql(where));
  clauses.push(...extraClauses);
  if (clauses.length === 0)
    return sql;
  const whereSql = clauses.length === 1 ? clauses[0] : clauses.map(wrapInParens).join(" AND ");
  return `${sql} WHERE ${whereSql}`;
}
var ColumnExpression = class {
  type = "column";
  column;
  columnName;
  table;
  tsValueType;
  spacetimeType;
  constructor(table2, column, spacetimeType, columnName) {
    this.table = table2;
    this.column = column;
    this.columnName = columnName || column;
    this.spacetimeType = spacetimeType;
  }
  eq(x) {
    return new BooleanExpr({
      type: "eq",
      left: this,
      right: normalizeValue(x)
    });
  }
  ne(x) {
    return new BooleanExpr({
      type: "ne",
      left: this,
      right: normalizeValue(x)
    });
  }
  lt(x) {
    return new BooleanExpr({
      type: "lt",
      left: this,
      right: normalizeValue(x)
    });
  }
  lte(x) {
    return new BooleanExpr({
      type: "lte",
      left: this,
      right: normalizeValue(x)
    });
  }
  gt(x) {
    return new BooleanExpr({
      type: "gt",
      left: this,
      right: normalizeValue(x)
    });
  }
  gte(x) {
    return new BooleanExpr({
      type: "gte",
      left: this,
      right: normalizeValue(x)
    });
  }
};
function literal(value) {
  return { type: "literal", value };
}
function normalizeValue(val) {
  if (val.type === "literal")
    return val;
  if (typeof val === "object" && val != null && "type" in val && val.type === "column") {
    return val;
  }
  return literal(val);
}
function normalizePredicateExpr(value) {
  if (value instanceof BooleanExpr)
    return value;
  if (typeof value === "boolean") {
    return new BooleanExpr({
      type: "eq",
      left: literal(value),
      right: literal(true)
    });
  }
  return new BooleanExpr({
    type: "eq",
    left: value,
    right: literal(true)
  });
}
var BooleanExpr = class _BooleanExpr {
  constructor(data) {
    this.data = data;
  }
  and(other) {
    return new _BooleanExpr({
      type: "and",
      clauses: [this.data, other.data]
    });
  }
  or(other) {
    return new _BooleanExpr({
      type: "or",
      clauses: [this.data, other.data]
    });
  }
  not() {
    return new _BooleanExpr({ type: "not", clause: this.data });
  }
};
function booleanExprToSql(expr, tableAlias) {
  const data = expr instanceof BooleanExpr ? expr.data : expr;
  switch (data.type) {
    case "eq":
      return `${valueExprToSql(data.left)} = ${valueExprToSql(data.right)}`;
    case "ne":
      return `${valueExprToSql(data.left)} <> ${valueExprToSql(data.right)}`;
    case "gt":
      return `${valueExprToSql(data.left)} > ${valueExprToSql(data.right)}`;
    case "gte":
      return `${valueExprToSql(data.left)} >= ${valueExprToSql(data.right)}`;
    case "lt":
      return `${valueExprToSql(data.left)} < ${valueExprToSql(data.right)}`;
    case "lte":
      return `${valueExprToSql(data.left)} <= ${valueExprToSql(data.right)}`;
    case "and":
      return data.clauses.map((c) => booleanExprToSql(c)).map(wrapInParens).join(" AND ");
    case "or":
      return data.clauses.map((c) => booleanExprToSql(c)).map(wrapInParens).join(" OR ");
    case "not":
      return `NOT ${wrapInParens(booleanExprToSql(data.clause))}`;
  }
}
function wrapInParens(sql) {
  return `(${sql})`;
}
function valueExprToSql(expr, tableAlias) {
  if (isLiteralExpr(expr)) {
    return literalValueToSql(expr.value);
  }
  const table2 = expr.table;
  return `${quoteIdentifier(table2)}.${quoteIdentifier(expr.columnName)}`;
}
function literalValueToSql(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (value instanceof Identity || value instanceof ConnectionId || value instanceof Uuid) {
    return `0x${value.toHexString()}`;
  }
  if (value instanceof Timestamp) {
    return `'${value.toISOString()}'`;
  }
  switch (typeof value) {
    case "number":
    case "bigint":
      return String(value);
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "string":
      return `'${value.replace(/'/g, "''")}'`;
    default:
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
}
function quoteIdentifier(name) {
  return name.split(".").map((part) => `"${part.replace(/"/g, '""')}"`).join(".");
}
function isLiteralExpr(expr) {
  return expr.type === "literal";
}
function set(x, t2) {
  return { ...x, ...t2 };
}
var TypeBuilder = class {
  type;
  algebraicType;
  constructor(algebraicType) {
    this.algebraicType = algebraicType;
  }
  optional() {
    return new OptionBuilder(this);
  }
  serialize(writer, value) {
    const serialize = this.serialize = AlgebraicType.makeSerializer(this.algebraicType);
    serialize(writer, value);
  }
  deserialize(reader) {
    const deserialize = this.deserialize = AlgebraicType.makeDeserializer(this.algebraicType);
    return deserialize(reader);
  }
};
var U8Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U8);
  }
  index(algorithm = "btree") {
    return new U8ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U8ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U8ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U16Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U16);
  }
  index(algorithm = "btree") {
    return new U16ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U16ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U16ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U32);
  }
  index(algorithm = "btree") {
    return new U32ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U64);
  }
  index(algorithm = "btree") {
    return new U64ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U128Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U128);
  }
  index(algorithm = "btree") {
    return new U128ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U128ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U128ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U256Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U256);
  }
  index(algorithm = "btree") {
    return new U256ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U256ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U256ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I8Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I8);
  }
  index(algorithm = "btree") {
    return new I8ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I8ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I8ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I16Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I16);
  }
  index(algorithm = "btree") {
    return new I16ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I16ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I16ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I32);
  }
  index(algorithm = "btree") {
    return new I32ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I64);
  }
  index(algorithm = "btree") {
    return new I64ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I128Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I128);
  }
  index(algorithm = "btree") {
    return new I128ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I128ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I128ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I256Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I256);
  }
  index(algorithm = "btree") {
    return new I256ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I256ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I256ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var F32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.F32);
  }
  default(value) {
    return new F32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new F32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var F64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.F64);
  }
  default(value) {
    return new F64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new F64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var BoolBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.Bool);
  }
  index(algorithm = "btree") {
    return new BoolColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new BoolColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new BoolColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new BoolColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new BoolColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var StringBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.String);
  }
  index(algorithm = "btree") {
    return new StringColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new StringColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new StringColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new StringColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new StringColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ArrayBuilder = class extends TypeBuilder {
  element;
  constructor(element) {
    super(AlgebraicType.Array(element.algebraicType));
    this.element = element;
  }
  default(value) {
    return new ArrayColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ArrayColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ByteArrayBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.Array(AlgebraicType.U8));
  }
  default(value) {
    return new ByteArrayColumnBuilder(set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ByteArrayColumnBuilder(set(defaultMetadata, { name }));
  }
};
var OptionBuilder = class extends TypeBuilder {
  value;
  constructor(value) {
    super(Option.getAlgebraicType(value.algebraicType));
    this.value = value;
  }
  default(value) {
    return new OptionColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new OptionColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ProductBuilder = class extends TypeBuilder {
  typeName;
  elements;
  constructor(elements, name) {
    function elementsArrayFromElementsObj(obj) {
      return Object.keys(obj).map((key) => ({
        name: key,
        get algebraicType() {
          return obj[key].algebraicType;
        }
      }));
    }
    super(AlgebraicType.Product({
      elements: elementsArrayFromElementsObj(elements)
    }));
    this.typeName = name;
    this.elements = elements;
  }
  default(value) {
    return new ProductColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ProductColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ResultBuilder = class extends TypeBuilder {
  ok;
  err;
  constructor(ok, err) {
    super(Result.getAlgebraicType(ok.algebraicType, err.algebraicType));
    this.ok = ok;
    this.err = err;
  }
  default(value) {
    return new ResultColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
};
var UnitBuilder = class extends TypeBuilder {
  constructor() {
    super({ tag: "Product", value: { elements: [] } });
  }
};
var RowBuilder = class extends TypeBuilder {
  row;
  typeName;
  constructor(row, name) {
    const mappedRow = Object.fromEntries(Object.entries(row).map(([colName, builder]) => [
      colName,
      builder instanceof ColumnBuilder ? builder : new ColumnBuilder(builder, {})
    ]));
    const elements = Object.keys(mappedRow).map((name2) => ({
      name: name2,
      get algebraicType() {
        return mappedRow[name2].typeBuilder.algebraicType;
      }
    }));
    super(AlgebraicType.Product({ elements }));
    this.row = mappedRow;
    this.typeName = name;
  }
};
var SumBuilderImpl = class extends TypeBuilder {
  variants;
  typeName;
  constructor(variants, name) {
    function variantsArrayFromVariantsObj(variants2) {
      return Object.keys(variants2).map((key) => ({
        name: key,
        get algebraicType() {
          return variants2[key].algebraicType;
        }
      }));
    }
    super(AlgebraicType.Sum({
      variants: variantsArrayFromVariantsObj(variants)
    }));
    this.variants = variants;
    this.typeName = name;
    for (const key of Object.keys(variants)) {
      const desc = Object.getOwnPropertyDescriptor(variants, key);
      const isAccessor = !!desc && (typeof desc.get === "function" || typeof desc.set === "function");
      let isUnit2 = false;
      if (!isAccessor) {
        const variant = variants[key];
        isUnit2 = variant instanceof UnitBuilder;
      }
      if (isUnit2) {
        const constant = this.create(key);
        Object.defineProperty(this, key, {
          value: constant,
          writable: false,
          enumerable: true,
          configurable: false
        });
      } else {
        const fn = (value) => this.create(key, value);
        Object.defineProperty(this, key, {
          value: fn,
          writable: false,
          enumerable: true,
          configurable: false
        });
      }
    }
  }
  create(tag, value) {
    return value === undefined ? { tag } : { tag, value };
  }
  default(value) {
    return new SumColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new SumColumnBuilder(this, set(defaultMetadata, { name }));
  }
  index(algorithm = "btree") {
    return new SumColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new SumColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
};
var SumBuilder = SumBuilderImpl;
var SimpleSumBuilderImpl = class extends SumBuilderImpl {
  index(algorithm = "btree") {
    return new SimpleSumColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new SimpleSumColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
};
var ScheduleAtBuilder = class extends TypeBuilder {
  constructor() {
    super(schedule_at_default.getAlgebraicType());
  }
  default(value) {
    return new ScheduleAtColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ScheduleAtColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var IdentityBuilder = class extends TypeBuilder {
  constructor() {
    super(Identity.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ConnectionIdBuilder = class extends TypeBuilder {
  constructor() {
    super(ConnectionId.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var TimestampBuilder = class extends TypeBuilder {
  constructor() {
    super(Timestamp.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var TimeDurationBuilder = class extends TypeBuilder {
  constructor() {
    super(TimeDuration.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var UuidBuilder = class extends TypeBuilder {
  constructor() {
    super(Uuid.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new UuidColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new UuidColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new UuidColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var defaultMetadata = {};
var ColumnBuilder = class {
  typeBuilder;
  columnMetadata;
  constructor(typeBuilder, metadata) {
    this.typeBuilder = typeBuilder;
    this.columnMetadata = metadata;
  }
  serialize(writer, value) {
    this.typeBuilder.serialize(writer, value);
  }
  deserialize(reader) {
    return this.typeBuilder.deserialize(reader);
  }
};
var U8ColumnBuilder = class _U8ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U16ColumnBuilder = class _U16ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U32ColumnBuilder = class _U32ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U64ColumnBuilder = class _U64ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U128ColumnBuilder = class _U128ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U256ColumnBuilder = class _U256ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I8ColumnBuilder = class _I8ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I16ColumnBuilder = class _I16ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I32ColumnBuilder = class _I32ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I64ColumnBuilder = class _I64ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I128ColumnBuilder = class _I128ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I256ColumnBuilder = class _I256ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var F32ColumnBuilder = class _F32ColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _F32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _F32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var F64ColumnBuilder = class _F64ColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _F64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _F64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var BoolColumnBuilder = class _BoolColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var StringColumnBuilder = class _StringColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ArrayColumnBuilder = class _ArrayColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ArrayColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _ArrayColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ByteArrayColumnBuilder = class _ByteArrayColumnBuilder extends ColumnBuilder {
  constructor(metadata) {
    super(new TypeBuilder(AlgebraicType.Array(AlgebraicType.U8)), metadata);
  }
  default(value) {
    return new _ByteArrayColumnBuilder(set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ByteArrayColumnBuilder(set(this.columnMetadata, { name }));
  }
};
var OptionColumnBuilder = class _OptionColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _OptionColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _OptionColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ResultColumnBuilder = class _ResultColumnBuilder extends ColumnBuilder {
  constructor(typeBuilder, metadata) {
    super(typeBuilder, metadata);
  }
  default(value) {
    return new _ResultColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
};
var ProductColumnBuilder = class _ProductColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ProductColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ProductColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var SumColumnBuilder = class _SumColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
  index(algorithm = "btree") {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
};
var SimpleSumColumnBuilder = class _SimpleSumColumnBuilder extends SumColumnBuilder {
  index(algorithm = "btree") {
    return new _SimpleSumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new _SimpleSumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
};
var ScheduleAtColumnBuilder = class _ScheduleAtColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ScheduleAtColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ScheduleAtColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var IdentityColumnBuilder = class _IdentityColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ConnectionIdColumnBuilder = class _ConnectionIdColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var TimestampColumnBuilder = class _TimestampColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var TimeDurationColumnBuilder = class _TimeDurationColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var UuidColumnBuilder = class _UuidColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var RefBuilder = class extends TypeBuilder {
  ref;
  __spacetimeType;
  constructor(ref) {
    super(AlgebraicType.Ref(ref));
    this.ref = ref;
  }
};
var enumImpl = (nameOrObj, maybeObj) => {
  let obj = nameOrObj;
  let name = undefined;
  if (typeof nameOrObj === "string") {
    if (!maybeObj) {
      throw new TypeError("When providing a name, you must also provide the variants object or array.");
    }
    obj = maybeObj;
    name = nameOrObj;
  }
  if (Array.isArray(obj)) {
    const simpleVariantsObj = {};
    for (const variant of obj) {
      simpleVariantsObj[variant] = new UnitBuilder;
    }
    return new SimpleSumBuilderImpl(simpleVariantsObj, name);
  }
  return new SumBuilder(obj, name);
};
var t = {
  bool: () => new BoolBuilder,
  string: () => new StringBuilder,
  number: () => new F64Builder,
  i8: () => new I8Builder,
  u8: () => new U8Builder,
  i16: () => new I16Builder,
  u16: () => new U16Builder,
  i32: () => new I32Builder,
  u32: () => new U32Builder,
  i64: () => new I64Builder,
  u64: () => new U64Builder,
  i128: () => new I128Builder,
  u128: () => new U128Builder,
  i256: () => new I256Builder,
  u256: () => new U256Builder,
  f32: () => new F32Builder,
  f64: () => new F64Builder,
  object: (nameOrObj, maybeObj) => {
    if (typeof nameOrObj === "string") {
      if (!maybeObj) {
        throw new TypeError("When providing a name, you must also provide the object.");
      }
      return new ProductBuilder(maybeObj, nameOrObj);
    }
    return new ProductBuilder(nameOrObj, undefined);
  },
  row: (nameOrObj, maybeObj) => {
    const [obj, name] = typeof nameOrObj === "string" ? [maybeObj, nameOrObj] : [nameOrObj, undefined];
    return new RowBuilder(obj, name);
  },
  array(e) {
    return new ArrayBuilder(e);
  },
  enum: enumImpl,
  unit() {
    return new UnitBuilder;
  },
  lazy(thunk) {
    let cached = null;
    const get = () => cached ??= thunk();
    const proxy = new Proxy({}, {
      get(_t, prop, recv) {
        const target = get();
        const val = Reflect.get(target, prop, recv);
        return typeof val === "function" ? val.bind(target) : val;
      },
      set(_t, prop, value, recv) {
        return Reflect.set(get(), prop, value, recv);
      },
      has(_t, prop) {
        return prop in get();
      },
      ownKeys() {
        return Reflect.ownKeys(get());
      },
      getOwnPropertyDescriptor(_t, prop) {
        return Object.getOwnPropertyDescriptor(get(), prop);
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(get());
      }
    });
    return proxy;
  },
  scheduleAt: () => {
    return new ScheduleAtBuilder;
  },
  option(value) {
    return new OptionBuilder(value);
  },
  result(ok, err) {
    return new ResultBuilder(ok, err);
  },
  identity: () => {
    return new IdentityBuilder;
  },
  connectionId: () => {
    return new ConnectionIdBuilder;
  },
  timestamp: () => {
    return new TimestampBuilder;
  },
  timeDuration: () => {
    return new TimeDurationBuilder;
  },
  uuid: () => {
    return new UuidBuilder;
  },
  byteArray: () => {
    return new ByteArrayBuilder;
  }
};
var BsatnRowList = t.object("BsatnRowList", {
  get sizeHint() {
    return RowSizeHint;
  },
  rowsData: t.byteArray()
});
var CallProcedure = t.object("CallProcedure", {
  requestId: t.u32(),
  flags: t.u8(),
  procedure: t.string(),
  args: t.byteArray()
});
var CallReducer = t.object("CallReducer", {
  requestId: t.u32(),
  flags: t.u8(),
  reducer: t.string(),
  args: t.byteArray()
});
var ClientMessage = t.enum("ClientMessage", {
  get Subscribe() {
    return Subscribe;
  },
  get Unsubscribe() {
    return Unsubscribe;
  },
  get OneOffQuery() {
    return OneOffQuery;
  },
  get CallReducer() {
    return CallReducer;
  },
  get CallProcedure() {
    return CallProcedure;
  }
});
var EventTableRows = t.object("EventTableRows", {
  get events() {
    return BsatnRowList;
  }
});
var InitialConnection = t.object("InitialConnection", {
  identity: t.identity(),
  connectionId: t.connectionId(),
  token: t.string()
});
var OneOffQuery = t.object("OneOffQuery", {
  requestId: t.u32(),
  queryString: t.string()
});
var OneOffQueryResult = t.object("OneOffQueryResult", {
  requestId: t.u32(),
  get result() {
    return t.result(QueryRows, t.string());
  }
});
var PersistentTableRows = t.object("PersistentTableRows", {
  get inserts() {
    return BsatnRowList;
  },
  get deletes() {
    return BsatnRowList;
  }
});
var ProcedureResult = t.object("ProcedureResult", {
  get status() {
    return ProcedureStatus;
  },
  timestamp: t.timestamp(),
  totalHostExecutionDuration: t.timeDuration(),
  requestId: t.u32()
});
var ProcedureStatus = t.enum("ProcedureStatus", {
  Returned: t.byteArray(),
  InternalError: t.string()
});
var QueryRows = t.object("QueryRows", {
  get tables() {
    return t.array(SingleTableRows);
  }
});
var QuerySetId = t.object("QuerySetId", {
  id: t.u32()
});
var QuerySetUpdate = t.object("QuerySetUpdate", {
  get querySetId() {
    return QuerySetId;
  },
  get tables() {
    return t.array(TableUpdate);
  }
});
var ReducerOk = t.object("ReducerOk", {
  retValue: t.byteArray(),
  get transactionUpdate() {
    return TransactionUpdate;
  }
});
var ReducerOutcome = t.enum("ReducerOutcome", {
  get Ok() {
    return ReducerOk;
  },
  OkEmpty: t.unit(),
  Err: t.byteArray(),
  InternalError: t.string()
});
var ReducerResult = t.object("ReducerResult", {
  requestId: t.u32(),
  timestamp: t.timestamp(),
  get result() {
    return ReducerOutcome;
  }
});
var RowSizeHint = t.enum("RowSizeHint", {
  FixedSize: t.u16(),
  RowOffsets: t.array(t.u64())
});
var ServerMessage = t.enum("ServerMessage", {
  get InitialConnection() {
    return InitialConnection;
  },
  get SubscribeApplied() {
    return SubscribeApplied;
  },
  get UnsubscribeApplied() {
    return UnsubscribeApplied;
  },
  get SubscriptionError() {
    return SubscriptionError;
  },
  get TransactionUpdate() {
    return TransactionUpdate;
  },
  get OneOffQueryResult() {
    return OneOffQueryResult;
  },
  get ReducerResult() {
    return ReducerResult;
  },
  get ProcedureResult() {
    return ProcedureResult;
  }
});
var SingleTableRows = t.object("SingleTableRows", {
  table: t.string(),
  get rows() {
    return BsatnRowList;
  }
});
var Subscribe = t.object("Subscribe", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  queryStrings: t.array(t.string())
});
var SubscribeApplied = t.object("SubscribeApplied", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get rows() {
    return QueryRows;
  }
});
var SubscriptionError = t.object("SubscriptionError", {
  requestId: t.option(t.u32()),
  get querySetId() {
    return QuerySetId;
  },
  error: t.string()
});
var TableUpdate = t.object("TableUpdate", {
  tableName: t.string(),
  get rows() {
    return t.array(TableUpdateRows);
  }
});
var TableUpdateRows = t.enum("TableUpdateRows", {
  get PersistentTable() {
    return PersistentTableRows;
  },
  get EventTable() {
    return EventTableRows;
  }
});
var TransactionUpdate = t.object("TransactionUpdate", {
  get querySets() {
    return t.array(QuerySetUpdate);
  }
});
var Unsubscribe = t.object("Unsubscribe", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get flags() {
    return UnsubscribeFlags;
  }
});
var UnsubscribeApplied = t.object("UnsubscribeApplied", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get rows() {
    return t.option(QueryRows);
  }
});
var UnsubscribeFlags = t.enum("UnsubscribeFlags", {
  Default: t.unit(),
  SendDroppedRows: t.unit()
});
var EventEmitter = class {
  #events = /* @__PURE__ */ new Map;
  on(event, callback) {
    let callbacks = this.#events.get(event);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set;
      this.#events.set(event, callbacks);
    }
    callbacks.add(callback);
  }
  off(event, callback) {
    const callbacks = this.#events.get(event);
    if (!callbacks) {
      return;
    }
    callbacks.delete(callback);
  }
  emit(event, ...args) {
    const callbacks = this.#events.get(event);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(...args);
    }
  }
};
var LogLevelIdentifierIcon = {
  component: "\uD83D\uDCE6",
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
  debug: "\uD83D\uDC1B",
  trace: "\uD83D\uDD0D"
};
var LogStyle = {
  component: "color: #fff; background-color: #8D6FDD; padding: 2px 5px; border-radius: 3px;",
  info: "color: #fff; background-color: #007bff; padding: 2px 5px; border-radius: 3px;",
  warn: "color: #fff; background-color: #ffc107; padding: 2px 5px; border-radius: 3px;",
  error: "color: #fff; background-color: #dc3545; padding: 2px 5px; border-radius: 3px;",
  debug: "color: #fff; background-color: #28a745; padding: 2px 5px; border-radius: 3px;",
  trace: "color: #fff; background-color: #17a2b8; padding: 2px 5px; border-radius: 3px;"
};
var LogTextStyle = {
  component: "color: #8D6FDD;",
  info: "color: #007bff;",
  warn: "color: #ffc107;",
  error: "color: #dc3545;",
  debug: "color: #28a745;",
  trace: "color: #17a2b8;"
};
var LogLevelRank = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};
var globalLogLevel = "info";
var shouldLog = (level) => LogLevelRank[level] <= LogLevelRank[globalLogLevel];
var resolveLazy = (v) => typeof v === "function" ? v() : v;
var toHex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
var ARRAY_TRUNCATION_THRESHOLD = 25;
var ARRAY_PREVIEW_COUNT = 10;
var SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "token",
  "authToken",
  "authorization",
  "accessToken",
  "refreshToken"
]);
var stringify2 = (value) => stringify(value, (key, current) => {
  if (SENSITIVE_KEYS.has(key)) {
    return "[REDACTED]";
  }
  if (current && typeof current === "object" && "__identity__" in current && typeof current.__identity__ === "bigint") {
    return u256ToHexString(current.__identity__);
  }
  if (current && typeof current === "object" && "__connection_id__" in current && typeof current.__connection_id__ === "bigint") {
    return u128ToHexString(current.__connection_id__);
  }
  if (current instanceof Uint8Array) {
    if (current.length < 25) {
      return `0x${toHex(current)}`;
    }
    const head = current.subarray(0, 10);
    return `Uint8Array(len=${current.length}, head=0x${toHex(head)})`;
  }
  if (Array.isArray(current) && current.length >= ARRAY_TRUNCATION_THRESHOLD) {
    const head = stringify(current.slice(0, ARRAY_PREVIEW_COUNT));
    return `Array(len=${current.length}, head=${head ?? "[]"})`;
  }
  return current;
});
var stdbLogger = (level, message, ...args) => {
  if (!shouldLog(level)) {
    return;
  }
  const resolvedMessage = resolveLazy(message);
  const resolvedArgs = args.map(resolveLazy);
  console.log(`%c${LogLevelIdentifierIcon[level]} ${level.toUpperCase()}%c ${resolvedMessage}`, LogStyle[level], LogTextStyle[level], ...resolvedArgs);
};
var scalarCompare = (x, y) => {
  if (x === y)
    return 0;
  return x < y ? -1 : 1;
};
var TableCacheImpl = class {
  hasPrimaryKey;
  rows;
  tableDef;
  emitter;
  constructor(tableDef) {
    this.tableDef = tableDef;
    this.rows = /* @__PURE__ */ new Map;
    this.emitter = new EventEmitter;
    this.hasPrimaryKey = Object.values(this.tableDef.columns).some((col) => col.columnMetadata.isPrimaryKey === true);
    for (const idxDef of this.tableDef.resolvedIndexes) {
      const index = this.#makeReadonlyIndex(this.tableDef, idxDef);
      this[idxDef.name] = index;
    }
  }
  #makeReadonlyIndex(tableDef, idx) {
    if (idx.algorithm !== "btree") {
      throw new Error("Only btree indexes are supported in TableCacheImpl");
    }
    const columns = idx.columns;
    const getKey = (row) => columns.map((c) => row[c]);
    const matchRange = (row, rangeArg) => {
      const key = getKey(row);
      const arr = Array.isArray(rangeArg) ? rangeArg : [rangeArg];
      const prefixLen = Math.max(0, arr.length - 1);
      for (let i2 = 0;i2 < prefixLen; i2++) {
        if (!deepEqual(key[i2], arr[i2]))
          return false;
      }
      const lastProvided = arr[arr.length - 1];
      const kLast = key[prefixLen];
      if (lastProvided && typeof lastProvided === "object" && "from" in lastProvided && "to" in lastProvided) {
        const from = lastProvided.from;
        const to = lastProvided.to;
        if (from.tag !== "unbounded") {
          const c = scalarCompare(kLast, from.value);
          if (c < 0)
            return false;
          if (c === 0 && from.tag === "excluded")
            return false;
        }
        if (to.tag !== "unbounded") {
          const c = scalarCompare(kLast, to.value);
          if (c > 0)
            return false;
          if (c === 0 && to.tag === "excluded")
            return false;
        }
        return true;
      } else {
        if (!deepEqual(kLast, lastProvided))
          return false;
        return true;
      }
    };
    const isUnique = tableDef.constraints.some((constraint) => {
      if (constraint.constraint !== "unique") {
        return false;
      }
      return deepEqual(constraint.columns, idx.columns);
    });
    const self = this;
    if (isUnique) {
      const impl = {
        find: (colVal) => {
          const expected = Array.isArray(colVal) ? colVal : [colVal];
          for (const row of self.iter()) {
            if (deepEqual(getKey(row), expected))
              return row;
          }
          return null;
        }
      };
      return impl;
    } else {
      const impl = {
        *filter(range) {
          for (const row of self.iter()) {
            if (matchRange(row, range))
              yield row;
          }
        }
      };
      return impl;
    }
  }
  count() {
    return BigInt(this.rows.size);
  }
  iter() {
    function* generator(rows) {
      for (const [row] of rows.values()) {
        yield row;
      }
    }
    return generator(this.rows);
  }
  [Symbol.iterator]() {
    return this.iter();
  }
  applyOperations = (operations, ctx) => {
    const pendingCallbacks = [];
    if (this.tableDef.isEvent) {
      for (const op of operations) {
        if (op.type === "insert") {
          pendingCallbacks.push({
            type: "insert",
            table: this.tableDef.sourceName,
            cb: () => {
              this.emitter.emit("insert", ctx, op.row);
            }
          });
        }
      }
      return pendingCallbacks;
    }
    if (this.hasPrimaryKey) {
      const insertMap = /* @__PURE__ */ new Map;
      const deleteMap = /* @__PURE__ */ new Map;
      for (const op of operations) {
        if (op.type === "insert") {
          const [_, prevCount] = insertMap.get(op.rowId) || [op, 0];
          insertMap.set(op.rowId, [op, prevCount + 1]);
        } else {
          const [_, prevCount] = deleteMap.get(op.rowId) || [op, 0];
          deleteMap.set(op.rowId, [op, prevCount + 1]);
        }
      }
      for (const [primaryKey, [insertOp, refCount]] of insertMap) {
        const deleteEntry = deleteMap.get(primaryKey);
        if (deleteEntry) {
          const [_, deleteCount] = deleteEntry;
          const refCountDelta = refCount - deleteCount;
          const maybeCb = this.update(ctx, primaryKey, insertOp.row, refCountDelta);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
          deleteMap.delete(primaryKey);
        } else {
          const maybeCb = this.insert(ctx, insertOp, refCount);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        }
      }
      for (const [deleteOp, refCount] of deleteMap.values()) {
        const maybeCb = this.delete(ctx, deleteOp, refCount);
        if (maybeCb) {
          pendingCallbacks.push(maybeCb);
        }
      }
    } else {
      for (const op of operations) {
        if (op.type === "insert") {
          const maybeCb = this.insert(ctx, op);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        } else {
          const maybeCb = this.delete(ctx, op);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        }
      }
    }
    return pendingCallbacks;
  };
  update = (ctx, rowId, newRow, refCountDelta = 0) => {
    const existingEntry = this.rows.get(rowId);
    if (!existingEntry) {
      stdbLogger("error", `Updating a row that was not present in the cache. Table: ${this.tableDef.sourceName}, RowId: ${rowId}`);
      return;
    }
    const [oldRow, previousCount] = existingEntry;
    const refCount = Math.max(1, previousCount + refCountDelta);
    if (previousCount + refCountDelta <= 0) {
      stdbLogger("error", `Negative reference count for in table ${this.tableDef.sourceName} row ${rowId} (${previousCount} + ${refCountDelta})`);
      return;
    }
    this.rows.set(rowId, [newRow, refCount]);
    if (previousCount === 0) {
      stdbLogger("error", `Updating a row id in table ${this.tableDef.sourceName} which was not present in the cache (rowId: ${rowId})`);
      return {
        type: "insert",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("insert", ctx, newRow);
        }
      };
    }
    return {
      type: "update",
      table: this.tableDef.sourceName,
      cb: () => {
        this.emitter.emit("update", ctx, oldRow, newRow);
      }
    };
  };
  insert = (ctx, operation, count = 1) => {
    const [_, previousCount] = this.rows.get(operation.rowId) || [
      operation.row,
      0
    ];
    this.rows.set(operation.rowId, [operation.row, previousCount + count]);
    if (previousCount === 0) {
      return {
        type: "insert",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("insert", ctx, operation.row);
        }
      };
    }
    return;
  };
  delete = (ctx, operation, count = 1) => {
    const [_, previousCount] = this.rows.get(operation.rowId) || [
      operation.row,
      0
    ];
    if (previousCount === 0) {
      stdbLogger("warn", "Deleting a row that was not present in the cache");
      return;
    }
    if (previousCount <= count) {
      this.rows.delete(operation.rowId);
      return {
        type: "delete",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("delete", ctx, operation.row);
        }
      };
    }
    this.rows.set(operation.rowId, [operation.row, previousCount - count]);
    return;
  };
  onInsert = (cb) => {
    this.emitter.on("insert", cb);
  };
  onDelete = (cb) => {
    this.emitter.on("delete", cb);
  };
  onUpdate = (cb) => {
    this.emitter.on("update", cb);
  };
  removeOnInsert = (cb) => {
    this.emitter.off("insert", cb);
  };
  removeOnDelete = (cb) => {
    this.emitter.off("delete", cb);
  };
  removeOnUpdate = (cb) => {
    this.emitter.off("update", cb);
  };
};
var TableMap = class {
  map = /* @__PURE__ */ new Map;
  get(key) {
    return this.map.get(key);
  }
  set(key, value) {
    this.map.set(key, value);
    return this;
  }
  has(key) {
    return this.map.has(key);
  }
  delete(key) {
    return this.map.delete(key);
  }
  keys() {
    return this.map.keys();
  }
  values() {
    return this.map.values();
  }
  entries() {
    return this.map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
var ClientCache = class {
  tables = new TableMap;
  getTable(name) {
    const table2 = this.tables.get(name);
    if (!table2) {
      console.error("The table has not been registered for this client. Please register the table before using it. If you have registered global tables using the SpacetimeDBClient.registerTables() or `registerTable()` method, please make sure that is executed first!");
      throw new Error(`Table ${String(name)} does not exist`);
    }
    return table2;
  }
  getOrCreateTable(tableDef) {
    const name = tableDef.accessorName;
    const table2 = this.tables.get(name);
    if (table2) {
      return table2;
    }
    const newTable = new TableCacheImpl(tableDef);
    this.tables.set(name, newTable);
    return newTable;
  }
};
function comparePreReleases(a, b) {
  const len2 = Math.min(a.length, b.length);
  for (let i2 = 0;i2 < len2; i2++) {
    const aPart = a[i2];
    const bPart = b[i2];
    if (aPart === bPart)
      continue;
    if (typeof aPart === "number" && typeof bPart === "number") {
      return aPart - bPart;
    }
    if (typeof aPart === "string" && typeof bPart === "string") {
      return aPart.localeCompare(bPart);
    }
    return typeof aPart === "string" ? 1 : -1;
  }
  return a.length - b.length;
}
var SemanticVersion = class _SemanticVersion {
  major;
  minor;
  patch;
  preRelease;
  buildInfo;
  constructor(major, minor, patch, preRelease = null, buildInfo = null) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.preRelease = preRelease;
    this.buildInfo = buildInfo;
  }
  toString() {
    let versionString = `${this.major}.${this.minor}.${this.patch}`;
    if (this.preRelease) {
      versionString += `-${this.preRelease.join(".")}`;
    }
    if (this.buildInfo) {
      versionString += `+${this.buildInfo}`;
    }
    return versionString;
  }
  compare(other) {
    if (this.major !== other.major) {
      return this.major - other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }
    if (this.patch !== other.patch) {
      return this.patch - other.patch;
    }
    if (this.preRelease && other.preRelease) {
      return comparePreReleases(this.preRelease, other.preRelease);
    }
    if (this.preRelease) {
      return -1;
    }
    if (other.preRelease) {
      return -1;
    }
    return 0;
  }
  clone() {
    return new _SemanticVersion(this.major, this.minor, this.patch, this.preRelease ? [...this.preRelease] : null, this.buildInfo);
  }
  static parseVersionString(version) {
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/;
    const match = version.match(regex);
    if (!match) {
      throw new Error(`Invalid version string: ${version}`);
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const preRelease = match[4] ? match[4].split(".").map((id) => isNaN(Number(id)) ? id : Number(id)) : null;
    const buildInfo = match[5] || null;
    return new _SemanticVersion(major, minor, patch, preRelease, buildInfo);
  }
};
var _MINIMUM_CLI_VERSION = new SemanticVersion(1, 4, 0);
function ensureMinimumVersionOrThrow(versionString) {
  if (versionString === undefined) {
    throw new Error(versionErrorMessage(versionString));
  }
  const version = SemanticVersion.parseVersionString(versionString);
  if (version.compare(_MINIMUM_CLI_VERSION) < 0) {
    throw new Error(versionErrorMessage(versionString));
  }
}
function versionErrorMessage(incompatibleVersion) {
  return `Module code was generated with an incompatible version of the spacetimedb cli (${incompatibleVersion}). Update the cli version to at least ${_MINIMUM_CLI_VERSION.toString()} and regenerate the bindings. You can upgrade to the latest cli version by running: spacetime version upgrade`;
}
async function decompress(buffer, type, chunkSize = 128 * 1024) {
  let offset = 0;
  const readableStream = new ReadableStream({
    pull(controller) {
      if (offset < buffer.length) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        controller.enqueue(chunk);
        offset += chunkSize;
      } else {
        controller.close();
      }
    }
  });
  const decompressionStream = new DecompressionStream(type);
  const decompressedStream = readableStream.pipeThrough(decompressionStream);
  const reader = decompressedStream.getReader();
  const chunks = [];
  let totalLength = 0;
  let result;
  while (!(result = await reader.read()).done) {
    chunks.push(result.value);
    totalLength += result.value.length;
  }
  const decompressedArray = new Uint8Array(totalLength);
  let chunkOffset = 0;
  for (const chunk of chunks) {
    decompressedArray.set(chunk, chunkOffset);
    chunkOffset += chunk.length;
  }
  return decompressedArray;
}
async function resolveWS() {
  if (typeof WebSocket !== "undefined") {
    return WebSocket;
  }
  const dynamicImport = new Function("m", "return import(m)");
  try {
    const { WebSocket: UndiciWS } = await dynamicImport("undici");
    return UndiciWS;
  } catch (err) {
    stdbLogger("warn", "[spacetimedb-sdk] No global WebSocket found. On Node 18–21, please install `undici` (npm install undici) to enable WebSocket support.");
    throw err;
  }
}
async function openWebSocket({
  url,
  nameOrAddress,
  wsProtocol,
  authToken,
  compression,
  lightMode,
  confirmedReads
}) {
  const headers = new Headers;
  const WS = await resolveWS();
  let temporaryAuthToken;
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
    const tokenUrl = new URL("v1/identity/websocket-token", url);
    tokenUrl.protocol = url.protocol === "wss:" ? "https:" : "http:";
    const response = await fetch(tokenUrl, { method: "POST", headers });
    if (response.ok) {
      const { token } = await response.json();
      temporaryAuthToken = token;
    } else {
      throw new Error(`Failed to verify token: ${response.statusText}`);
    }
  }
  const databaseUrl = new URL(`v1/database/${nameOrAddress}/subscribe`, url);
  if (temporaryAuthToken) {
    databaseUrl.searchParams.set("token", temporaryAuthToken);
  }
  databaseUrl.searchParams.set("compression", { gzip: "Gzip", brotli: "Brotli", none: "None" }[compression] ?? "None");
  if (lightMode) {
    databaseUrl.searchParams.set("light", "true");
  }
  if (confirmedReads !== undefined) {
    databaseUrl.searchParams.set("confirmed", confirmedReads.toString());
  }
  const ws = new WS(databaseUrl.toString(), wsProtocol);
  ws.binaryType = "arraybuffer";
  return ws;
}
var WebsocketDecompressAdapter = class _WebsocketDecompressAdapter {
  get protocol() {
    return this.#ws.protocol;
  }
  get readyState() {
    return this.#ws.readyState;
  }
  set onclose(handler) {
    this.#ws.onclose = handler;
  }
  set onopen(handler) {
    this.#ws.onopen = handler;
  }
  set onmessage(handler) {
    this.#ws.onmessage = async (msg) => {
      const data = await this.#decompress(new Uint8Array(msg.data));
      handler({ data });
    };
  }
  set onerror(handler) {
    this.#ws.onerror = handler;
  }
  #ws;
  async#decompress(buffer) {
    const tag = buffer[0];
    const data = buffer.subarray(1);
    switch (tag) {
      case 0:
        return data;
      case 1:
        return await decompress(data, "brotli");
      case 2:
        return await decompress(data, "gzip");
      default:
        throw new Error("Unexpected Compression Algorithm. Please use `gzip` or `none`");
    }
  }
  send(msg) {
    this.#ws.send(msg);
  }
  close() {
    this.#ws.close();
  }
  constructor(ws) {
    this.#ws = ws;
  }
  static async openWebSocket(args) {
    return new _WebsocketDecompressAdapter(await openWebSocket(args));
  }
};
var DbConnectionBuilder = class {
  constructor(remoteModule, dbConnectionCtor) {
    this.remoteModule = remoteModule;
    this.dbConnectionCtor = dbConnectionCtor;
    this.#createWSFn = WebsocketDecompressAdapter.openWebSocket;
  }
  #uri;
  #nameOrAddress;
  #identity;
  #token;
  #emitter = new EventEmitter;
  #compression = "gzip";
  #lightMode = false;
  #confirmedReads;
  #createWSFn;
  withUri(uri) {
    this.#uri = new URL(uri);
    return this;
  }
  withDatabaseName(nameOrAddress) {
    this.#nameOrAddress = nameOrAddress;
    return this;
  }
  withToken(token) {
    this.#token = token;
    return this;
  }
  withWSFn(createWSFn) {
    this.#createWSFn = createWSFn;
    return this;
  }
  withCompression(compression) {
    if (compression === "brotli") {
      try {
        new DecompressionStream("brotli");
      } catch (e) {
        throw new TypeError(`Brotli compression is not supported by the runtime. Please choose a different compression method.`, { cause: e });
      }
    }
    this.#compression = compression;
    return this;
  }
  withLightMode(lightMode) {
    this.#lightMode = lightMode;
    return this;
  }
  withConfirmedReads(confirmedReads) {
    this.#confirmedReads = confirmedReads;
    return this;
  }
  onConnect(callback) {
    this.#emitter.on("connect", callback);
    return this;
  }
  onConnectError(callback) {
    this.#emitter.on("connectError", callback);
    return this;
  }
  onDisconnect(callback) {
    this.#emitter.on("disconnect", callback);
    return this;
  }
  getUri() {
    return this.#uri?.toString() ?? "";
  }
  getModuleName() {
    return this.#nameOrAddress ?? "";
  }
  build() {
    if (!this.#uri) {
      throw new Error("URI is required to connect to SpacetimeDB");
    }
    if (!this.#nameOrAddress) {
      throw new Error("Database name or address is required to connect to SpacetimeDB");
    }
    ensureMinimumVersionOrThrow(this.remoteModule.versionInfo?.cliVersion);
    return this.dbConnectionCtor({
      uri: this.#uri,
      nameOrAddress: this.#nameOrAddress,
      identity: this.#identity,
      token: this.#token,
      emitter: this.#emitter,
      compression: this.#compression,
      lightMode: this.#lightMode,
      confirmedReads: this.#confirmedReads,
      createWSFn: this.#createWSFn,
      remoteModule: this.remoteModule
    });
  }
};
var INTERNAL_REMOTE_MODULE = Symbol("INTERNAL_REMOTE_MODULE");
var SubscriptionBuilderImpl = class {
  constructor(db) {
    this.db = db;
  }
  #onApplied = undefined;
  #onError = undefined;
  onApplied(cb) {
    this.#onApplied = cb;
    return this;
  }
  onError(cb) {
    this.#onError = cb;
    return this;
  }
  subscribe(query_sql) {
    let queries;
    if (typeof query_sql === "function") {
      const tables = this.db.getFromBuilder();
      const result = query_sql(tables);
      queries = Array.isArray(result) ? result : [result];
    } else {
      queries = Array.isArray(query_sql) ? query_sql : [query_sql];
    }
    if (queries.length === 0) {
      throw new Error("Subscriptions must have at least one query");
    }
    const queryStrings = queries.map((q) => {
      if (typeof q === "string")
        return q;
      if (isRowTypedQuery(q))
        return toSql(q);
      throw new Error("Subscriptions must be SQL strings or typed queries");
    });
    return new SubscriptionHandleImpl(this.db, queryStrings, this.#onApplied, this.#onError);
  }
  subscribeToAllTables() {
    const remoteModule = this.db[INTERNAL_REMOTE_MODULE]();
    const queries = Object.values(remoteModule.tables).map((table2) => `SELECT * FROM ${table2.sourceName}`);
    this.subscribe(queries);
  }
};
var SubscriptionManager = class {
  subscriptions = /* @__PURE__ */ new Map;
};
var SubscriptionHandleImpl = class {
  constructor(db, querySql, onApplied, onError) {
    this.db = db;
    this.#emitter.on("applied", (ctx) => {
      this.#activeState = true;
      if (onApplied) {
        onApplied(ctx);
      }
    });
    this.#emitter.on("error", (ctx, error) => {
      this.#activeState = false;
      this.#endedState = true;
      if (onError) {
        onError(ctx, error);
      }
    });
    this.#querySetId = this.db.registerSubscription(this, this.#emitter, querySql);
  }
  #querySetId;
  #unsubscribeCalled = false;
  #endedState = false;
  #activeState = false;
  #emitter = new EventEmitter;
  unsubscribe() {
    if (this.#unsubscribeCalled) {
      throw new Error("Unsubscribe has already been called");
    }
    this.#unsubscribeCalled = true;
    this.db.unregisterSubscription(this.#querySetId);
    this.#emitter.on("end", (_ctx) => {
      this.#endedState = true;
      this.#activeState = false;
    });
  }
  unsubscribeThen(onEnd) {
    if (this.#endedState) {
      throw new Error("Subscription has already ended");
    }
    if (this.#unsubscribeCalled) {
      throw new Error("Unsubscribe has already been called");
    }
    this.#unsubscribeCalled = true;
    this.db.unregisterSubscription(this.#querySetId);
    this.#emitter.on("end", (ctx) => {
      this.#endedState = true;
      this.#activeState = false;
      onEnd(ctx);
    });
  }
  isEnded() {
    return this.#endedState;
  }
  isActive() {
    return this.#activeState;
  }
};
var V2_WS_PROTOCOL = "v2.bsatn.spacetimedb";
var V3_WS_PROTOCOL = "v3.bsatn.spacetimedb";
var PREFERRED_WS_PROTOCOLS = [V3_WS_PROTOCOL, V2_WS_PROTOCOL];
function normalizeWsProtocol(protocol) {
  if (protocol === V3_WS_PROTOCOL) {
    return V3_WS_PROTOCOL;
  }
  if (protocol === "" || protocol === V2_WS_PROTOCOL) {
    return V2_WS_PROTOCOL;
  }
  stdbLogger("warn", `Unexpected websocket subprotocol "${protocol}", falling back to ${V2_WS_PROTOCOL}.`);
  return V2_WS_PROTOCOL;
}
var EMPTY_V3_PAYLOAD_ERR = "v3 websocket payloads must contain at least one message";
function ensureMessages(messages) {
  if (messages.length === 0) {
    throw new RangeError(EMPTY_V3_PAYLOAD_ERR);
  }
}
function ensureMessageCount(messages, messageCount) {
  ensureMessages(messages);
  if (messageCount < 1 || messageCount > messages.length) {
    throw new RangeError(`v3 websocket payload requested ${messageCount} messages from ${messages.length}`);
  }
}
function concatenateMessagesV3(writer, messages, messageCount = messages.length) {
  ensureMessageCount(messages, messageCount);
  writer.clear();
  for (let i2 = 0;i2 < messageCount; i2++) {
    writer.writeBytes(messages[i2]);
  }
  return writer.getBuffer();
}
function countClientMessagesForV3Frame(messages, maxFrameBytes) {
  ensureMessages(messages);
  const firstMessage = messages[0];
  if (firstMessage.length > maxFrameBytes) {
    return 1;
  }
  let count = 1;
  let frameSize = firstMessage.length;
  while (count < messages.length) {
    const nextMessage = messages[count];
    const nextFrameSize = frameSize + nextMessage.length;
    if (nextFrameSize > maxFrameBytes) {
      break;
    }
    frameSize = nextFrameSize;
    count += 1;
  }
  return count;
}
function encodeClientMessagesV3(writer, messages, messageCount = messages.length) {
  return concatenateMessagesV3(writer, messages, messageCount);
}
function forEachServerMessageV3(reader, data, visit) {
  reader.reset(data);
  if (reader.remaining === 0) {
    throw new RangeError(EMPTY_V3_PAYLOAD_ERR);
  }
  let count = 0;
  while (reader.remaining > 0) {
    visit(ServerMessage.deserialize(reader));
    count += 1;
  }
  return count;
}
var TEXT_ENCODER = new TextEncoder;
function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function getClientMessageVariantTag(name) {
  if (ClientMessage.algebraicType.tag !== "Sum") {
    throw new TypeError("ClientMessage must be a sum type");
  }
  const tag = ClientMessage.algebraicType.value.variants.findIndex((variant) => variant.name === name);
  if (tag === -1) {
    throw new RangeError(`Unknown ClientMessage variant: ${name}`);
  }
  return tag;
}
var CLIENT_MESSAGE_CALL_REDUCER_TAG = getClientMessageVariantTag("CallReducer");
var CLIENT_MESSAGE_CALL_PROCEDURE_TAG = getClientMessageVariantTag("CallProcedure");
var MAX_V3_OUTBOUND_FRAME_BYTES = 256 * 1024;
var WS_READY_STATE_CLOSING = 2;
var WS_READY_STATE_CLOSED = 3;
var DbConnectionImpl = class {
  isActive = false;
  isDisconnectRequested = false;
  get isSocketClosed() {
    const ws = this.ws;
    if (!ws) {
      return false;
    }
    return ws.readyState === WS_READY_STATE_CLOSING || ws.readyState === WS_READY_STATE_CLOSED;
  }
  identity = undefined;
  token = undefined;
  [INTERNAL_REMOTE_MODULE]() {
    return this.#remoteModule;
  }
  db;
  reducers;
  procedures;
  connectionId = ConnectionId.random();
  #connectionIdHex = this.connectionId.toHexString();
  #queryId = 0;
  #requestId = 0;
  #eventId = 0;
  #emitter;
  #inboundQueue = [];
  #inboundQueueOffset = 0;
  #isDrainingInboundQueue = false;
  #outboundQueue = [];
  #isOutboundFlushScheduled = false;
  #negotiatedWsProtocol = V2_WS_PROTOCOL;
  #subscriptionManager = new SubscriptionManager;
  #remoteModule;
  #reducerCallbacks = /* @__PURE__ */ new Map;
  #reducerCallInfo = /* @__PURE__ */ new Map;
  #procedureCallbacks = /* @__PURE__ */ new Map;
  #rowDeserializers;
  #rowIdMetadata;
  #reducerArgsSerializers;
  #procedureSerializers;
  #reducerNameBytes;
  #procedureNameBytes;
  #sourceNameToTableDef;
  #messageReader = new BinaryReader(new Uint8Array);
  #rowListReader = new BinaryReader(new Uint8Array);
  #clientFrameEncoder = new BinaryWriter(1024);
  #boundSubscriptionBuilder;
  #boundDisconnect;
  clientCache;
  ws;
  wsPromise;
  constructor({
    uri,
    nameOrAddress,
    identity,
    token,
    emitter,
    remoteModule,
    createWSFn,
    compression,
    lightMode,
    confirmedReads
  }) {
    stdbLogger("info", "Connecting to SpacetimeDB WS...");
    const url = new URL(uri.toString());
    if (!/^wss?:/.test(uri.protocol)) {
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    }
    this.identity = identity;
    this.token = token;
    this.#remoteModule = remoteModule;
    this.#emitter = emitter;
    this.#boundSubscriptionBuilder = this.subscriptionBuilder.bind(this);
    this.#boundDisconnect = this.disconnect.bind(this);
    this.#rowDeserializers = /* @__PURE__ */ Object.create(null);
    this.#rowIdMetadata = /* @__PURE__ */ Object.create(null);
    this.#sourceNameToTableDef = /* @__PURE__ */ Object.create(null);
    for (const table2 of Object.values(remoteModule.tables)) {
      this.#rowDeserializers[table2.sourceName] = ProductType.makeDeserializer(table2.rowType);
      this.#sourceNameToTableDef[table2.sourceName] = table2;
      const primaryKeyColumn = Object.entries(table2.columns).find(([, column]) => column.columnMetadata.isPrimaryKey);
      this.#rowIdMetadata[table2.sourceName] = primaryKeyColumn ? {
        primaryKeyColName: primaryKeyColumn[0],
        primaryKeyColType: primaryKeyColumn[1].typeBuilder.algebraicType
      } : {};
    }
    this.#reducerArgsSerializers = /* @__PURE__ */ Object.create(null);
    this.#reducerNameBytes = /* @__PURE__ */ Object.create(null);
    for (const reducer of remoteModule.reducers) {
      this.#reducerArgsSerializers[reducer.name] = {
        serialize: ProductType.makeSerializer(reducer.paramsType),
        deserialize: ProductType.makeDeserializer(reducer.paramsType)
      };
      this.#reducerNameBytes[reducer.name] = TEXT_ENCODER.encode(reducer.name);
    }
    this.#procedureSerializers = /* @__PURE__ */ Object.create(null);
    this.#procedureNameBytes = /* @__PURE__ */ Object.create(null);
    for (const procedure of remoteModule.procedures) {
      this.#procedureSerializers[procedure.name] = {
        serializeArgs: ProductType.makeSerializer(new ProductBuilder(procedure.params).algebraicType.value),
        deserializeReturn: AlgebraicType.makeDeserializer(procedure.returnType.algebraicType)
      };
      this.#procedureNameBytes[procedure.name] = TEXT_ENCODER.encode(procedure.name);
    }
    url.searchParams.set("connection_id", this.#connectionIdHex);
    this.clientCache = new ClientCache;
    this.db = this.#makeDbView();
    this.reducers = this.#makeReducers(remoteModule);
    this.procedures = this.#makeProcedures(remoteModule);
    this.wsPromise = createWSFn({
      url,
      nameOrAddress,
      wsProtocol: [...PREFERRED_WS_PROTOCOLS],
      authToken: token,
      compression,
      lightMode,
      confirmedReads
    }).then((v) => {
      this.ws = v;
      this.ws.onclose = () => {
        this.isActive = false;
        this.#emitter.emit("disconnect", this);
      };
      this.ws.onerror = (e) => {
        this.isActive = false;
        this.#emitter.emit("connectError", this, e);
      };
      this.ws.onopen = this.#handleOnOpen.bind(this);
      this.ws.onmessage = this.#handleOnMessage.bind(this);
      return v;
    }).catch((e) => {
      stdbLogger("error", "Error connecting to SpacetimeDB WS");
      this.#emitter.emit("connectError", this, e);
      return;
    });
  }
  #getNextQueryId = () => {
    const queryId = this.#queryId;
    this.#queryId += 1;
    return queryId;
  };
  #getNextRequestId = () => this.#requestId++;
  #makeDbView() {
    const view = /* @__PURE__ */ Object.create(null);
    for (const tbl of Object.values(this.#sourceNameToTableDef)) {
      const key = tbl.accessorName;
      Object.defineProperty(view, key, {
        enumerable: true,
        configurable: false,
        get: () => this.clientCache.getOrCreateTable(tbl)
      });
    }
    return view;
  }
  #makeReducers(def) {
    const out = {};
    for (const reducer of def.reducers) {
      const reducerName = reducer.name;
      const encodedReducerName = this.#reducerNameBytes[reducerName];
      const key = reducer.accessorName;
      const { serialize: serializeArgs } = this.#reducerArgsSerializers[reducerName];
      out[key] = (params) => {
        const writer = this.#reducerArgsEncoder;
        writer.clear();
        serializeArgs(writer, params);
        const argsBuffer = writer.getBuffer();
        return this.#callReducerWithEncodedName(reducerName, encodedReducerName, argsBuffer, params);
      };
    }
    return out;
  }
  #makeProcedures(def) {
    const out = {};
    const writer = new BinaryWriter(1024);
    for (const procedure of def.procedures) {
      const procedureName = procedure.name;
      const encodedProcedureName = this.#procedureNameBytes[procedureName];
      const key = procedure.accessorName;
      const { serializeArgs, deserializeReturn } = this.#procedureSerializers[procedureName];
      out[key] = (params) => {
        writer.clear();
        serializeArgs(writer, params);
        const argsBuffer = writer.getBuffer();
        return this.#callProcedureWithEncodedName(procedureName, encodedProcedureName, argsBuffer).then((returnBuf) => {
          return deserializeReturn(new BinaryReader(returnBuf));
        });
      };
    }
    return out;
  }
  #makeEventContext(event) {
    return {
      db: this.db,
      reducers: this.reducers,
      isActive: this.isActive,
      subscriptionBuilder: this.#boundSubscriptionBuilder,
      disconnect: this.#boundDisconnect,
      event
    };
  }
  subscriptionBuilder = () => {
    return new SubscriptionBuilderImpl(this);
  };
  getFromBuilder() {
    return makeFromBuilder(this.#remoteModule.tables);
  }
  registerSubscription(handle, handleEmitter, querySql) {
    const querySetId = this.#getNextQueryId();
    this.#subscriptionManager.subscriptions.set(querySetId, {
      handle,
      emitter: handleEmitter
    });
    const requestId = this.#getNextRequestId();
    this.#sendMessage(ClientMessage.Subscribe({
      queryStrings: querySql,
      querySetId: { id: querySetId },
      requestId
    }));
    return querySetId;
  }
  unregisterSubscription(querySetId) {
    const requestId = this.#getNextRequestId();
    this.#sendMessage(ClientMessage.Unsubscribe({
      querySetId: { id: querySetId },
      requestId,
      flags: UnsubscribeFlags.SendDroppedRows
    }));
  }
  #parseRowList(type, tableName, rowList) {
    const buffer = rowList.rowsData;
    const reader = this.#rowListReader;
    reader.reset(buffer);
    const rows = [];
    const deserializeRow = this.#rowDeserializers[tableName];
    const { primaryKeyColName, primaryKeyColType } = this.#rowIdMetadata[tableName];
    let previousOffset = 0;
    while (reader.remaining > 0) {
      const row = deserializeRow(reader);
      let rowId = undefined;
      if (primaryKeyColName !== undefined && primaryKeyColType !== undefined) {
        rowId = AlgebraicType.intoMapKey(primaryKeyColType, row[primaryKeyColName]);
      } else {
        const rowBytes = buffer.subarray(previousOffset, reader.offset);
        const asBase64 = $fromByteArray(rowBytes);
        rowId = asBase64;
      }
      previousOffset = reader.offset;
      rows.push({
        type,
        rowId,
        row
      });
    }
    return rows;
  }
  #mergeTableUpdates(updates) {
    const merged = /* @__PURE__ */ new Map;
    for (const update of updates) {
      const ops = merged.get(update.tableName);
      if (ops) {
        for (const op of update.operations)
          ops.push(op);
      } else {
        merged.set(update.tableName, update.operations.slice());
      }
    }
    return Array.from(merged, ([tableName, operations]) => ({
      tableName,
      operations
    }));
  }
  #queryRowsToTableUpdates(rows, opType) {
    const updates = [];
    for (const tableRows of rows.tables) {
      updates.push({
        tableName: tableRows.table,
        operations: this.#parseRowList(opType, tableRows.table, tableRows.rows)
      });
    }
    return this.#mergeTableUpdates(updates);
  }
  #tableUpdateRowsToOperations(tableName, rows) {
    if (rows.tag === "PersistentTable") {
      const inserts = this.#parseRowList("insert", tableName, rows.value.inserts);
      const deletes = this.#parseRowList("delete", tableName, rows.value.deletes);
      return inserts.concat(deletes);
    }
    if (rows.tag === "EventTable") {
      return this.#parseRowList("insert", tableName, rows.value.events);
    }
    return [];
  }
  #querySetUpdateToTableUpdates(querySetUpdate) {
    const updates = [];
    for (const tableUpdate of querySetUpdate.tables) {
      let operations = [];
      for (const rows of tableUpdate.rows) {
        operations = operations.concat(this.#tableUpdateRowsToOperations(tableUpdate.tableName, rows));
      }
      updates.push({
        tableName: tableUpdate.tableName,
        operations
      });
    }
    return this.#mergeTableUpdates(updates);
  }
  #flushOutboundQueue(wsResolved) {
    if (this.#negotiatedWsProtocol === V3_WS_PROTOCOL) {
      this.#flushOutboundQueueV3(wsResolved);
      return;
    }
    this.#flushOutboundQueueV2(wsResolved);
  }
  #flushOutboundQueueV2(wsResolved) {
    const pending = this.#outboundQueue.splice(0);
    for (const message of pending) {
      wsResolved.send(message);
    }
  }
  #flushOutboundQueueV3(wsResolved) {
    if (this.#outboundQueue.length === 0) {
      return;
    }
    const batchSize = countClientMessagesForV3Frame(this.#outboundQueue, MAX_V3_OUTBOUND_FRAME_BYTES);
    wsResolved.send(encodeClientMessagesV3(this.#clientFrameEncoder, this.#outboundQueue, batchSize));
    if (batchSize === this.#outboundQueue.length) {
      this.#outboundQueue.length = 0;
      return;
    }
    this.#outboundQueue.copyWithin(0, batchSize);
    this.#outboundQueue.length -= batchSize;
    if (this.#outboundQueue.length > 0) {
      this.#scheduleDeferredOutboundFlush();
    }
  }
  #scheduleOutboundFlush() {
    this.#scheduleOutboundFlushWith("microtask");
  }
  #scheduleDeferredOutboundFlush() {
    this.#scheduleOutboundFlushWith("next-task");
  }
  #scheduleOutboundFlushWith(schedule) {
    if (this.#isOutboundFlushScheduled) {
      return;
    }
    this.#isOutboundFlushScheduled = true;
    const flush = () => {
      this.#isOutboundFlushScheduled = false;
      if (this.ws && this.isActive) {
        this.#flushOutboundQueue(this.ws);
      }
    };
    if (schedule === "next-task") {
      setTimeout(flush, 0);
    } else {
      queueMicrotask(flush);
    }
  }
  #reducerArgsEncoder = new BinaryWriter(1024);
  #clientMessageEncoder = new BinaryWriter(1024);
  #sendEncodedMessage(encoded, describe) {
    stdbLogger("trace", describe);
    if (this.ws && this.isActive) {
      if (this.#negotiatedWsProtocol === V2_WS_PROTOCOL) {
        if (this.#outboundQueue.length)
          this.#flushOutboundQueue(this.ws);
        this.ws.send(encoded);
        return;
      }
      this.#outboundQueue.push(encoded.slice());
      this.#scheduleOutboundFlush();
    } else {
      this.#outboundQueue.push(encoded.slice());
    }
  }
  #sendMessage(message) {
    const writer = this.#clientMessageEncoder;
    writer.clear();
    ClientMessage.serialize(writer, message);
    const encoded = writer.getBuffer();
    const isLive = !!(this.ws && this.isActive);
    this.#sendEncodedMessage(encoded, () => isLive ? `Sending message to server: ${stringify2(message)}` : `Queuing message to server: ${stringify2(message)}`);
  }
  #sendCallReducerMessage(requestId, reducerNameBytes, argsBuffer) {
    const writer = this.#clientMessageEncoder;
    writer.clear();
    writer.writeByte(CLIENT_MESSAGE_CALL_REDUCER_TAG);
    writer.writeU32(requestId);
    writer.writeU8(0);
    writer.writeUInt8Array(reducerNameBytes);
    writer.writeUInt8Array(argsBuffer);
    const encoded = writer.getBuffer();
    this.#sendEncodedMessage(encoded, () => `Sending reducer call message to server: requestId=${requestId}`);
  }
  #sendCallProcedureMessage(requestId, procedureNameBytes, argsBuffer) {
    const writer = this.#clientMessageEncoder;
    writer.clear();
    writer.writeByte(CLIENT_MESSAGE_CALL_PROCEDURE_TAG);
    writer.writeU32(requestId);
    writer.writeU8(0);
    writer.writeUInt8Array(procedureNameBytes);
    writer.writeUInt8Array(argsBuffer);
    const encoded = writer.getBuffer();
    this.#sendEncodedMessage(encoded, () => `Sending procedure call message to server: requestId=${requestId}`);
  }
  #setConnectionId(connectionId) {
    this.connectionId = connectionId;
    this.#connectionIdHex = connectionId.toHexString();
  }
  #nextEventId() {
    this.#eventId += 1;
    return `${this.#connectionIdHex}:${this.#eventId}`;
  }
  #handleOnOpen() {
    if (this.ws) {
      this.#negotiatedWsProtocol = normalizeWsProtocol(this.ws.protocol);
    }
    this.isActive = true;
    if (this.ws) {
      this.#flushOutboundQueue(this.ws);
    }
  }
  #applyTableUpdates(tableUpdates, eventContext) {
    const pendingCallbacks = [];
    for (const tableUpdate of tableUpdates) {
      const tableName = tableUpdate.tableName;
      const tableDef = this.#sourceNameToTableDef[tableName];
      const table2 = this.clientCache.getOrCreateTable(tableDef);
      const newCallbacks = table2.applyOperations(tableUpdate.operations, eventContext);
      for (const callback of newCallbacks) {
        pendingCallbacks.push(callback);
      }
    }
    return pendingCallbacks;
  }
  #applyTransactionUpdates(eventContext, tu) {
    const allUpdates = [];
    for (const querySetUpdate of tu.querySets) {
      const tableUpdates = this.#querySetUpdateToTableUpdates(querySetUpdate);
      for (const update of tableUpdates) {
        allUpdates.push(update);
      }
    }
    return this.#applyTableUpdates(this.#mergeTableUpdates(allUpdates), eventContext);
  }
  #dispatchPendingCallbacks(callbacks) {
    stdbLogger("trace", () => `Calling ${callbacks.length} triggered row callbacks`);
    for (const callback of callbacks) {
      callback.cb();
    }
  }
  #processServerMessage(serverMessage) {
    stdbLogger("trace", () => `Processing server message: ${stringify2(serverMessage)}`);
    switch (serverMessage.tag) {
      case "InitialConnection": {
        this.identity = serverMessage.value.identity;
        if (!this.token && serverMessage.value.token) {
          this.token = serverMessage.value.token;
        }
        this.#setConnectionId(serverMessage.value.connectionId);
        this.#emitter.emit("connect", this, this.identity, this.token);
        break;
      }
      case "SubscribeApplied": {
        const querySetId = serverMessage.value.querySetId.id;
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (!subscription) {
          stdbLogger("error", `Received SubscribeApplied for unknown querySetId ${querySetId}.`);
          return;
        }
        const event = {
          id: this.#nextEventId(),
          tag: "SubscribeApplied"
        };
        const eventContext = this.#makeEventContext(event);
        const tableUpdates = this.#queryRowsToTableUpdates(serverMessage.value.rows, "insert");
        const callbacks = this.#applyTableUpdates(tableUpdates, eventContext);
        const { event: _, ...subscriptionEventContext } = eventContext;
        subscription.emitter.emit("applied", subscriptionEventContext);
        this.#dispatchPendingCallbacks(callbacks);
        break;
      }
      case "UnsubscribeApplied": {
        const querySetId = serverMessage.value.querySetId.id;
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (!subscription) {
          stdbLogger("error", `Received UnsubscribeApplied for unknown querySetId ${querySetId}.`);
          return;
        }
        const event = {
          id: this.#nextEventId(),
          tag: "UnsubscribeApplied"
        };
        const eventContext = this.#makeEventContext(event);
        const tableUpdates = serverMessage.value.rows ? this.#queryRowsToTableUpdates(serverMessage.value.rows, "delete") : [];
        const callbacks = this.#applyTableUpdates(tableUpdates, eventContext);
        const { event: _, ...subscriptionEventContext } = eventContext;
        subscription.emitter.emit("end", subscriptionEventContext);
        this.#subscriptionManager.subscriptions.delete(querySetId);
        this.#dispatchPendingCallbacks(callbacks);
        break;
      }
      case "SubscriptionError": {
        const querySetId = serverMessage.value.querySetId.id;
        const requestId = serverMessage.value.requestId;
        const error = Error(serverMessage.value.error);
        const event = {
          id: this.#nextEventId(),
          tag: "Error",
          value: error
        };
        const eventContext = this.#makeEventContext(event);
        const errorContext = {
          ...eventContext,
          event: error
        };
        if (requestId == null) {
          stdbLogger("error", `Disconnecting due to error for a previously applied subscription: ${serverMessage.value.error}`);
          this.disconnect();
          break;
        }
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (subscription) {
          subscription.emitter.emit("error", errorContext, error);
          this.#subscriptionManager.subscriptions.delete(querySetId);
        } else {
          stdbLogger("error", `Received SubscriptionError for unknown querySetId ${querySetId}:`, error);
        }
        break;
      }
      case "TransactionUpdate": {
        const event = {
          id: this.#nextEventId(),
          tag: "Transaction"
        };
        const eventContext = this.#makeEventContext(event);
        const callbacks = this.#applyTransactionUpdates(eventContext, serverMessage.value);
        this.#dispatchPendingCallbacks(callbacks);
        break;
      }
      case "ReducerResult": {
        const { requestId, result } = serverMessage.value;
        if (result.tag === "Ok") {
          const reducerInfo = this.#reducerCallInfo.get(requestId);
          const eventId = this.#nextEventId();
          const event = reducerInfo ? {
            id: eventId,
            tag: "Reducer",
            value: {
              timestamp: serverMessage.value.timestamp,
              outcome: result,
              reducer: {
                name: reducerInfo.name,
                args: reducerInfo.args
              }
            }
          } : {
            id: eventId,
            tag: "Transaction"
          };
          const eventContext = this.#makeEventContext(event);
          const callbacks = this.#applyTransactionUpdates(eventContext, result.value.transactionUpdate);
          this.#dispatchPendingCallbacks(callbacks);
        }
        this.#reducerCallInfo.delete(requestId);
        const cb = this.#reducerCallbacks.get(requestId);
        this.#reducerCallbacks.delete(requestId);
        cb?.(result);
        break;
      }
      case "ProcedureResult": {
        const { status, requestId } = serverMessage.value;
        const result = status.tag === "Returned" ? { tag: "Ok", value: status.value } : { tag: "Err", value: status.value };
        const cb = this.#procedureCallbacks.get(requestId);
        this.#procedureCallbacks.delete(requestId);
        cb?.(result);
        break;
      }
      case "OneOffQueryResult": {
        stdbLogger("warn", "Received OneOffQueryResult but SDK does not expose one-off query APIs yet.");
        break;
      }
    }
  }
  #processV2Message(data) {
    const reader = this.#messageReader;
    reader.reset(data);
    this.#processServerMessage(ServerMessage.deserialize(reader));
  }
  #processMessage(data) {
    if (this.#negotiatedWsProtocol !== V3_WS_PROTOCOL) {
      this.#processV2Message(data);
      return;
    }
    const messageCount = forEachServerMessageV3(this.#messageReader, data, (serverMessage) => {
      this.#processServerMessage(serverMessage);
    });
    stdbLogger("trace", () => `Processing server v3 payload with ${messageCount} message(s)`);
  }
  #handleOnMessage(wsMessage) {
    this.#inboundQueue.push(wsMessage.data);
    if (this.#isDrainingInboundQueue) {
      return;
    }
    this.#isDrainingInboundQueue = true;
    try {
      while (this.#inboundQueueOffset < this.#inboundQueue.length) {
        const data = this.#inboundQueue[this.#inboundQueueOffset];
        this.#inboundQueueOffset += 1;
        if (data) {
          this.#processMessage(data);
        }
      }
    } finally {
      if (this.#inboundQueueOffset >= this.#inboundQueue.length) {
        this.#inboundQueue.length = 0;
      } else if (this.#inboundQueueOffset > 0) {
        this.#inboundQueue = this.#inboundQueue.slice(this.#inboundQueueOffset);
      }
      this.#inboundQueueOffset = 0;
      this.#isDrainingInboundQueue = false;
    }
  }
  callReducer(reducerName, argsBuffer, reducerArgs) {
    const encodedReducerName = this.#reducerNameBytes[reducerName];
    if (encodedReducerName) {
      return this.#callReducerWithEncodedName(reducerName, encodedReducerName, argsBuffer, reducerArgs);
    }
    return this.#callReducerGeneric(reducerName, argsBuffer, reducerArgs);
  }
  #callReducerWithEncodedName(reducerName, encodedReducerName, argsBuffer, reducerArgs) {
    const { promise, resolve, reject } = createDeferred();
    const requestId = this.#getNextRequestId();
    this.#sendCallReducerMessage(requestId, encodedReducerName, argsBuffer);
    if (reducerArgs) {
      this.#reducerCallInfo.set(requestId, {
        name: reducerName,
        args: reducerArgs
      });
    }
    this.#reducerCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok" || result.tag === "OkEmpty") {
        resolve();
      } else {
        if (result.tag === "Err") {
          const reader = new BinaryReader(result.value);
          const errorString = reader.readString();
          reject(new SenderError(errorString));
        } else if (result.tag === "InternalError") {
          reject(new InternalError(result.value));
        } else {
          reject(new Error("Unexpected reducer result"));
        }
      }
    });
    return promise;
  }
  #callReducerGeneric(reducerName, argsBuffer, reducerArgs) {
    const { promise, resolve, reject } = createDeferred();
    const requestId = this.#getNextRequestId();
    const message = ClientMessage.CallReducer({
      reducer: reducerName,
      args: argsBuffer,
      requestId,
      flags: 0
    });
    this.#sendMessage(message);
    if (reducerArgs) {
      this.#reducerCallInfo.set(requestId, {
        name: reducerName,
        args: reducerArgs
      });
    }
    this.#reducerCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok" || result.tag === "OkEmpty") {
        resolve();
      } else {
        if (result.tag === "Err") {
          const reader = new BinaryReader(result.value);
          const errorString = reader.readString();
          reject(new SenderError(errorString));
        } else if (result.tag === "InternalError") {
          reject(new InternalError(result.value));
        } else {
          reject(new Error("Unexpected reducer result"));
        }
      }
    });
    return promise;
  }
  callReducerWithParams(reducerName, _paramsType, params) {
    const writer = this.#reducerArgsEncoder;
    writer.clear();
    this.#reducerArgsSerializers[reducerName].serialize(writer, params);
    const argsBuffer = writer.getBuffer();
    return this.callReducer(reducerName, argsBuffer, params);
  }
  callProcedure(procedureName, argsBuffer) {
    const encodedProcedureName = this.#procedureNameBytes[procedureName];
    if (encodedProcedureName) {
      return this.#callProcedureWithEncodedName(procedureName, encodedProcedureName, argsBuffer);
    }
    return this.#callProcedureGeneric(procedureName, argsBuffer);
  }
  #callProcedureWithEncodedName(procedureName, encodedProcedureName, argsBuffer) {
    const { promise, resolve, reject } = createDeferred();
    const requestId = this.#getNextRequestId();
    this.#sendCallProcedureMessage(requestId, encodedProcedureName, argsBuffer);
    this.#procedureCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok") {
        resolve(result.value);
      } else {
        reject(result.value);
      }
    });
    return promise;
  }
  #callProcedureGeneric(procedureName, argsBuffer) {
    const { promise, resolve, reject } = createDeferred();
    const requestId = this.#getNextRequestId();
    const message = ClientMessage.CallProcedure({
      procedure: procedureName,
      args: argsBuffer,
      requestId,
      flags: 0
    });
    this.#sendMessage(message);
    this.#procedureCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok") {
        resolve(result.value);
      } else {
        reject(result.value);
      }
    });
    return promise;
  }
  callProcedureWithParams(procedureName, _paramsType, params, _returnType) {
    const writer = new BinaryWriter(1024);
    const { serializeArgs, deserializeReturn } = this.#procedureSerializers[procedureName];
    serializeArgs(writer, params);
    const argsBuffer = writer.getBuffer();
    return this.callProcedure(procedureName, argsBuffer).then((returnBuf) => {
      return deserializeReturn(new BinaryReader(returnBuf));
    });
  }
  disconnect() {
    this.isDisconnectRequested = true;
    this.wsPromise.then((ws) => ws?.close());
  }
  on(eventName, callback) {
    this.#emitter.on(eventName, callback);
  }
  off(eventName, callback) {
    this.#emitter.off(eventName, callback);
  }
  onConnect(callback) {
    this.#emitter.on("connect", callback);
  }
  onDisconnect(callback) {
    this.#emitter.on("disconnect", callback);
  }
  onConnectError(callback) {
    this.#emitter.on("connectError", callback);
  }
  removeOnConnect(callback) {
    this.#emitter.off("connect", callback);
  }
  removeOnDisconnect(callback) {
    this.#emitter.off("disconnect", callback);
  }
  removeOnConnectError(callback) {
    this.#emitter.off("connectError", callback);
  }
};
function tablesToSchema(ctx, tables) {
  const tableDefs = /* @__PURE__ */ Object.create(null);
  for (const [accName, schema2] of Object.entries(tables)) {
    tableDefs[accName] = tableToSchema(accName, schema2, schema2.tableDef(ctx, accName));
  }
  return {
    tables: tableDefs
  };
}
function tableToSchema(accName, schema2, tableDef) {
  const getColName = (i2) => schema2.rowType.algebraicType.value.elements[i2].name;
  const resolvedIndexes = tableDef.indexes.map((idx) => {
    const accessorName = idx.accessorName;
    if (typeof accessorName !== "string" || accessorName.length === 0) {
      throw new TypeError(`Index '${idx.sourceName ?? "<unknown>"}' on table '${tableDef.sourceName}' is missing accessor name`);
    }
    const columnIds = idx.algorithm.tag === "Direct" ? [idx.algorithm.value] : idx.algorithm.value;
    const unique = tableDef.constraints.some((c) => c.data.tag === "Unique" && c.data.value.columns.every((col) => columnIds.includes(col)));
    const algorithm = {
      BTree: "btree",
      Hash: "hash",
      Direct: "direct"
    }[idx.algorithm.tag];
    return {
      name: accessorName,
      unique,
      algorithm,
      columns: columnIds.map(getColName)
    };
  });
  return {
    sourceName: schema2.tableName || accName,
    accessorName: accName,
    columns: schema2.rowType.row,
    rowType: schema2.rowSpacetimeType,
    indexes: schema2.idxs,
    constraints: tableDef.constraints.map((c) => ({
      name: c.sourceName,
      constraint: "unique",
      columns: c.data.value.columns.map(getColName)
    })),
    resolvedIndexes,
    tableDef,
    ...tableDef.isEvent ? { isEvent: true } : {}
  };
}
var ModuleContext = class {
  #compoundTypes = /* @__PURE__ */ new Map;
  #moduleDef = {
    typespace: { types: [] },
    tables: [],
    reducers: [],
    types: [],
    rowLevelSecurity: [],
    schedules: [],
    procedures: [],
    views: [],
    viewPrimaryKeys: [],
    lifeCycleReducers: [],
    httpHandlers: [],
    httpRoutes: [],
    caseConversionPolicy: { tag: "SnakeCase" },
    explicitNames: {
      entries: []
    },
    submodules: []
  };
  get moduleDef() {
    return this.#moduleDef;
  }
  rawModuleDefV10() {
    const sections = [];
    const push = (s) => {
      if (s)
        sections.push(s);
    };
    const module = this.#moduleDef;
    push(module.typespace && { tag: "Typespace", value: module.typespace });
    push(module.types && { tag: "Types", value: module.types });
    push(module.tables && { tag: "Tables", value: module.tables });
    push(module.reducers && { tag: "Reducers", value: module.reducers });
    push(module.procedures && { tag: "Procedures", value: module.procedures });
    push(module.views && { tag: "Views", value: module.views });
    push(module.viewPrimaryKeys && {
      tag: "ViewPrimaryKeys",
      value: module.viewPrimaryKeys
    });
    push(module.schedules && { tag: "Schedules", value: module.schedules });
    push(module.lifeCycleReducers && {
      tag: "LifeCycleReducers",
      value: module.lifeCycleReducers
    });
    push(module.httpHandlers && {
      tag: "HttpHandlers",
      value: module.httpHandlers
    });
    push(module.httpRoutes && {
      tag: "HttpRoutes",
      value: module.httpRoutes
    });
    push(module.rowLevelSecurity && {
      tag: "RowLevelSecurity",
      value: module.rowLevelSecurity
    });
    push(module.explicitNames && {
      tag: "ExplicitNames",
      value: module.explicitNames
    });
    push(module.caseConversionPolicy && {
      tag: "CaseConversionPolicy",
      value: module.caseConversionPolicy
    });
    push(module.submodules && {
      tag: "Submodules",
      value: module.submodules
    });
    return { sections };
  }
  addSubmodule(submodule) {
    this.#moduleDef.submodules.push(submodule);
  }
  setCaseConversionPolicy(policy) {
    this.#moduleDef.caseConversionPolicy = policy;
  }
  get typespace() {
    return this.#moduleDef.typespace;
  }
  resolveType(typeBuilder) {
    let ty = typeBuilder.algebraicType;
    while (ty.tag === "Ref") {
      ty = this.typespace.types[ty.value];
    }
    return ty;
  }
  registerTypesRecursively(typeBuilder) {
    if (typeBuilder instanceof ProductBuilder && !isUnit(typeBuilder) || typeBuilder instanceof SumBuilder || typeBuilder instanceof RowBuilder) {
      return this.#registerCompoundTypeRecursively(typeBuilder);
    } else if (typeBuilder instanceof OptionBuilder) {
      return new OptionBuilder(this.registerTypesRecursively(typeBuilder.value));
    } else if (typeBuilder instanceof ResultBuilder) {
      return new ResultBuilder(this.registerTypesRecursively(typeBuilder.ok), this.registerTypesRecursively(typeBuilder.err));
    } else if (typeBuilder instanceof ArrayBuilder) {
      return new ArrayBuilder(this.registerTypesRecursively(typeBuilder.element));
    } else {
      return typeBuilder;
    }
  }
  #registerCompoundTypeRecursively(typeBuilder) {
    const ty = typeBuilder.algebraicType;
    const name = typeBuilder.typeName;
    if (name === undefined) {
      throw new Error(`Missing type name for ${typeBuilder.constructor.name ?? "TypeBuilder"} ${JSON.stringify(typeBuilder)}`);
    }
    let r = this.#compoundTypes.get(ty);
    if (r != null) {
      return r;
    }
    const newTy = typeBuilder instanceof RowBuilder || typeBuilder instanceof ProductBuilder ? {
      tag: "Product",
      value: { elements: [] }
    } : {
      tag: "Sum",
      value: { variants: [] }
    };
    r = new RefBuilder(this.#moduleDef.typespace.types.length);
    this.#moduleDef.typespace.types.push(newTy);
    this.#compoundTypes.set(ty, r);
    if (typeBuilder instanceof RowBuilder) {
      for (const [name2, elem] of Object.entries(typeBuilder.row)) {
        newTy.value.elements.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(elem.typeBuilder).algebraicType
        });
      }
    } else if (typeBuilder instanceof ProductBuilder) {
      for (const [name2, elem] of Object.entries(typeBuilder.elements)) {
        newTy.value.elements.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(elem).algebraicType
        });
      }
    } else if (typeBuilder instanceof SumBuilder) {
      for (const [name2, variant] of Object.entries(typeBuilder.variants)) {
        newTy.value.variants.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(variant).algebraicType
        });
      }
    }
    this.#moduleDef.types.push({
      sourceName: splitName(name),
      ty: r.ref,
      customOrdering: true
    });
    return r;
  }
};
function isUnit(typeBuilder) {
  return typeBuilder.typeName == null && typeBuilder.algebraicType.value.elements.length === 0;
}
function splitName(name) {
  const scope = name.split(".");
  return { sourceName: scope.pop(), scope };
}
var Tables = class {
  constructor(schemaType) {
    this.schemaType = schemaType;
  }
};
function schema(tables) {
  const ctx = new ModuleContext;
  return new Tables(tablesToSchema(ctx, tables));
}
function convertToAccessorMap(arr) {
  return Object.fromEntries(arr.map((v) => [v.accessorName, v]));
}
var AlgebraicType2 = t.enum("AlgebraicType", {
  Ref: t.u32(),
  get Sum() {
    return SumType2;
  },
  get Product() {
    return ProductType2;
  },
  get Array() {
    return AlgebraicType2;
  },
  String: t.unit(),
  Bool: t.unit(),
  I8: t.unit(),
  U8: t.unit(),
  I16: t.unit(),
  U16: t.unit(),
  I32: t.unit(),
  U32: t.unit(),
  I64: t.unit(),
  U64: t.unit(),
  I128: t.unit(),
  U128: t.unit(),
  I256: t.unit(),
  U256: t.unit(),
  F32: t.unit(),
  F64: t.unit()
});
var CaseConversionPolicy = t.enum("CaseConversionPolicy", {
  None: t.unit(),
  SnakeCase: t.unit()
});
var ExplicitNameEntry = t.enum("ExplicitNameEntry", {
  get Table() {
    return NameMapping;
  },
  get Function() {
    return NameMapping;
  },
  get Index() {
    return NameMapping;
  }
});
var ExplicitNames = t.object("ExplicitNames", {
  get entries() {
    return t.array(ExplicitNameEntry);
  }
});
var FunctionVisibility = t.enum("FunctionVisibility", {
  Private: t.unit(),
  ClientCallable: t.unit()
});
var HttpHeaderPair = t.object("HttpHeaderPair", {
  name: t.string(),
  value: t.byteArray()
});
var HttpHeaders = t.object("HttpHeaders", {
  get entries() {
    return t.array(HttpHeaderPair);
  }
});
var HttpMethod = t.enum("HttpMethod", {
  Get: t.unit(),
  Head: t.unit(),
  Post: t.unit(),
  Put: t.unit(),
  Delete: t.unit(),
  Connect: t.unit(),
  Options: t.unit(),
  Trace: t.unit(),
  Patch: t.unit(),
  Extension: t.string()
});
t.object("HttpRequest", {
  get method() {
    return HttpMethod;
  },
  get headers() {
    return HttpHeaders;
  },
  timeout: t.option(t.timeDuration()),
  uri: t.string(),
  get version() {
    return HttpVersion;
  }
});
t.object("HttpResponse", {
  get headers() {
    return HttpHeaders;
  },
  get version() {
    return HttpVersion;
  },
  code: t.u16()
});
var HttpVersion = t.enum("HttpVersion", {
  Http09: t.unit(),
  Http10: t.unit(),
  Http11: t.unit(),
  Http2: t.unit(),
  Http3: t.unit()
});
var IndexType = t.enum("IndexType", {
  BTree: t.unit(),
  Hash: t.unit()
});
var Lifecycle = t.enum("Lifecycle", {
  Init: t.unit(),
  OnConnect: t.unit(),
  OnDisconnect: t.unit()
});
var MethodOrAny = t.enum("MethodOrAny", {
  Any: t.unit(),
  get Method() {
    return HttpMethod;
  }
});
var MiscModuleExport = t.enum("MiscModuleExport", {
  get TypeAlias() {
    return TypeAlias;
  }
});
var NameMapping = t.object("NameMapping", {
  sourceName: t.string(),
  canonicalName: t.string()
});
var ProductType2 = t.object("ProductType", {
  get elements() {
    return t.array(ProductTypeElement);
  }
});
var ProductTypeElement = t.object("ProductTypeElement", {
  name: t.option(t.string()),
  get algebraicType() {
    return AlgebraicType2;
  }
});
var RawColumnDefV8 = t.object("RawColumnDefV8", {
  colName: t.string(),
  get colType() {
    return AlgebraicType2;
  }
});
var RawColumnDefaultValueV10 = t.object("RawColumnDefaultValueV10", {
  colId: t.u16(),
  value: t.byteArray()
});
var RawColumnDefaultValueV9 = t.object("RawColumnDefaultValueV9", {
  table: t.string(),
  colId: t.u16(),
  value: t.byteArray()
});
var RawConstraintDataV9 = t.enum("RawConstraintDataV9", {
  get Unique() {
    return RawUniqueConstraintDataV9;
  }
});
var RawConstraintDefV10 = t.object("RawConstraintDefV10", {
  sourceName: t.option(t.string()),
  get data() {
    return RawConstraintDataV9;
  }
});
var RawConstraintDefV8 = t.object("RawConstraintDefV8", {
  constraintName: t.string(),
  constraints: t.u8(),
  columns: t.array(t.u16())
});
var RawConstraintDefV9 = t.object("RawConstraintDefV9", {
  name: t.option(t.string()),
  get data() {
    return RawConstraintDataV9;
  }
});
var RawHttpHandlerDefV10 = t.object("RawHttpHandlerDefV10", {
  sourceName: t.string()
});
var RawHttpRouteDefV10 = t.object("RawHttpRouteDefV10", {
  handlerFunction: t.string(),
  get method() {
    return MethodOrAny;
  },
  path: t.string()
});
var RawIndexAlgorithm = t.enum("RawIndexAlgorithm", {
  BTree: t.array(t.u16()),
  Hash: t.array(t.u16()),
  Direct: t.u16()
});
var RawIndexDefV10 = t.object("RawIndexDefV10", {
  sourceName: t.option(t.string()),
  accessorName: t.option(t.string()),
  get algorithm() {
    return RawIndexAlgorithm;
  }
});
var RawIndexDefV8 = t.object("RawIndexDefV8", {
  indexName: t.string(),
  isUnique: t.bool(),
  get indexType() {
    return IndexType;
  },
  columns: t.array(t.u16())
});
var RawIndexDefV9 = t.object("RawIndexDefV9", {
  name: t.option(t.string()),
  accessorName: t.option(t.string()),
  get algorithm() {
    return RawIndexAlgorithm;
  }
});
var RawLifeCycleReducerDefV10 = t.object("RawLifeCycleReducerDefV10", {
  get lifecycleSpec() {
    return Lifecycle;
  },
  functionName: t.string()
});
var RawMiscModuleExportV9 = t.enum("RawMiscModuleExportV9", {
  get ColumnDefaultValue() {
    return RawColumnDefaultValueV9;
  },
  get Procedure() {
    return RawProcedureDefV9;
  },
  get View() {
    return RawViewDefV9;
  }
});
t.enum("RawModuleDef", {
  get V8BackCompat() {
    return RawModuleDefV8;
  },
  get V9() {
    return RawModuleDefV9;
  },
  get V10() {
    return RawModuleDefV10;
  }
});
var RawModuleDefV10 = t.object("RawModuleDefV10", {
  get sections() {
    return t.array(RawModuleDefV10Section);
  }
});
var RawModuleDefV10Section = t.enum("RawModuleDefV10Section", {
  get Typespace() {
    return Typespace;
  },
  get Types() {
    return t.array(RawTypeDefV10);
  },
  get Tables() {
    return t.array(RawTableDefV10);
  },
  get Reducers() {
    return t.array(RawReducerDefV10);
  },
  get Procedures() {
    return t.array(RawProcedureDefV10);
  },
  get Views() {
    return t.array(RawViewDefV10);
  },
  get Schedules() {
    return t.array(RawScheduleDefV10);
  },
  get LifeCycleReducers() {
    return t.array(RawLifeCycleReducerDefV10);
  },
  get RowLevelSecurity() {
    return t.array(RawRowLevelSecurityDefV9);
  },
  get CaseConversionPolicy() {
    return CaseConversionPolicy;
  },
  get ExplicitNames() {
    return ExplicitNames;
  },
  get HttpHandlers() {
    return t.array(RawHttpHandlerDefV10);
  },
  get HttpRoutes() {
    return t.array(RawHttpRouteDefV10);
  },
  get ViewPrimaryKeys() {
    return t.array(RawViewPrimaryKeyDefV10);
  },
  get Submodules() {
    return t.array(RawSubmoduleV10);
  }
});
var RawModuleDefV8 = t.object("RawModuleDefV8", {
  get typespace() {
    return Typespace;
  },
  get tables() {
    return t.array(TableDesc);
  },
  get reducers() {
    return t.array(ReducerDef);
  },
  get miscExports() {
    return t.array(MiscModuleExport);
  }
});
var RawModuleDefV9 = t.object("RawModuleDefV9", {
  get typespace() {
    return Typespace;
  },
  get tables() {
    return t.array(RawTableDefV9);
  },
  get reducers() {
    return t.array(RawReducerDefV9);
  },
  get types() {
    return t.array(RawTypeDefV9);
  },
  get miscExports() {
    return t.array(RawMiscModuleExportV9);
  },
  get rowLevelSecurity() {
    return t.array(RawRowLevelSecurityDefV9);
  }
});
var RawProcedureDefV10 = t.object("RawProcedureDefV10", {
  sourceName: t.string(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  },
  get visibility() {
    return FunctionVisibility;
  }
});
var RawProcedureDefV9 = t.object("RawProcedureDefV9", {
  name: t.string(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var RawReducerDefV10 = t.object("RawReducerDefV10", {
  sourceName: t.string(),
  get params() {
    return ProductType2;
  },
  get visibility() {
    return FunctionVisibility;
  },
  get okReturnType() {
    return AlgebraicType2;
  },
  get errReturnType() {
    return AlgebraicType2;
  }
});
var RawReducerDefV9 = t.object("RawReducerDefV9", {
  name: t.string(),
  get params() {
    return ProductType2;
  },
  get lifecycle() {
    return t.option(Lifecycle);
  }
});
var RawRowLevelSecurityDefV9 = t.object("RawRowLevelSecurityDefV9", {
  sql: t.string()
});
var RawScheduleDefV10 = t.object("RawScheduleDefV10", {
  sourceName: t.option(t.string()),
  tableName: t.string(),
  scheduleAtCol: t.u16(),
  functionName: t.string()
});
var RawScheduleDefV9 = t.object("RawScheduleDefV9", {
  name: t.option(t.string()),
  reducerName: t.string(),
  scheduledAtColumn: t.u16()
});
var RawScopedTypeNameV10 = t.object("RawScopedTypeNameV10", {
  scope: t.array(t.string()),
  sourceName: t.string()
});
var RawScopedTypeNameV9 = t.object("RawScopedTypeNameV9", {
  scope: t.array(t.string()),
  name: t.string()
});
var RawSequenceDefV10 = t.object("RawSequenceDefV10", {
  sourceName: t.option(t.string()),
  column: t.u16(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  increment: t.i128()
});
var RawSequenceDefV8 = t.object("RawSequenceDefV8", {
  sequenceName: t.string(),
  colPos: t.u16(),
  increment: t.i128(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  allocated: t.i128()
});
var RawSequenceDefV9 = t.object("RawSequenceDefV9", {
  name: t.option(t.string()),
  column: t.u16(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  increment: t.i128()
});
var RawSubmoduleV10 = t.object("RawSubmoduleV10", {
  namespace: t.string(),
  get module() {
    return RawModuleDefV10;
  }
});
var RawTableDefV10 = t.object("RawTableDefV10", {
  sourceName: t.string(),
  productTypeRef: t.u32(),
  primaryKey: t.array(t.u16()),
  get indexes() {
    return t.array(RawIndexDefV10);
  },
  get constraints() {
    return t.array(RawConstraintDefV10);
  },
  get sequences() {
    return t.array(RawSequenceDefV10);
  },
  get tableType() {
    return TableType;
  },
  get tableAccess() {
    return TableAccess;
  },
  get defaultValues() {
    return t.array(RawColumnDefaultValueV10);
  },
  isEvent: t.bool()
});
var RawTableDefV8 = t.object("RawTableDefV8", {
  tableName: t.string(),
  get columns() {
    return t.array(RawColumnDefV8);
  },
  get indexes() {
    return t.array(RawIndexDefV8);
  },
  get constraints() {
    return t.array(RawConstraintDefV8);
  },
  get sequences() {
    return t.array(RawSequenceDefV8);
  },
  tableType: t.string(),
  tableAccess: t.string(),
  scheduled: t.option(t.string())
});
var RawTableDefV9 = t.object("RawTableDefV9", {
  name: t.string(),
  productTypeRef: t.u32(),
  primaryKey: t.array(t.u16()),
  get indexes() {
    return t.array(RawIndexDefV9);
  },
  get constraints() {
    return t.array(RawConstraintDefV9);
  },
  get sequences() {
    return t.array(RawSequenceDefV9);
  },
  get schedule() {
    return t.option(RawScheduleDefV9);
  },
  get tableType() {
    return TableType;
  },
  get tableAccess() {
    return TableAccess;
  }
});
var RawTypeDefV10 = t.object("RawTypeDefV10", {
  get sourceName() {
    return RawScopedTypeNameV10;
  },
  ty: t.u32(),
  customOrdering: t.bool()
});
var RawTypeDefV9 = t.object("RawTypeDefV9", {
  get name() {
    return RawScopedTypeNameV9;
  },
  ty: t.u32(),
  customOrdering: t.bool()
});
var RawUniqueConstraintDataV9 = t.object("RawUniqueConstraintDataV9", {
  columns: t.array(t.u16())
});
var RawViewDefV10 = t.object("RawViewDefV10", {
  sourceName: t.string(),
  index: t.u32(),
  isPublic: t.bool(),
  isAnonymous: t.bool(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var RawViewDefV9 = t.object("RawViewDefV9", {
  name: t.string(),
  index: t.u32(),
  isPublic: t.bool(),
  isAnonymous: t.bool(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var RawViewPrimaryKeyDefV10 = t.object("RawViewPrimaryKeyDefV10", {
  viewSourceName: t.string(),
  columns: t.array(t.string())
});
var ReducerDef = t.object("ReducerDef", {
  name: t.string(),
  get args() {
    return t.array(ProductTypeElement);
  }
});
var SumType2 = t.object("SumType", {
  get variants() {
    return t.array(SumTypeVariant);
  }
});
var SumTypeVariant = t.object("SumTypeVariant", {
  name: t.option(t.string()),
  get algebraicType() {
    return AlgebraicType2;
  }
});
var TableAccess = t.enum("TableAccess", {
  Public: t.unit(),
  Private: t.unit()
});
var TableDesc = t.object("TableDesc", {
  get schema() {
    return RawTableDefV8;
  },
  data: t.u32()
});
var TableType = t.enum("TableType", {
  System: t.unit(),
  User: t.unit()
});
var TypeAlias = t.object("TypeAlias", {
  name: t.string(),
  ty: t.u32()
});
var Typespace = t.object("Typespace", {
  get types() {
    return t.array(AlgebraicType2);
  }
});
t.enum("ViewResultHeader", {
  RowData: t.unit(),
  RawSql: t.string()
});
function table(opts, row, ..._) {
  const {
    name,
    public: isPublic = false,
    indexes: userIndexes = [],
    scheduled,
    event: isEvent = false
  } = opts;
  const colIds = /* @__PURE__ */ new Map;
  const colNameList = [];
  if (!(row instanceof RowBuilder)) {
    row = new RowBuilder(row);
  }
  row.algebraicType.value.elements.forEach((elem, i2) => {
    colIds.set(elem.name, i2);
    colNameList.push(elem.name);
  });
  const pk = [];
  const indexes = [];
  const constraints = [];
  const sequences = [];
  let scheduleAtCol;
  const defaultValues = [];
  for (const [name2, builder] of Object.entries(row.row)) {
    const meta = builder.columnMetadata;
    if (meta.isPrimaryKey) {
      pk.push(colIds.get(name2));
    }
    const isUnique = meta.isUnique || meta.isPrimaryKey;
    if (meta.indexType || isUnique) {
      const algo = meta.indexType ?? "btree";
      const id = colIds.get(name2);
      let algorithm;
      switch (algo) {
        case "btree":
          algorithm = RawIndexAlgorithm.BTree([id]);
          break;
        case "hash":
          algorithm = RawIndexAlgorithm.Hash([id]);
          break;
        case "direct":
          algorithm = RawIndexAlgorithm.Direct(id);
          break;
      }
      indexes.push({
        sourceName: undefined,
        accessorName: name2,
        algorithm
      });
    }
    if (isUnique) {
      constraints.push({
        sourceName: undefined,
        data: { tag: "Unique", value: { columns: [colIds.get(name2)] } }
      });
    }
    if (meta.isAutoIncrement) {
      sequences.push({
        sourceName: undefined,
        start: undefined,
        minValue: undefined,
        maxValue: undefined,
        column: colIds.get(name2),
        increment: 1n
      });
    }
    if (Object.prototype.hasOwnProperty.call(meta, "defaultValue")) {
      const writer = new BinaryWriter(16);
      builder.serialize(writer, meta.defaultValue);
      defaultValues.push({
        colId: colIds.get(name2),
        value: writer.getBuffer()
      });
    }
    const algebraicType = builder.typeBuilder.algebraicType;
    if (schedule_at_default.isScheduleAt(algebraicType)) {
      scheduleAtCol = colIds.get(name2);
    }
  }
  for (const indexOpts of userIndexes ?? []) {
    const accessor = indexOpts.accessor;
    if (typeof accessor !== "string" || accessor.length === 0) {
      const tableLabel = name ?? "<unnamed>";
      const indexLabel = indexOpts.name ?? "<unnamed>";
      throw new TypeError(`Index '${indexLabel}' on table '${tableLabel}' must define a non-empty 'accessor'`);
    }
    let algorithm;
    switch (indexOpts.algorithm) {
      case "btree":
        algorithm = {
          tag: "BTree",
          value: indexOpts.columns.map((c) => colIds.get(c))
        };
        break;
      case "hash":
        algorithm = {
          tag: "Hash",
          value: indexOpts.columns.map((c) => colIds.get(c))
        };
        break;
      case "direct":
        algorithm = { tag: "Direct", value: colIds.get(indexOpts.column) };
        break;
    }
    indexes.push({
      sourceName: undefined,
      accessorName: accessor,
      algorithm,
      canonicalName: indexOpts.name
    });
  }
  for (const constraintOpts of opts.constraints ?? []) {
    if (constraintOpts.constraint === "unique") {
      const data = {
        tag: "Unique",
        value: { columns: constraintOpts.columns.map((c) => colIds.get(c)) }
      };
      constraints.push({ sourceName: constraintOpts.name, data });
      continue;
    }
  }
  const productType = row.algebraicType.value;
  const schedule = scheduled && scheduleAtCol !== undefined ? { scheduleAtCol, reducer: scheduled } : undefined;
  return {
    rowType: row,
    tableName: name,
    rowSpacetimeType: productType,
    tableDef: (ctx, accName) => {
      const tableName = name ?? accName;
      if (row.typeName === undefined) {
        row.typeName = toPascalCase(tableName);
      }
      for (const index of indexes) {
        const cols = index.algorithm.tag === "Direct" ? [index.algorithm.value] : index.algorithm.value;
        const colS = cols.map((i2) => colNameList[i2]).join("_");
        const sourceName = index.sourceName = `${accName}_${colS}_idx_${index.algorithm.tag.toLowerCase()}`;
        const { canonicalName } = index;
        if (canonicalName !== undefined) {
          ctx.moduleDef.explicitNames.entries.push(ExplicitNameEntry.Index({ sourceName, canonicalName }));
        }
      }
      return {
        sourceName: accName,
        productTypeRef: ctx.registerTypesRecursively(row).ref,
        primaryKey: pk,
        indexes,
        constraints,
        sequences,
        tableType: { tag: "User" },
        tableAccess: { tag: isPublic ? "Public" : "Private" },
        defaultValues,
        isEvent
      };
    },
    idxs: userIndexes,
    constraints,
    scheduleAtCol,
    schedule
  };
}
var Reducers = class {
  reducersType;
  constructor(handles) {
    this.reducersType = reducersToSchema(handles);
  }
};
function reducersToSchema(reducers2) {
  const mapped = reducers2.map((r) => {
    const paramsRow = r.params.row;
    return {
      name: r.reducerName,
      accessorName: r.accessorName,
      params: paramsRow,
      paramsType: r.paramsSpacetimeType
    };
  });
  const result = { reducers: mapped };
  return result;
}
function reducers(...args) {
  const handles = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return new Reducers(handles);
}
function reducerSchema(name, params) {
  const paramType = {
    elements: Object.entries(params).map(([n, c]) => ({
      name: n,
      algebraicType: "typeBuilder" in c ? c.typeBuilder.algebraicType : c.algebraicType
    }))
  };
  return {
    reducerName: name,
    accessorName: toCamelCase(name),
    params: new RowBuilder(params),
    paramsSpacetimeType: paramType,
    reducerDef: {
      name,
      params: paramType,
      lifecycle: undefined
    }
  };
}
function procedures(...args) {
  const procedures2 = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return { procedures: procedures2 };
}

// server/module_bindings/allow_auth_reducer.ts
var allow_auth_reducer_default = {
  issuer: t.string(),
  audience: t.string()
};

// server/module_bindings/deny_auth_reducer.ts
var deny_auth_reducer_default = {
  issuer: t.string()
};

// server/module_bindings/types.ts
var AuthPolicy = t.object("AuthPolicy", {
  id: t.u64(),
  issuer: t.string(),
  audience: t.string()
});
var CountryStat = t.object("CountryStat", {
  id: t.u64(),
  owner: t.identity(),
  country: t.string(),
  seen: t.u32(),
  correct: t.u32(),
  streak: t.u32(),
  lastMs: t.i64()
});
var ModuleOwner = t.object("ModuleOwner", {
  id: t.u32(),
  owner: t.identity()
});
var Player = t.object("Player", {
  identity: t.identity(),
  sub: t.string(),
  issuer: t.string(),
  name: t.string(),
  picture: t.string(),
  firstSeen: t.timestamp(),
  lastSeen: t.timestamp()
});
var SetProgress = t.object("SetProgress", {
  id: t.u64(),
  owner: t.identity(),
  setN: t.u32(),
  learned: t.bool(),
  choice: t.f32(),
  typed: t.f32(),
  done: t.bool()
});
var SetRow = t.object("SetRow", {
  setN: t.u32(),
  learned: t.bool(),
  choice: t.f32(),
  typed: t.f32(),
  done: t.bool()
});
var StatRow = t.object("StatRow", {
  country: t.string(),
  seen: t.u32(),
  correct: t.u32(),
  streak: t.u32(),
  lastMs: t.i64()
});

// server/module_bindings/import_progress_reducer.ts
var import_progress_reducer_default = {
  get stats() {
    return t.array(StatRow);
  },
  get sets() {
    return t.array(SetRow);
  }
};

// server/module_bindings/mark_learned_reducer.ts
var mark_learned_reducer_default = {
  setN: t.u32()
};

// server/module_bindings/record_answer_reducer.ts
var record_answer_reducer_default = {
  country: t.string(),
  ok: t.bool()
};

// server/module_bindings/record_quiz_reducer.ts
var record_quiz_reducer_default = {
  setN: t.u32(),
  phase: t.string(),
  accuracy: t.f32()
};

// server/module_bindings/reset_course_reducer.ts
var reset_course_reducer_default = {};

// server/module_bindings/reset_stats_reducer.ts
var reset_stats_reducer_default = {};

// server/module_bindings/country_stat_table.ts
var country_stat_table_default = t.row({
  id: t.u64().primaryKey(),
  owner: t.identity(),
  country: t.string(),
  seen: t.u32(),
  correct: t.u32(),
  streak: t.u32(),
  lastMs: t.i64().name("last_ms")
});

// server/module_bindings/player_table.ts
var player_table_default = t.row({
  identity: t.identity().primaryKey(),
  sub: t.string(),
  issuer: t.string(),
  name: t.string(),
  picture: t.string(),
  firstSeen: t.timestamp().name("first_seen"),
  lastSeen: t.timestamp().name("last_seen")
});

// server/module_bindings/set_progress_table.ts
var set_progress_table_default = t.row({
  id: t.u64().primaryKey(),
  owner: t.identity(),
  setN: t.u32().name("set_n"),
  learned: t.bool(),
  choice: t.f32(),
  typed: t.f32(),
  done: t.bool()
});

// server/module_bindings/index.ts
var tablesSchema = schema({
  countryStat: table({
    name: "country_stat",
    indexes: [
      { accessor: "id", name: "country_stat_id_idx_btree", algorithm: "btree", columns: [
        "id"
      ] },
      { accessor: "by_owner_country", name: "country_stat_owner_country_idx_btree", algorithm: "btree", columns: [
        "owner",
        "country"
      ] }
    ],
    constraints: [
      { name: "country_stat_id_key", constraint: "unique", columns: ["id"] }
    ]
  }, country_stat_table_default),
  player: table({
    name: "player",
    indexes: [
      { accessor: "identity", name: "player_identity_idx_btree", algorithm: "btree", columns: [
        "identity"
      ] }
    ],
    constraints: [
      { name: "player_identity_key", constraint: "unique", columns: ["identity"] }
    ]
  }, player_table_default),
  setProgress: table({
    name: "set_progress",
    indexes: [
      { accessor: "id", name: "set_progress_id_idx_btree", algorithm: "btree", columns: [
        "id"
      ] },
      { accessor: "by_owner_set", name: "set_progress_owner_set_n_idx_btree", algorithm: "btree", columns: [
        "owner",
        "setN"
      ] }
    ],
    constraints: [
      { name: "set_progress_id_key", constraint: "unique", columns: ["id"] }
    ]
  }, set_progress_table_default)
});
var reducersSchema = reducers(reducerSchema("allow_auth", allow_auth_reducer_default), reducerSchema("deny_auth", deny_auth_reducer_default), reducerSchema("import_progress", import_progress_reducer_default), reducerSchema("mark_learned", mark_learned_reducer_default), reducerSchema("record_answer", record_answer_reducer_default), reducerSchema("record_quiz", record_quiz_reducer_default), reducerSchema("reset_course", reset_course_reducer_default), reducerSchema("reset_stats", reset_stats_reducer_default));
var proceduresSchema = procedures();
var REMOTE_MODULE = {
  versionInfo: {
    cliVersion: "2.8.0"
  },
  tables: tablesSchema.schemaType.tables,
  reducers: reducersSchema.reducersType.reducers,
  ...proceduresSchema
};
var tableAccessorAliases = {
  country_stat: "countryStat",
  set_progress: "setProgress"
};
function __withTableAccessorAliases(target, freeze = false) {
  const out = Object.create(Object.getPrototypeOf(target));
  Object.defineProperties(out, Object.getOwnPropertyDescriptors(target));
  for (const [deprecatedAccessor, targetAccessor] of Object.entries(tableAccessorAliases)) {
    if (deprecatedAccessor in out) {
      continue;
    }
    Object.defineProperty(out, deprecatedAccessor, {
      enumerable: true,
      configurable: false,
      get: () => out[targetAccessor]
    });
  }
  return freeze ? Object.freeze(out) : out;
}
var tablesBase = makeQueryBuilder(tablesSchema.schemaType);
var tables = __withTableAccessorAliases(tablesBase, true);
var reducers2 = convertToAccessorMap(reducersSchema.reducersType.reducers);
var procedures2 = convertToAccessorMap(proceduresSchema.procedures);

class SubscriptionBuilder extends SubscriptionBuilderImpl {
}

class DbConnectionBuilder2 extends DbConnectionBuilder {
}

class DbConnection extends DbConnectionImpl {
  constructor(config) {
    super(config);
    this.db = __withTableAccessorAliases(this.db);
  }
  static builder = () => {
    return new DbConnectionBuilder2(REMOTE_MODULE, (config) => new DbConnection(config));
  };
  subscriptionBuilder = () => {
    return new SubscriptionBuilder(this);
  };
}
export {
  tables,
  reducers2 as reducers,
  procedures2 as procedures,
  SubscriptionBuilder,
  DbConnectionBuilder2 as DbConnectionBuilder,
  DbConnection
};
