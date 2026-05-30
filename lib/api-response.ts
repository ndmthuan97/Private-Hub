import { NextResponse } from 'next/server'

// Every endpoint MUST return: { statusCode, message, data, errors }
export interface ApiResponse<T = unknown> {
  statusCode: number
  message:    string
  data:       T | null
  errors:     Record<string, unknown> | null
}

export function ok<T>(data: T, message = 'success', status = 200): NextResponse {
  const body: ApiResponse<T> = { statusCode: status, message, data, errors: null }
  return NextResponse.json(body, { status })
}

export function created<T>(data: T, message = 'created'): NextResponse {
  return ok(data, message, 201)
}

export function badRequest(message: string, errors?: Record<string, unknown>): NextResponse {
  const body: ApiResponse = { statusCode: 400, message, data: null, errors: errors ?? null }
  return NextResponse.json(body, { status: 400 })
}

export function notFound(message = 'Not found'): NextResponse {
  const body: ApiResponse = { statusCode: 404, message, data: null, errors: null }
  return NextResponse.json(body, { status: 404 })
}

export function serverError(message: string, err?: unknown): NextResponse {
  const detail = err instanceof Error ? err.message : String(err ?? '')
  const body: ApiResponse = {
    statusCode: 500,
    message,
    data:   null,
    errors: detail ? { detail } : null,
  }
  return NextResponse.json(body, { status: 500 })
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  const body: ApiResponse = { statusCode: 401, message, data: null, errors: null }
  return NextResponse.json(body, { status: 401 })
}

export function unprocessable(message: string): NextResponse {
  const body: ApiResponse = { statusCode: 422, message, data: null, errors: null }
  return NextResponse.json(body, { status: 422 })
}
