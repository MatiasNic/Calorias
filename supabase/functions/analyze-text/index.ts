import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { analyzeText } from '../_shared/handlers/analyzeText.ts';

const deps = createDeps();
Deno.serve(handle((req) => analyzeText(req, deps)));
