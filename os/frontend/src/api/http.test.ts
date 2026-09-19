import { ApiError } from './ApiError'
import { REFRESH_LOCK_KEY, REFRESH_LOCK_MS, accessToken, api, resetHttpState } from './http'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const envelopeError = (code: string, status: number, message: string, fieldErrors?: unknown) =>
  jsonResponse(status, { success: false, error: { code, status, message, fieldErrors } })

const ok = (data: unknown) => jsonResponse(200, { success: true, data })

describe('cliente HTTP', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    resetHttpState()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const urlOf = (call: unknown[]) => String(call[0])

  it('manda o access token e devolve só o data do envelope', async () => {
    accessToken.set('tok-1')
    fetchMock.mockResolvedValueOnce(ok({ email: 'a@b.com' }))

    await expect(api.get('/auth/me')).resolves.toEqual({ email: 'a@b.com' })

    const headers = new Headers((fetchMock.mock.calls[0]![1] as RequestInit).headers)
    expect(headers.get('Authorization')).toBe('Bearer tok-1')
  })

  it('transforma o erro da API em ApiError com os campos', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeError('VALIDATION_ERROR', 422, 'Dados inválidos', [
        { field: 'password', message: 'A senha precisa ter ao menos 8 caracteres' },
      ]),
    )

    const error = await api.post('/auth/first-access', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error as ApiError).toMatchObject({ code: 'VALIDATION_ERROR', status: 422 })
    expect((error as ApiError).fieldError('password')).toBe(
      'A senha precisa ter ao menos 8 caracteres',
    )
  })

  it('em 401 renova a sessão uma vez e repete a chamada', async () => {
    accessToken.set('velho')
    fetchMock
      .mockResolvedValueOnce(envelopeError('UNAUTHORIZED', 401, 'Não autenticado'))
      .mockResolvedValueOnce(ok({ accessToken: 'novo', expiresIn: 900, tokenType: 'Bearer' }))
      .mockResolvedValueOnce(ok({ email: 'a@b.com' }))

    await expect(api.get('/auth/me')).resolves.toEqual({ email: 'a@b.com' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(urlOf(fetchMock.mock.calls[1]!)).toContain('/auth/refresh')
    expect(accessToken.get()).toBe('novo')
  })

  it('duas chamadas simultâneas com 401 geram UMA renovação', async () => {
    accessToken.set('velho')
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/auth/refresh')) {
        return Promise.resolve(ok({ accessToken: 'novo', expiresIn: 900, tokenType: 'Bearer' }))
      }
      return Promise.resolve(
        accessToken.get() === 'novo'
          ? ok({ ok: true })
          : envelopeError('UNAUTHORIZED', 401, 'Não autenticado'),
      )
    })

    await Promise.all([api.get('/a'), api.get('/b')])

    const refreshes = fetchMock.mock.calls.filter((c) => urlOf(c).includes('/auth/refresh'))
    expect(refreshes).toHaveLength(1)
  })

  it('não renova enquanto outra aba está renovando', async () => {
    accessToken.set('velho')
    localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()))
    fetchMock.mockResolvedValue(envelopeError('UNAUTHORIZED', 401, 'Não autenticado'))

    await api.get('/auth/me').catch(() => undefined)

    // Se as duas abas renovassem, o backend veria o mesmo refresh token duas vezes
    // e trataria como roubo, derrubando TODAS as sessões da pessoa.
    expect(fetchMock.mock.calls.filter((c) => urlOf(c).includes('/auth/refresh'))).toHaveLength(0)
  })

  it('uma trava velha não trava o sistema para sempre', async () => {
    accessToken.set('velho')
    localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now() - REFRESH_LOCK_MS - 1))
    fetchMock
      .mockResolvedValueOnce(envelopeError('UNAUTHORIZED', 401, 'Não autenticado'))
      .mockResolvedValueOnce(ok({ accessToken: 'novo', expiresIn: 900, tokenType: 'Bearer' }))
      .mockResolvedValueOnce(ok({ email: 'a@b.com' }))

    await expect(api.get('/auth/me')).resolves.toEqual({ email: 'a@b.com' })
  })

  it('renovação que falha limpa a sessão e avisa quem está ouvindo', async () => {
    accessToken.set('velho')
    const onSessionLost = vi.fn()
    accessToken.onLost(onSessionLost)
    fetchMock
      .mockResolvedValueOnce(envelopeError('UNAUTHORIZED', 401, 'Não autenticado'))
      .mockResolvedValueOnce(envelopeError('UNAUTHORIZED', 401, 'Sessão inválida ou expirada'))

    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(accessToken.get()).toBeNull()
    expect(onSessionLost).toHaveBeenCalledOnce()
  })

  it('não tenta renovar quando o próprio login falha', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeError('UNAUTHORIZED', 401, 'E-mail ou senha inválidos.'),
    )

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('libera a trava depois de renovar, para a próxima aba conseguir', async () => {
    accessToken.set('velho')
    fetchMock
      .mockResolvedValueOnce(envelopeError('UNAUTHORIZED', 401, 'Não autenticado'))
      .mockResolvedValueOnce(ok({ accessToken: 'novo', expiresIn: 900, tokenType: 'Bearer' }))
      .mockResolvedValueOnce(ok({}))

    await api.get('/auth/me')

    expect(localStorage.getItem(REFRESH_LOCK_KEY)).toBeNull()
  })
})
