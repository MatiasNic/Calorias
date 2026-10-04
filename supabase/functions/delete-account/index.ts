import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { deleteAccount } from '../_shared/handlers/account.ts';

const deps = createDeps();
Deno.serve(handle((req) => deleteAccount(req, deps)));
