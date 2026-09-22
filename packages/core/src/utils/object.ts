export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const targetVal = (target as any)[key];
      const sourceVal = (source as any)[key];
      if (isObject(targetVal) && isObject(sourceVal)) {
        (output as any)[key] = deepMerge(targetVal, sourceVal);
      } else if (sourceVal !== undefined) {
        (output as any)[key] = sourceVal;
      }
    });
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function generateId(prefix = 'cblx'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}
