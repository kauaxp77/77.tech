import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Config própria do frontend do OS. Sem ela, o eslint subia até a da raiz do site,
 * que ignora `os/**` — e o comando `npm run lint` passava sem ter checado nada.
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // onSubmit/onClick com função async é o jeito normal de escrever React, e os
      // nossos já tratam o erro por dentro. O resto da regra continua ligado.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Testes usam os globais do Vitest (describe/it/expect/vi) sem importar.
    files: ['**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    languageOptions: {
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', vi: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' },
    },
  },
)
