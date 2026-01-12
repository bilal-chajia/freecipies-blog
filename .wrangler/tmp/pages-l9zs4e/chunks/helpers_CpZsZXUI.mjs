if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

const normalizeStyleJsonObject = (value) => {
  if (!value || typeof value !== "object") return {};
  return {
    svg_code: value.svg_code ?? value.svgCode ?? value.icon,
    color: value.color,
    variant: value.variant
  };
};
function parseStyleJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeStyleJsonObject(parsed));
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(normalizeStyleJsonObject(value));
  }
  return "{}";
}
function transformTagRequestBody(body) {
  const transformed = { ...body };
  if (body.styleJson !== void 0) {
    transformed.styleJson = parseStyleJson(body.styleJson);
  } else if (body.color || body.svg_code || body.svgCode || body.variant || body.icon) {
    transformed.styleJson = parseStyleJson({
      color: body.color,
      svg_code: body.svg_code ?? body.svgCode ?? body.icon,
      variant: body.variant
    });
  }
  delete transformed.color;
  delete transformed.icon;
  delete transformed.svg_code;
  delete transformed.svgCode;
  delete transformed.variant;
  return transformed;
}
function transformTagResponse(tag) {
  if (!tag) return tag;
  const response = { ...tag };
  if (tag.styleJson) {
    try {
      const style = JSON.parse(tag.styleJson);
      response.color = style.color;
      response.svgCode = style.svg_code;
      response.icon = style.svg_code;
      response.variant = style.variant;
    } catch {
    }
  }
  return response;
}

export { transformTagRequestBody as a, transformTagResponse as t };
