import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { quotaStatus } from '../_shared/handlers/account.ts';

const deps = createDeps();
Deno.serve(handle((req) => quotaStatus(req, deps)));
