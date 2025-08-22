#!/usr/bin/env node
// Simple load test for public quote endpoint using fetch & concurrency.
// Usage: node scripts/loadtest-public-quote.js <public_token> [count=100] [concurrency=10]

const token = process.argv[2]
const total = Number(process.argv[3] || 100)
const conc = Number(process.argv[4] || 10)
if (!token) {
  console.error('Usage: node scripts/loadtest-public-quote.js <public_token> [count] [concurrency]')
  process.exit(1)
}

const endpoint = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/quotes/public/${token}`

async function worker(id, jobs) {
  let ok = 0, fail = 0, rate429 = 0
  for (let i =0;i<jobs;i++) {
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ total: 1 }) })
      if (res.status === 429) rate429++
      else if (res.ok) ok++
      else fail++
    } catch { fail++ }
  }
  return { ok, fail, rate429 }
}

;(async () => {
  const per = Math.ceil(total / conc)
  const start = Date.now()
  const results = await Promise.all(Array.from({ length: conc }, (_,i)=> worker(i, per)))
  const agg = results.reduce((a,r)=>({ ok:a.ok+r.ok, fail:a.fail+r.fail, rate429:a.rate429+r.rate429 }), { ok:0, fail:0, rate429:0 })
  const ms = Date.now()-start
  console.log(JSON.stringify({ endpoint, totalAttempts: per*conc, durationMs: ms, rps: ((per*conc)/(ms/1000)).toFixed(1), ...agg }, null, 2))
})()
