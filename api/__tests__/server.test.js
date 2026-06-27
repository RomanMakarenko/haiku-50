import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock OpenAI before importing the app
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  }
})

import app from '../server.js'

async function postJson(url, body) {
  // Direct handler call approach – we import and test the Express app's logic
  // via supertest-like manual approach using the app's exported router
  const { createServer } = await import('http')
  return new Promise((resolve, reject) => {
    const server = createServer(app)
    server.listen(0, () => {
      const { port } = server.address()
      const options = {
        hostname: 'localhost',
        port,
        path: url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
      const req = require('http').request(options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          server.close()
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) })
          } catch {
            resolve({ status: res.statusCode, body: data })
          }
        })
      })
      req.on('error', (err) => {
        server.close()
        reject(err)
      })
      req.write(JSON.stringify(body))
      req.end()
    })
  })
}

async function getUrl(url) {
  const { createServer } = await import('http')
  return new Promise((resolve, reject) => {
    const server = createServer(app)
    server.listen(0, () => {
      const { port } = server.address()
      const options = {
        hostname: 'localhost',
        port,
        path: url,
        method: 'GET',
      }
      const req = require('http').request(options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          server.close()
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) })
          } catch {
            resolve({ status: res.statusCode, body: data })
          }
        })
      })
      req.on('error', (err) => {
        server.close()
        reject(err)
      })
      req.end()
    })
  })
}

describe('POST /api/generate', () => {
  it('повертає 400, коли keywords < 3', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'сакура',
      language: 'uk',
      spiciness: 0,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('3')
  })

  it('повертає 400, коли keywords > 7', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'a, b, c, d, e, f, g, h',
      language: 'uk',
      spiciness: 0,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('7')
  })

  it('повертає 400, коли language відсутня', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'сакура, дощ, вітер',
      spiciness: 0,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('мов')
  })

  it('повертає 400, коли language не зі списку', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'сакура, дощ, вітер',
      language: 'xx',
      spiciness: 0,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Мова')
  })

  it('повертає 400, коли spiciness поза 0-6', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'сакура, дощ, вітер',
      language: 'uk',
      spiciness: 10,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('гостроти')
  })

  it('повертає 400, коли keywords містять мат/агресію', async () => {
    const res = await postJson('/api/generate', {
      keywords: 'fuck, you, bastard',
      language: 'en',
      spiciness: 0,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('нецензурні')
  })

  it('повертає 200 з fallback:true при недоступності OpenAI', async () => {
    const OpenAI = await import('openai')
    const mockCreate = vi.mocked(OpenAI.default).mock.results[0]?.value?.chat?.completions?.create

    if (mockCreate) {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI unavailable'))
    }

    process.env.OPENAI_API_KEY = 'test-key'

    const res = await postJson('/api/generate', {
      keywords: 'сакура, дощ, вітер',
      language: 'uk',
      spiciness: 0,
    })

    // If mock wasn't set up properly, the test still works via the error path
    expect(res.status).toBe(200)
    expect(res.body.fallback).toBe(true)
    expect(typeof res.body.haiku).toBe('string')
    expect(res.body.haiku.length).toBeGreaterThan(0)
  })
})

describe('GET /api/health', () => {
  it('повертає 200', async () => {
    const res = await getUrl('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})