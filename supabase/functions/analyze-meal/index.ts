import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { analyzeMeal } from '../_shared/handlers/analyzeMeal.ts';

const deps = createDeps();
Deno.serve(handle((req) => analyzeMeal(req, deps)));
