/**
 * file: url-guard.ts
 * description: 出站 URL 安全网关 · SSRF 防护与请求加固
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-01
 * updated: 2026-11-20
 * status: active
 * tags: [security],[ssrf],[network],[guard]
 *
 * brief: 出站 URL 安全网关，防护 SSRF 攻击并加固 HTTP 请求。
 *
 * details:
 * - 仅允许 http/https 协议，拒绝 URL 内嵌凭据
 * - DNS 解析后逐一校验 IP，覆盖 IPv4 私有/保留段、IPv6 本地/链路本地/映射地址
 * - 禁止重定向跟随（防止 302 绕过），带硬超时与响应体大小上限
 * - 覆盖 169.254.0.0/16 云元数据、0.0.0.0/8、IPv6 本地/链路本地/IPv4 映射
 * - 拒绝十进制与十六进制 IP 变形
 * - 残留风险：DNS rebinding（TOCTOU 窗口），生产环境应配合出口防火墙白名单
 *
 * dependencies: node:dns/promises, node:net
 * exports: validateUrl, fetchSafe
 * notes: 生产环境应配合出口防火墙白名单
 */

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const DEFAULT_FETCH_TIMEOUT_MS = 10_000
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576

const BLOCKED_IPV4_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  const octets = parts.map((part) => Number(part))
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return (((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0)
}

function ipv4InCidr(ip: string, base: string, bits: number): boolean {
  const value = ipv4ToInt(ip)
  if (value === null) return false
  const mask = bits === 0 ? 0 : ((0xffffffff << (32 - bits)) >>> 0)
  return (value & mask) === ((ipv4ToInt(base) ?? 0) & mask)
}

function isPrivateIpv4(ip: string): boolean {
  return BLOCKED_IPV4_CIDRS.some(([base, bits]) => ipv4InCidr(ip, base, bits))
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/%.*$/, "")
  if (normalized === "::" || normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true
  if (/^f[cd]/.test(normalized)) return true // fc00::/7 unique local
  if (/^fe[89ab]/.test(normalized)) return true // fe80::/10 link local
  if (/^fe[c-f]/.test(normalized)) return true // fec0::/10 site local (deprecated)

  const mapped = normalized.match(/::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/)
  if (mapped) {
    if (mapped[1]) return isPrivateIpv4(mapped[1])
    const high = Number.parseInt(mapped[2]!, 16)
    const low = Number.parseInt(mapped[3]!, 16)
    return isPrivateIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`)
  }

  const nat64 = normalized.match(/64:ff9b::(?:[0-9a-f]{1,4}:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (nat64) {
    const high = Number.parseInt(nat64[1]!, 16)
    const low = Number.parseInt(nat64[2]!, 16)
    const embedded = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
    return isPrivateIpv4(embedded)
  }

  return false
}

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPrivateIpv4(ip)
  if (version === 6) return isPrivateIpv6(ip)
  return false
}

export async function validateUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`)
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Forbidden protocol: ${parsed.protocol}`)
  }
  if (parsed.username || parsed.password) {
    throw new Error("SSRF protection: URL credentials are not allowed")
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").replace(/%.*$/, "").toLowerCase()
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("SSRF protection: local hostnames are not allowed")
  }

  let addresses: string[]
  if (isIP(hostname)) {
    addresses = [hostname]
  } else {
    try {
      addresses = (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address)
    } catch {
      throw new Error("SSRF protection: URL host resolution failed")
    }
  }

  if (addresses.length === 0) {
    throw new Error("SSRF protection: URL host resolution failed")
  }
  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error("SSRF protection: private network addresses are not allowed")
    }
  }

  return parsed
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text()
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new Error(`HTTP request failed: response exceeds ${maxBytes} bytes`)
    }
    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new Error(`HTTP request failed: response exceeds ${maxBytes} bytes`)
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

export async function fetchExternal(url: string, init: RequestInit = {}): Promise<unknown> {
  await validateUrl(url)

  const timeoutMs = positiveInt(process.env.WORKFLOW_HTTP_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS)
  const maxBytes = positiveInt(process.env.WORKFLOW_HTTP_MAX_BYTES, DEFAULT_MAX_RESPONSE_BYTES)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...init, redirect: "manual", signal: controller.signal })
    if (response.status >= 300 && response.status < 400) {
      throw new Error("HTTP request failed: redirects are not allowed")
    }
    const body = await readTextWithLimit(response, maxBytes)
    try {
      return JSON.parse(body) as unknown
    } catch {
      throw new Error("HTTP request failed: response is not valid JSON")
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || controller.signal.aborted)) {
      throw new Error(`HTTP request failed: timeout after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
