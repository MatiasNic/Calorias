import { createDeps } from '../_shared/supabaseDeps.ts';
import { handle } from '../_shared/http.ts';
import { revenuecatWebhook } from '../_shared/handlers/revenuecat.ts';

const deps = createDeps();
Deno.serve(handle((req) => revenuecatWebhook(req, deps)));
