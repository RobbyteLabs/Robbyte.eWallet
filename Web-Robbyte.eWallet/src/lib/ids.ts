export const createId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
