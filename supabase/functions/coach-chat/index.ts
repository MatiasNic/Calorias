import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { coachChat } from '../_shared/handlers/coach.ts';

const deps = createDeps();
Deno.serve(handle((req) => coachChat(req, deps)));
