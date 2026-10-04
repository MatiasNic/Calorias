import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { mealPlan } from '../_shared/handlers/coach.ts';

const deps = createDeps();
Deno.serve(handle((req) => mealPlan(req, deps)));
