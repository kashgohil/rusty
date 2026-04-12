import type {
  LessonFile,
  LspSessionCreateRequest,
  LspSessionCreateResponse,
} from '@rust-learning/shared-types'
import type * as Monaco from 'monaco-editor'
import { LSP_URL } from '~/utils/env'

type JsonRpcId = number

type JsonRpcSuccess = {
  id: JsonRpcId
  jsonrpc: '2.0'
  result?: unknown
}

type JsonRpcError = {
  id: JsonRpcId
  jsonrpc: '2.0'
  error: {
    code: number
    message: string
  }
}

type JsonRpcRequest = {
  id: JsonRpcId
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

type JsonRpcNotification = {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

type JsonRpcMessage = JsonRpcSuccess | JsonRpcError | JsonRpcRequest | JsonRpcNotification

type LspPosition = {
  line: number
  character: number
}

type LspRange = {
  start: LspPosition
  end: LspPosition
}

type LspDiagnostic = {
  message: string
  range: LspRange
  severity?: number
}

type LspTextEdit = {
  newText: string
  range: LspRange
}

type LspCompletionItem = {
  label: string
  detail?: string
  documentation?: string | { value?: string }
  insertText?: string
  kind?: number
}

type LspHover = {
  contents?:
    | string
    | { value?: string }
    | Array<string | { value?: string }>
  range?: LspRange
}

type LspLocation = {
  uri: string
  range: LspRange
}

type LspSession = {
  filePaths: Record<string, string>
  rootPath: string
  sessionId: string
}

export type LspConnectionState = 'connecting' | 'ready' | 'offline' | 'error'
export type LspStatus = {
  detail?: string
  state: LspConnectionState
}

export type LessonDiagnostic = {
  message: string
  path: string
  range: LspRange
  severity?: number
}

export type LessonEditorLocation = {
  path: string
  range: LspRange
}

function getLspSocketUrl(sessionId: string) {
  const base = new URL(LSP_URL)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = `${base.pathname.replace(/\/$/, '')}/lsp/ws`
  base.searchParams.set('sessionId', sessionId)
  return base.toString()
}

async function createLspSession(
  lessonSlug: string,
  entryFile: string,
  files: LessonFile[],
) {
  const response = await fetch(`${LSP_URL}/lsp/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entryFile,
      files,
      lessonSlug,
    } satisfies LspSessionCreateRequest),
  })

  if (!response.ok) {
    throw new Error('Failed to create LSP workspace')
  }

  const payload = (await response.json()) as LspSessionCreateResponse
  return {
    filePaths: payload.filePaths,
    rootPath: payload.rootPath,
    sessionId: payload.sessionId,
  } satisfies LspSession
}

function toLspPosition(model: Monaco.editor.ITextModel, position: Monaco.Position): LspPosition {
  return {
    line: position.lineNumber - 1,
    character: position.column - 1,
  }
}

function toMonacoRange(range: LspRange): Monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  }
}

function toMarkerSeverity(monaco: typeof Monaco, severity?: number) {
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error
    case 2:
      return monaco.MarkerSeverity.Warning
    case 3:
      return monaco.MarkerSeverity.Info
    default:
      return monaco.MarkerSeverity.Hint
  }
}

function completionKind(monaco: typeof Monaco, kind?: number) {
  switch (kind) {
    case 2:
      return monaco.languages.CompletionItemKind.Method
    case 3:
      return monaco.languages.CompletionItemKind.Function
    case 5:
      return monaco.languages.CompletionItemKind.Field
    case 6:
      return monaco.languages.CompletionItemKind.Variable
    case 7:
      return monaco.languages.CompletionItemKind.Class
    case 8:
      return monaco.languages.CompletionItemKind.Interface
    case 9:
      return monaco.languages.CompletionItemKind.Module
    case 10:
      return monaco.languages.CompletionItemKind.Property
    case 12:
      return monaco.languages.CompletionItemKind.Value
    case 14:
      return monaco.languages.CompletionItemKind.Keyword
    case 15:
      return monaco.languages.CompletionItemKind.Snippet
    case 17:
      return monaco.languages.CompletionItemKind.File
    case 22:
      return monaco.languages.CompletionItemKind.Struct
    case 23:
      return monaco.languages.CompletionItemKind.Event
    case 24:
      return monaco.languages.CompletionItemKind.Operator
    case 25:
      return monaco.languages.CompletionItemKind.TypeParameter
    default:
      return monaco.languages.CompletionItemKind.Text
  }
}

function hoverText(contents: LspHover['contents']) {
  if (!contents) {
    return null
  }

  const items = Array.isArray(contents) ? contents : [contents]
  const value = items
    .map((item) => (typeof item === 'string' ? item : item.value ?? ''))
    .filter(Boolean)
    .join('\n\n')

  return value ? { value } : null
}

function isRustSource(path: string) {
  return path.endsWith('.rs')
}

export function workspaceFileUri(
  filePaths: Record<string, string> | null,
  path: string,
) {
  const absolutePath = filePaths?.[path]
  return absolutePath ? `file://${absolutePath}` : `inmemory:///${path}`
}

export class RustLspClient {
  private diagnostics = new Map<string, LspDiagnostic[]>()
  private didSaveTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>()
  private editor: Monaco.editor.IStandaloneCodeEditor | null = null
  private lastFiles: LessonFile[] = []
  private openedDocuments = new Map<string, string>()
  private pending = new Map<
    JsonRpcId,
    { reject: (error: Error) => void; resolve: (value: unknown) => void }
  >()
  private providers: Monaco.IDisposable[] = []
  private requestId = 1
  private socket: WebSocket | null = null
  private versions = new Map<string, number>()
  private ready = false
  private session: LspSession | null = null
  private onDefinitionNavigation:
    | ((payload: { from: LessonEditorLocation; to: LessonEditorLocation }) => void)
    | null = null

  constructor(
    private readonly lessonSlug: string,
    private readonly entryFile: string,
    private readonly monaco: typeof Monaco,
    private readonly onDiagnosticsChange: (diagnostics: LessonDiagnostic[]) => void,
    private readonly onStateChange: (state: LspStatus) => void,
  ) {}

  setEditor(editor: Monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor
  }

  setDefinitionNavigationHandler(
    handler: ((payload: { from: LessonEditorLocation; to: LessonEditorLocation }) => void) | null,
  ) {
    this.onDefinitionNavigation = handler
  }

  async connect(files: LessonFile[]) {
    this.onStateChange({ state: 'connecting', detail: 'Starting lesson workspace' })
    this.lastFiles = files
    this.session = await createLspSession(this.lessonSlug, this.entryFile, files)
    this.ensureModels(files)

    this.socket = new WebSocket(getLspSocketUrl(this.session.sessionId))
    this.socket.addEventListener('open', () => {
      void this.initialize()
    })
    this.socket.addEventListener('message', (event) => {
      this.handleMessage(String(event.data))
    })
    this.socket.addEventListener('close', () => {
      this.ready = false
      this.onStateChange({ state: 'offline', detail: 'LSP session closed' })
    })
    this.socket.addEventListener('error', () => {
      this.ready = false
      this.onStateChange({ state: 'error', detail: 'Unable to reach LSP bridge' })
    })

    this.registerProviders()
  }

  dispose() {
    for (const provider of this.providers) {
      provider.dispose()
    }

    for (const [uri] of this.openedDocuments) {
      this.notify('textDocument/didClose', {
        textDocument: { uri },
      })
    }

    this.openedDocuments.clear()
    for (const timer of this.didSaveTimers.values()) {
      globalThis.clearTimeout(timer)
    }
    this.didSaveTimers.clear()
    this.versions.clear()
    this.ready = false
    this.socket?.close()
    this.socket = null
    this.session = null
    this.editor = null
  }

  getFileUri(path: string) {
    return workspaceFileUri(this.session?.filePaths ?? null, path)
  }

  getPathForUri(uri: string) {
    const filePaths = this.session?.filePaths ?? {}
    return (
      Object.entries(filePaths).find(([, absolutePath]) => `file://${absolutePath}` === uri)?.[0] ??
      null
    )
  }

  ensureModels(files: LessonFile[]) {
    if (!this.session) {
      return
    }

    for (const file of files.filter(
      (item) => item.editable !== false && isRustSource(item.path),
    )) {
      const uri = this.monaco.Uri.parse(this.getFileUri(file.path))
      const existingModel = this.monaco.editor.getModel(uri)

      if (!existingModel) {
        this.monaco.editor.createModel(file.content, 'rust', uri)
        this.applyDiagnostics(uri.toString())
        continue
      }

      if (existingModel.getValue() !== file.content) {
        existingModel.setValue(file.content)
      }
    }
  }

  syncWorkspace(files: LessonFile[]) {
    this.lastFiles = files

    if (!this.ready || !this.session || this.socket?.readyState !== WebSocket.OPEN) {
      return
    }

    const nextDocuments = new Map<string, { languageId: string; text: string; uri: string }>()

    for (const file of files.filter((item) => isRustSource(item.path))) {
      nextDocuments.set(this.getFileUri(file.path), {
        languageId: 'rust',
        text: file.content,
        uri: this.getFileUri(file.path),
      })
    }

    for (const [uri] of this.openedDocuments) {
      if (nextDocuments.has(uri)) {
        continue
      }

      this.notify('textDocument/didClose', {
        textDocument: { uri },
      })
      this.openedDocuments.delete(uri)
      const saveTimer = this.didSaveTimers.get(uri)
      if (saveTimer) {
        globalThis.clearTimeout(saveTimer)
        this.didSaveTimers.delete(uri)
      }
      this.versions.delete(uri)
      const model = this.monaco.editor.getModel(this.monaco.Uri.parse(uri))
      if (model) {
        this.monaco.editor.setModelMarkers(model, 'rust-learning-lsp', [])
      }
    }

    for (const [uri, document] of nextDocuments) {
      const current = this.openedDocuments.get(uri)

      if (current == null) {
        this.openedDocuments.set(uri, document.text)
        this.versions.set(uri, 1)
        this.notify('textDocument/didOpen', {
          textDocument: {
            languageId: document.languageId,
            text: document.text,
            uri,
            version: 1,
          },
        })
        this.scheduleDidSave(uri)
        continue
      }

      if (current === document.text) {
        continue
      }

      const nextVersion = (this.versions.get(uri) ?? 1) + 1
      this.openedDocuments.set(uri, document.text)
      this.versions.set(uri, nextVersion)
      this.notify('textDocument/didChange', {
        contentChanges: [{ text: document.text }],
        textDocument: {
          uri,
          version: nextVersion,
        },
      })
      this.scheduleDidSave(uri)
    }
  }

  async formatDocument(path: string) {
    if (!this.ready || !isRustSource(path)) {
      return false
    }

    const uri = this.getFileUri(path)
    const model = this.monaco.editor.getModel(this.monaco.Uri.parse(uri))
    if (!model) {
      return false
    }

    const edits = (await this.request('textDocument/formatting', {
      options: {
        insertSpaces: true,
        tabSize: 4,
      },
      textDocument: { uri },
    })) as LspTextEdit[] | null

    if (!edits || edits.length === 0) {
      return true
    }

    model.pushEditOperations(
      [],
      edits.map((edit) => ({
        forceMoveMarkers: true,
        range: toMonacoRange(edit.range),
        text: edit.newText,
      })),
      () => null,
    )

    return true
  }

  private registerProviders() {
    this.providers.push(
      this.monaco.languages.registerCompletionItemProvider('rust', {
        provideCompletionItems: async (model, position) => {
          if (!this.ready) {
            return { suggestions: [] }
          }

          const items = (await this.request('textDocument/completion', {
            textDocument: { uri: model.uri.toString() },
            position: toLspPosition(model, position),
            context: { triggerKind: 1 },
          })) as { items?: LspCompletionItem[] } | LspCompletionItem[] | null

          const list = Array.isArray(items) ? items : items?.items ?? []
          const word = model.getWordUntilPosition(position)
          const range = {
            startColumn: word.startColumn,
            endColumn: word.endColumn,
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
          }

          return {
            suggestions: list.map((item) => ({
              detail: item.detail,
              documentation: item.documentation
                ? typeof item.documentation === 'string'
                  ? item.documentation
                  : item.documentation.value
                : undefined,
              insertText: item.insertText ?? item.label,
              kind: completionKind(this.monaco, item.kind),
              label: item.label,
              range,
            })),
          }
        },
      }),
      this.monaco.languages.registerHoverProvider('rust', {
        provideHover: async (model, position) => {
          if (!this.ready) {
            return null
          }

          const result = (await this.request('textDocument/hover', {
            textDocument: { uri: model.uri.toString() },
            position: toLspPosition(model, position),
          })) as LspHover | null

          const contents = hoverText(result?.contents)
          if (!contents) {
            return null
          }

          return {
            contents: [contents],
            range: result?.range ? toMonacoRange(result.range) : undefined,
          }
        },
      }),
      this.monaco.languages.registerDefinitionProvider('rust', {
        provideDefinition: async (model, position) => {
          if (!this.ready) {
            return null
          }

          const result = (await this.request('textDocument/definition', {
            textDocument: { uri: model.uri.toString() },
            position: toLspPosition(model, position),
          })) as LspLocation | LspLocation[] | null

          const target = Array.isArray(result) ? result[0] : result
          if (!target) {
            return null
          }

          const fromPath = this.getPathForUri(model.uri.toString())
          const toPath = this.getPathForUri(target.uri)
          if (fromPath && toPath) {
            this.onDefinitionNavigation?.({
              from: {
                path: fromPath,
                range: {
                  start: toLspPosition(model, position),
                  end: toLspPosition(model, position),
                },
              },
              to: {
                path: toPath,
                range: target.range,
              },
            })
          }

          const targetModel = this.monaco.editor.getModel(this.monaco.Uri.parse(target.uri))
          if (targetModel && this.editor) {
            this.editor.setModel(targetModel)
          }

          return {
            range: toMonacoRange(target.range),
            uri: this.monaco.Uri.parse(target.uri),
          }
        },
      }),
    )
  }

  private async initialize() {
    if (!this.session) {
      this.onStateChange({ state: 'error', detail: 'Missing lesson workspace session' })
      return
    }

    try {
      this.onStateChange({ state: 'connecting', detail: 'Negotiating rust-analyzer session' })
      await this.request('initialize', {
        capabilities: {
          textDocument: {
            completion: {
              completionItem: {
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
            definition: {},
            hover: {
              contentFormat: ['markdown', 'plaintext'],
            },
            publishDiagnostics: {},
            synchronization: {
              dynamicRegistration: false,
              didSave: true,
              willSave: false,
              willSaveWaitUntil: false,
            },
          },
          workspace: {
            configuration: true,
            workspaceFolders: true,
          },
        },
        clientInfo: {
          name: 'rust-learning-web',
          version: '0.1.0',
        },
        processId: null,
        rootUri: `file://${this.session.rootPath}`,
        workspaceFolders: [
          {
            name: `lesson-${this.lessonSlug}`,
            uri: `file://${this.session.rootPath}`,
          },
        ],
      })

      this.ready = true
      this.notify('initialized', {})
      this.notify('workspace/didChangeConfiguration', {
        settings: {
          'rust-analyzer': {
            cargo: {
              allTargets: false,
            },
            rustfmt: {
              extraArgs: [],
            },
            checkOnSave: true,
          },
        },
      })
      this.syncWorkspace(this.lastFiles)
      this.onStateChange({ state: 'ready', detail: `Workspace ${this.session.sessionId}` })
    } catch (error) {
      this.ready = false
      this.onStateChange({
        state: 'error',
        detail: error instanceof Error ? error.message : 'Failed to initialize LSP session',
      })
    }
  }

  private handleMessage(raw: string) {
    const message = JSON.parse(raw) as JsonRpcMessage

    if ('id' in message && 'method' in message) {
      void this.respondToServerRequest(message)
      return
    }

    if ('id' in message) {
      const pending = this.pending.get(message.id)
      if (!pending) {
        return
      }

      this.pending.delete(message.id)

      if ('error' in message) {
        pending.reject(new Error(message.error.message))
        return
      }

      pending.resolve(message.result)
      return
    }

    if (message.method === 'textDocument/publishDiagnostics') {
      const params = message.params as
        | { diagnostics: LspDiagnostic[]; uri: string }
        | undefined

      if (!params) {
        return
      }

      this.diagnostics.set(params.uri, params.diagnostics)
      this.applyDiagnostics(params.uri)
      this.publishDiagnostics()
    }
  }

  private applyDiagnostics(uri: string) {
    const model = this.monaco.editor.getModel(this.monaco.Uri.parse(uri))
    if (!model) {
      return
    }

    const diagnostics = this.diagnostics.get(uri) ?? []

    this.monaco.editor.setModelMarkers(
      model,
      'rust-learning-lsp',
      diagnostics.map((diagnostic) => ({
        endColumn: diagnostic.range.end.character + 1,
        endLineNumber: diagnostic.range.end.line + 1,
        message: diagnostic.message,
        severity: toMarkerSeverity(this.monaco, diagnostic.severity),
        startColumn: diagnostic.range.start.character + 1,
        startLineNumber: diagnostic.range.start.line + 1,
      })),
    )
  }

  private publishDiagnostics() {
    const diagnostics: LessonDiagnostic[] = []

    for (const [uri, items] of this.diagnostics) {
      const path = this.getPathForUri(uri)
      if (!path || !isRustSource(path)) {
        continue
      }

      for (const item of items) {
        diagnostics.push({
          message: item.message,
          path,
          range: item.range,
          severity: item.severity,
        })
      }
    }

    this.onDiagnosticsChange(diagnostics)
  }

  private async respondToServerRequest(message: JsonRpcRequest) {
    switch (message.method) {
      case 'workspace/configuration': {
        const items =
          ((message.params as { items?: unknown[] } | undefined)?.items ?? []).map(() => ({
            cargo: {
              allTargets: false,
            },
            rustfmt: {
              extraArgs: [],
            },
            checkOnSave: true,
          }))

        this.send({
          id: message.id,
          jsonrpc: '2.0',
          result: items,
        })
        return
      }
      case 'window/workDoneProgress/create':
      case 'client/registerCapability':
      case 'client/unregisterCapability':
        this.send({
          id: message.id,
          jsonrpc: '2.0',
          result: null,
        })
        return
      default:
        if (message.method === 'window/showMessage') {
          const detail =
            (message.params as { message?: string } | undefined)?.message ?? 'LSP notification'
          this.onStateChange({ state: this.ready ? 'ready' : 'connecting', detail })
        }
        this.send({
          id: message.id,
          jsonrpc: '2.0',
          result: null,
        })
      }
  }

  private notify(method: string, params: unknown) {
    this.send({
      jsonrpc: '2.0',
      method,
      params,
    })
  }

  private scheduleDidSave(uri: string) {
    const existingTimer = this.didSaveTimers.get(uri)
    if (existingTimer) {
      globalThis.clearTimeout(existingTimer)
    }

    const timer = globalThis.setTimeout(() => {
      this.didSaveTimers.delete(uri)
      this.notify('textDocument/didSave', {
        textDocument: { uri },
      })
    }, 500)

    this.didSaveTimers.set(uri, timer)
  }

  private request(method: string, params: unknown) {
    const id = this.requestId
    this.requestId += 1

    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.send({
        id,
        jsonrpc: '2.0',
        method,
        params,
      })
    })
  }

  private send(message: JsonRpcMessage) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return
    }

    this.socket.send(JSON.stringify(message))
  }
}
