module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/src/tests/unit/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/src/tests/unit/setup.ts'],
    collectCoverageFrom: [
        'src/services/**/*.ts',
        '!src/services/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: {
                ignoreCodes: [1343, 2339] // Ignore import.meta.env related errors
            }
        }],
    },
    // Clear mocks automatically between tests
    clearMocks: true,
    // Reset mocks automatically between tests
    resetMocks: true,
    // Restore mocks automatically between tests
    restoreMocks: true,
};
