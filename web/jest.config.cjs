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
            },
            astTransformers: {
                before: [
                    {
                        path: 'ts-jest-mock-import-meta',
                        options: {
                            metaObjectReplacement: {
                                env: {
                                    VITE_PAYMONGO_PUBLIC_KEY: 'pk_test_sandbox_key',
                                    VITE_PAYMONGO_SECRET_KEY: 'sk_test_sandbox_key',
                                    VITE_PAYMONGO_BASE_URL: 'https://api.paymongo.com/v1',
                                    VITE_PAYMONGO_SANDBOX: 'true',
                                },
                            },
                        },
                    },
                ],
            },
        }],
    },
    // Clear mocks automatically between tests
    clearMocks: true,
    // Reset mocks automatically between tests
    resetMocks: true,
    // Restore mocks automatically between tests
    restoreMocks: true,
};
