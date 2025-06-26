import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? Environment.production : Environment.sandbox;

if (!PADDLE_API_KEY) {
  throw new Error('Missing PADDLE_API_KEY environment variable');
}

// Ensure PADDLE_ENVIRONMENT is one of the valid enum values, default to sandbox if invalid/missing for safety in dev
let paddleEnv: Environment;
if (PADDLE_ENVIRONMENT === Environment.production) {
  paddleEnv = Environment.production;
} else {
  // Default to sandbox if NEXT_PUBLIC_PADDLE_ENV is not 'production' or is undefined
  paddleEnv = Environment.sandbox;
}

export const paddle = new Paddle(PADDLE_API_KEY, {
  environment: paddleEnv,
});
