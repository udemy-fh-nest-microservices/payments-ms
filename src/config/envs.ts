import * as j from 'joi';
import 'dotenv/config';

interface EnvironmentVariables {
  PORT: number;
  STRIPE_SECRET_KEY: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_CANCEL_URL: string;
  STRIPE_ENDPOINT_SECRET: string;
  NATS_SERVERS: string[];
}

const envSchema = j
  .object({
    PORT: j.number().required(),
    STRIPE_SECRET_KEY: j.string().required(),
    STRIPE_SUCCESS_URL: j.string().required(),
    STRIPE_CANCEL_URL: j.string().required(),
    STRIPE_ENDPOINT_SECRET: j.string().required(),
    NATS_SERVERS: j.array().items(j.string().required()).required(),
  })
  .unknown();

const { error, value: variables } = envSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = {
  ...(variables as EnvironmentVariables),
};
