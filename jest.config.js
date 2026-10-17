module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/lib'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json', diagnostics: false }] },
};
