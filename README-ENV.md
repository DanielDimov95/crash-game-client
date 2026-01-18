# Environment Configuration

## Using Environment Variables

This project uses Angular's environment files to manage configuration. The token and API URLs are stored in:

- `src/environments/environment.ts` - Development environment
- `src/environments/environment.prod.ts` - Production environment

## Updating the Token

If you have a `.env` file with `TOKEN=...`, you need to update the environment files manually:

1. Open `src/environments/environment.ts`
2. Update the `sessionToken` value with your token from `.env`
3. Do the same for `src/environments/environment.prod.ts` if needed

## Current Configuration

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'https://rlgl-dev.bluecroco.com/api/1.0',
  hubUrl: 'https://rlgl-dev.bluecroco.com/hubs/1.0/',
  hubName: 'transactions',
  sessionToken: 'YOUR_TOKEN_HERE'
};
```

## Note

Angular doesn't natively support `.env` files. If you want automatic `.env` file support, you would need to:
1. Install `@angular-builders/custom-webpack` and `dotenv-webpack`
2. Configure custom webpack to load `.env` files
3. Use `process.env` in environment files

For now, simply update the `sessionToken` in the environment files directly.
