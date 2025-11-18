export function createSpyObj<T extends Record<string, any>>(
  methodNames: Array<keyof T | string> = [],
  propertyMocks: Partial<T> = {}
): jest.Mocked<T> {
  const mock: Record<string, any> = {};

  methodNames.forEach((methodName) => {
    mock[methodName as string] = jest.fn();
  });

  return Object.assign(mock, propertyMocks) as jest.Mocked<T>;
}
