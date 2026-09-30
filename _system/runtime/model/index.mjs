import { runFixture } from './providers/fixture.mjs';
import { runHttpCompatible } from './providers/http-compatible.mjs';

export async function runModel(input){
  const provider=process.env.CC_MODEL_PROVIDER||'fixture';
  if(provider==='fixture') return runFixture(input);
  if(provider==='http-compatible') return runHttpCompatible(input);
  throw new Error(`unsupported CC_MODEL_PROVIDER: ${provider}`);
}
