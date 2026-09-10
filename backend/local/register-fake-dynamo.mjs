// Registers a resolve hook so `@aws-sdk/lib-dynamodb` and `@aws-sdk/client-dynamodb`
// resolve to the in-memory fake when running local-server.mjs.
import { register } from 'node:module';

register('./fake-dynamo-hooks.mjs', import.meta.url);
