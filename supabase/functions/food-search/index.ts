import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { foodSearch } from '../_shared/handlers/foods.ts';

const deps = createDeps();
Deno.serve(handle((req) => foodSearch(req, deps)));
