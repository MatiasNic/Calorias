// RLS & RPC tests. Executed by scripts/test-db.mjs against a freshly migrated database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';

const url = process.env.TEST_DATABASE_URL;
const A = randomUUID();
const B = randomUUID();
let client;

async function as(user, fn) {
  await client.query('begin');
  try {
    if (user === 'service') {
      await client.query('set local role service_role');
    } else if (user === 'anon') {
      await client.query('set local role anon');
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    } else {
      await client.query('set local role authenticated');
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: user, role: 'authenticated' }),
      ]);
    }
    const result = await fn();
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

const q = (sql, params) => client.query(sql, params);

function mealPayload(id, items = 2) {
  return {
    id,
    eaten_at: '2026-10-04T13:00:00-03:00',
    local_date: '2026-10-04',
    meal_type: 'lunch',
    source: 'photo',
    items: Array.from({ length: items }, (_, i) => ({
      display_name: i === 0 ? 'Milanesa de carne frita' : 'Puré de papa',
      food_id: i === 0 ? 'milanesa_carne_frita' : 'pure_papa',
      food_source: 'regional',
      grams: 150,
      per100g: { kcal: 270, protein_g: 18, carbs_g: 14, fat_g: 16 },
      nutrients: { kcal: 405, protein_g: 27, carbs_g: 21, fat_g: 24 },
      ai_confidence: 0.8,
    })),
  };
}

before(async () => {
  client = new pg.Client({ connectionString: url });
  await client.connect();
  await q(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@test.dev', '{"locale":"en-US","display_name":"Ana"}'), ($2, 'b@test.dev', '{}')`,
    [A, B],
  );
});

after(async () => {
  await client.end();
});

describe('new user bootstrap', () => {
  it('creates profile, settings, credits and streak rows', async () => {
    const r = await q('select locale, display_name from public.profiles where id = $1', [A]);
    assert.deepEqual(r.rows[0], { locale: 'en-US', display_name: 'Ana' });
    for (const t of ['notification_settings', 'user_credits', 'streaks']) {
      const c = await q(`select count(*)::int n from public.${t} where user_id = $1`, [A]);
      assert.equal(c.rows[0].n, 1, t);
    }
  });
});

describe('meals', () => {
  const mealId = randomUUID();

  it('owner upserts a meal atomically and totals are recomputed', async () => {
    await as(A, () =>
      q('select public.upsert_meal($1::jsonb)', [JSON.stringify(mealPayload(mealId))]),
    );
    const r = await as(A, () =>
      q('select kcal::float, protein_g::float from public.meals where id = $1', [mealId]),
    );
    assert.deepEqual(r.rows[0], { kcal: 810, protein_g: 54 });
    // re-upsert with 1 item replaces items
    await as(A, () =>
      q('select public.upsert_meal($1::jsonb)', [JSON.stringify(mealPayload(mealId, 1))]),
    );
    const r2 = await as(A, () => q('select kcal::float from public.meals where id = $1', [mealId]));
    assert.equal(r2.rows[0].kcal, 405);
  });

  it('maintains recent foods server-side', async () => {
    const r = await as(A, () =>
      q('select food_key, use_count from public.recent_foods order by food_key'),
    );
    assert.ok(
      r.rows.some((x) => x.food_key === 'regional:milanesa_carne_frita' && x.use_count === 2),
    );
  });

  it('another user cannot read, update or delete it', async () => {
    const r = await as(B, () => q('select * from public.meals where id = $1', [mealId]));
    assert.equal(r.rowCount, 0);
    const items = await as(B, () =>
      q('select * from public.meal_items where meal_id = $1', [mealId]),
    );
    assert.equal(items.rowCount, 0);
    const u = await as(B, () => q(`update public.meals set note = 'hack' where id = $1`, [mealId]));
    assert.equal(u.rowCount, 0);
    const d = await as(B, () => q('delete from public.meals where id = $1', [mealId]));
    assert.equal(d.rowCount, 0);
    const still = await as(A, () => q('select note from public.meals where id = $1', [mealId]));
    assert.equal(still.rows[0].note, null);
  });

  it('another user cannot hijack the meal through upsert_meal', async () => {
    await assert.rejects(
      as(B, () => q('select public.upsert_meal($1::jsonb)', [JSON.stringify(mealPayload(mealId))])),
    );
  });

  it('rejects inserting rows on behalf of another user', async () => {
    await assert.rejects(
      as(B, () =>
        q(
          `insert into public.water_logs (user_id, logged_at, local_date, ml) values ($1, now(), current_date, 250)`,
          [A],
        ),
      ),
    );
    await assert.rejects(
      as(B, () =>
        q(
          `insert into public.goals (user_id, kcal, protein_g, carbs_g, fat_g, effective_from) values ($1, 2000, 100, 200, 60, current_date)`,
          [A],
        ),
      ),
    );
  });

  it('anon cannot read user data', async () => {
    // Either no privilege at all or RLS filters everything out.
    const rows = await as('anon', () => q('select * from public.meals'))
      .then((r) => r.rowCount)
      .catch(() => 0);
    assert.equal(rows, 0);
  });
});

describe('profiles', () => {
  it('users only see their own profile', async () => {
    const r = await as(B, () => q('select id from public.profiles'));
    assert.deepEqual(
      r.rows.map((x) => x.id),
      [B],
    );
    const u = await as(B, () =>
      q(`update public.profiles set display_name = 'x' where id = $1`, [A]),
    );
    assert.equal(u.rowCount, 0);
  });
});

describe('server-only tables', () => {
  it('clients cannot grant themselves premium or quota', async () => {
    await assert.rejects(
      as(A, () =>
        q(`insert into public.subscriptions (user_id, status) values ($1, 'active')`, [A]),
      ),
    );
    await assert.rejects(
      as(A, () =>
        q(`insert into public.usage_quotas (user_id, day) values ($1, current_date)`, [A]),
      ),
    );
    await assert.rejects(
      as(A, () =>
        q(`update public.user_credits set bonus_photo_scans = 999 where user_id = $1`, [A]),
      ),
    );
    await assert.rejects(
      as(A, () =>
        q(`insert into public.ai_scans (user_id, kind, status) values ($1, 'photo', 'ok')`, [A]),
      ),
    );
  });

  it('clients cannot call service-only RPCs', async () => {
    await assert.rejects(
      as(A, () =>
        q(`select * from public.consume_quota($1, 'photo_scan', current_date, 999)`, [A]),
      ),
    );
    await assert.rejects(as(A, () => q(`select public.plan_for($1)`, [A])));
    await assert.rejects(as(A, () => q(`select public.ai_cost_today()`)));
  });
});

describe('quotas', () => {
  it('free users get 3 photo scans per day, then bonus credits', async () => {
    const consume = () =>
      as('service', () =>
        q(`select * from public.consume_quota($1, 'photo_scan', '2026-10-04', 3)`, [B]),
      );
    for (let i = 1; i <= 3; i++) {
      const r = await consume();
      assert.deepEqual(r.rows[0], { allowed: true, used: i, bucket: 'daily' });
    }
    assert.equal((await consume()).rows[0].allowed, false);

    await as('service', () =>
      q('update public.user_credits set bonus_photo_scans = 1 where user_id = $1', [B]),
    );
    assert.deepEqual((await consume()).rows[0], { allowed: true, used: 4, bucket: 'bonus' });
    assert.equal((await consume()).rows[0].allowed, false);

    await as('service', () =>
      q(`select public.refund_quota($1, 'photo_scan', '2026-10-04', 'bonus')`, [B]),
    );
    const credits = await as('service', () =>
      q('select bonus_photo_scans from public.user_credits where user_id = $1', [B]),
    );
    assert.equal(credits.rows[0].bonus_photo_scans, 1);
  });

  it('coach: one lifetime trial message for free users', async () => {
    const consume = () =>
      as('service', () =>
        q(`select * from public.consume_quota($1, 'coach_message', '2026-10-04', 0, 1)`, [B]),
      );
    assert.equal((await consume()).rows[0].bucket, 'trial');
    assert.equal((await consume()).rows[0].allowed, false);
  });

  it('users can read their own usage', async () => {
    const r = await as(B, () => q('select photo_scans from public.usage_quotas'));
    assert.equal(r.rows[0].photo_scans, 3); // 4 consumed, 1 refunded
    const other = await as(A, () => q('select * from public.usage_quotas'));
    assert.equal(other.rowCount, 0);
  });
});

describe('plan resolution', () => {
  it('derives premium only from an active, unexpired subscription', async () => {
    const plan = async () =>
      (await as('service', () => q('select public.plan_for($1) p', [A]))).rows[0].p;
    assert.equal(await plan(), 'free');
    await as('service', () =>
      q(
        `insert into public.subscriptions (user_id, status, expires_at, product_id, platform) values ($1, 'trialing', now() + interval '7 days', 'premium_annual', 'android')`,
        [A],
      ),
    );
    assert.equal(await plan(), 'premium');
    const mine = await as(A, () => q('select public.my_plan() p'));
    assert.equal(mine.rows[0].p, 'premium');
    await as('service', () =>
      q(
        `update public.subscriptions set status = 'expired', expires_at = now() - interval '1 day' where user_id = $1`,
        [A],
      ),
    );
    assert.equal(await plan(), 'free');
  });
});

describe('storage', () => {
  it('photos are private to their owner folder', async () => {
    await as(A, () =>
      q(`insert into storage.objects (bucket_id, name, owner) values ('meal-photos', $1, $2)`, [
        `${A}/m1.jpg`,
        A,
      ]),
    );
    const other = await as(B, () =>
      q(`select * from storage.objects where name = $1`, [`${A}/m1.jpg`]),
    );
    assert.equal(other.rowCount, 0);
    await assert.rejects(
      as(B, () =>
        q(`insert into storage.objects (bucket_id, name, owner) values ('meal-photos', $1, $2)`, [
          `${A}/evil.jpg`,
          B,
        ]),
      ),
    );
    const own = await as(A, () =>
      q(`select * from storage.objects where name = $1`, [`${A}/m1.jpg`]),
    );
    assert.equal(own.rowCount, 1);
  });
});

describe('reference data', () => {
  it('anon and users can read regional foods but not write them', async () => {
    const r = await as('anon', () => q('select count(*)::int n from public.foods_regional'));
    assert.ok(r.rows[0].n >= 150, `expected ≥150 regional foods, got ${r.rows[0].n}`);
    await assert.rejects(
      as(A, () =>
        q(
          `insert into public.foods_regional (id, name_es, name_en, name_pt, category, kcal, protein_g, carbs_g, fat_g, source) values ('x','x','x','x','x',1,1,1,1,'x')`,
        ),
      ),
    );
  });

  it('searches accent-insensitively and by alias', async () => {
    const pure = await as(A, () =>
      q(`select id from public.search_regional_foods('pure de papa', 5)`),
    );
    assert.equal(pure.rows[0].id, 'pure_papa');
    const mila = await as(A, () =>
      q(`select id from public.search_regional_foods('milanesa', 10)`),
    );
    assert.ok(mila.rows.length >= 4);
    const alias = await as(A, () => q(`select id from public.search_regional_foods('ñoquis', 5)`));
    assert.ok(alias.rows.some((x) => x.id === 'noquis'));
  });
});

describe('training & supplements', () => {
  const workoutId = randomUUID();
  const suppId = randomUUID();
  const intakeId = randomUUID();

  const insertWorkout = (user, id) =>
    q(
      `insert into public.workouts (id, user_id, started_at, local_date, activity, duration_min, intensity, kcal, exercises)
       values ($1, $2, '2026-10-06T18:00:00-03:00', '2026-10-06', 'gym', 60, 'moderate', 320, $3::jsonb)`,
      [id, user, JSON.stringify([{ key: 'squat', sets: [{ reps: 8, kg: 80 }] }])],
    );
  const insertSupplement = (user, id) =>
    q(
      `insert into public.supplements (id, user_id, name, preset, dose_amount, dose_unit, days, times, start_date)
       values ($1, $2, 'Creatina', 'creatine', 5, 'g', '{1,3,5}', '{08:00,21:30}', '2026-10-01')`,
      [id, user],
    );
  const insertIntake = (user, id, supplementId) =>
    q(
      `insert into public.supplement_intakes (id, user_id, supplement_id, taken_at, local_date, slot, dose_amount)
       values ($1, $2, $3, now(), '2026-10-06', '08:00', 5)`,
      [id, user, supplementId],
    );

  it('owner can create and read their rows', async () => {
    await as(A, () => insertWorkout(A, workoutId));
    await as(A, () => insertSupplement(A, suppId));
    await as(A, () => insertIntake(A, intakeId, suppId));
    for (const t of ['workouts', 'supplements', 'supplement_intakes']) {
      const r = await as(A, () => q(`select count(*)::int n from public.${t}`));
      assert.equal(r.rows[0].n, 1, t);
    }
  });

  it('another user cannot read, update or delete them', async () => {
    for (const [t, id] of [
      ['workouts', workoutId],
      ['supplements', suppId],
      ['supplement_intakes', intakeId],
    ]) {
      const r = await as(B, () => q(`select * from public.${t} where id = $1`, [id]));
      assert.equal(r.rowCount, 0, t);
      const u = await as(B, () =>
        q(`update public.${t} set deleted_at = now() where id = $1`, [id]),
      );
      assert.equal(u.rowCount, 0, t);
      const d = await as(B, () => q(`delete from public.${t} where id = $1`, [id]));
      assert.equal(d.rowCount, 0, t);
      const still = await as(A, () => q(`select deleted_at from public.${t} where id = $1`, [id]));
      assert.equal(still.rows[0].deleted_at, null, t);
    }
  });

  it('rejects writing rows on behalf of another user', async () => {
    await assert.rejects(as(B, () => insertWorkout(A, randomUUID())));
    await assert.rejects(as(B, () => insertSupplement(A, randomUUID())));
    await assert.rejects(as(B, () => insertIntake(A, randomUUID(), suppId)));
    // Nor attach an intake of their own to someone else's supplement.
    await assert.rejects(as(B, () => insertIntake(B, randomUUID(), suppId)));
  });

  it('upsert by the owner bumps updated_at for sync', async () => {
    const before = await as(A, () =>
      q('select updated_at from public.workouts where id = $1', [workoutId]),
    );
    await new Promise((r) => setTimeout(r, 10));
    await as(A, () => q(`update public.workouts set rpe = 7 where id = $1`, [workoutId]));
    const after_ = await as(A, () =>
      q('select updated_at, rpe from public.workouts where id = $1', [workoutId]),
    );
    assert.equal(after_.rows[0].rpe, 7);
    assert.ok(after_.rows[0].updated_at > before.rows[0].updated_at);
  });

  it('enforces value constraints', async () => {
    await assert.rejects(
      as(A, () => q(`update public.workouts set duration_min = 601 where id = $1`, [workoutId])),
    );
    await assert.rejects(
      as(A, () => q(`update public.workouts set intensity = 'extreme' where id = $1`, [workoutId])),
    );
    await assert.rejects(
      as(A, () => q(`update public.workouts set rpe = 11 where id = $1`, [workoutId])),
    );
    await assert.rejects(
      as(A, () => q(`update public.supplements set dose_unit = 'kg' where id = $1`, [suppId])),
    );
    await assert.rejects(
      as(A, () => q(`update public.supplements set times = '{25:00}' where id = $1`, [suppId])),
    );
    await assert.rejects(
      as(A, () => q(`update public.supplements set days = '{7}' where id = $1`, [suppId])),
    );
    await assert.rejects(
      as(A, () =>
        q(`update public.supplement_intakes set slot = 'noon' where id = $1`, [intakeId]),
      ),
    );
    await as(A, () =>
      q(`update public.supplement_intakes set slot = 'extra' where id = $1`, [intakeId]),
    );
  });

  it('anon cannot read them', async () => {
    for (const t of ['workouts', 'supplements', 'supplement_intakes']) {
      const rows = await as('anon', () => q(`select * from public.${t}`))
        .then((r) => r.rowCount)
        .catch(() => 0);
      assert.equal(rows, 0, t);
    }
  });
});

describe('account deletion', () => {
  it('deleting the auth user cascades to all personal data', async () => {
    await q('delete from auth.users where id = $1', [A]);
    for (const t of [
      'meals',
      'meal_items',
      'recent_foods',
      'subscriptions',
      'user_credits',
      'notification_settings',
      'workouts',
      'supplements',
      'supplement_intakes',
    ]) {
      const c = await q(`select count(*)::int n from public.${t} where user_id = $1`, [A]);
      assert.equal(c.rows[0].n, 0, t);
    }
    const p = await q('select count(*)::int n from public.profiles where id = $1', [A]);
    assert.equal(p.rows[0].n, 0);
  });
});
