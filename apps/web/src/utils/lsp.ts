import type { LessonFile } from '@rust-learning/shared-types'
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

type LspWorkspaceDocument = {
  languageId: string
  text: string
  uri: string
}

export type LspConnectionState = 'connecting' | 'ready' | 'offline' | 'error'

function getLspSocketUrl() {
  const base = new URL(LSP_URL)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  if (!base.pathname.endsWith('/lsp/ws')) {
    base.pathname = `${base.pathname.replace(/\/$/, '')}/lsp/ws`
  }
  return base.toString()
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function lessonRootUri(lessonSlug: string) {
  return `file:///rust-learning-lessons/${encodeURIComponent(lessonSlug)}`
}

export function workspaceFileUri(lessonSlug: string, path: string) {
  return `${lessonRootUri(lessonSlug)}/${encodePath(path)}`
}

function cargoTomlForLesson(lessonSlug: string, files: LessonFile[]) {
  const crateName = lessonSlug.replace(/[^a-zA-Z0-9_]+/g, "_")
  const hasBin = files.some((file) => file.path === 'src/main.rs')
  const hasLib = files.some((file) => file.path === 'src/lib.rs')
  const parts = [
    '[package]',
    `name = "${crateName}"`,
    'version = "0.1.0"',
    'edition = "2024"',
    '',
  ]

  if (hasBin && !hasLib) {
    parts.push('[[bin]]', `name = "${crateName}"`, 'path = "src/main.rs"', '')
  }

  if (hasLib) {
    parts.push('[lib]', 'path = "src/lib.rs"', '')
  }

  return parts.join('\n')
}

function buildWorkspaceDocuments(lessonSlug: string, files: LessonFile[]) {
  const documents = new Map<string, LspWorkspaceDocument>()

  documents.set(workspaceFileUri(lessonSlug, 'Cargo.toml'), {
    uri: workspaceFileUri(lessonSlug, 'Cargo.toml'),
    languageId: 'toml',
    text: cargoTomlForLesson(lessonSlug, files),
  })

  for (const file of files) {
    documents.set(workspaceFileUri(lessonSlug, file.path), {
      uri: workspaceFileUri(lessonSlug, file.path),
      languageId: file.path.endsWith('.toml') ? 'toml' : 'rust',
      text: file.content,
    })
  }

  return documents
}

function toLspPosition(model: Monaco.editor.ITextModel, position: Monaco.Position): LspPosition {
  const offset = model.getOffsetAt(position)
  const value = model.getValue()
  let line = 0
  let character = 0

  for (let index = 0; index < offset; index += 1) {
    const code = value.charCodeAt(index)

    if (code === 10) {
      line += 1
      character = 0
      continue
    }

    character += code > 0xffff ? 2 : 1
  }

  return { line, character }
}

function toMonacoRange(monaco: typeof Monaco, range: LspRange): Monaco.IRange {
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

export class RustLspClient {
  private diagnostics = new Map<string, LspDiagnostic[]>()
  private lastFiles: LessonFile[] = []
  private openedDocuments = new Map<string, string>()
  private pending = new Map<JsonRpcId, { reject: (error: Error) => void; resolve: (value: unknown) => void }>()
  private providers: Monaco.IDisposable[] = []
  private requestId = 1
  private socket: WebSocket | null = null
  private versions = new Map<string, number>()
  private ready = false

  constructor(
    private readonly lessonSlug: string,
    private readonly monaco: typeof Monaco,
    private readonly onStateChange: (state: LspConnectionState) => void,
  ) {}

  connect() {
    this.onStateChange('connecting')
    this.socket = new WebSocket(getLspSocketUrl())
    this.socket.addEventListener('open', () => {
      void this.initialize()
    })
    this.socket.addEventListener('message', (event) => {
      this.handleMessage(String(event.data))
    })
    this.socket.addEventListener('close', () => {
      this.ready = false
      this.onStateChange('offline')
    })
    this.socket.addEventListener('error', () => {
      this.ready = false
      this.onStateChange('error')
    })

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
            range: result?.range ? toMonacoRange(this.monaco, result.range) : undefined,
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

          return {
            range: toMonacoRange(this.monaco, target.range),
            uri: this.monaco.Uri.parse(target.uri),
          }
        },
      }),
    )
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
    this.versions.clear()
    this.ready = false
    this.socket?.close()
    this.socket = null
  }

  ensureModels(files: LessonFile[]) {
    for (const file of files.filter((item) => item.editable !== false)) {
      const uri = this.monaco.Uri.parse(workspaceFileUri(this.lessonSlug, file.path))
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

    if (!this.ready || this.socket?.readyState !== WebSocket.OPEN) {
      return
    }

    const nextDocuments = buildWorkspaceDocuments(this.lessonSlug, files)

    for (const [uri] of this.openedDocuments) {
      if (nextDocuments.has(uri)) {
        continue
      }

      this.notify('textDocument/didClose', {
        textDocument: { uri },
      })
      this.openedDocuments.delete(uri)
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
    }
  }

  private async initialize() {
    try {
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
              didSave: false,
              dynamicRegistration: false,
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
        rootUri: lessonRootUri(this.lessonSlug),
        workspaceFolders: [
          {
            name: `lesson-${this.lessonSlug}`,
            uri: lessonRootUri(this.lessonSlug),
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
            checkOnSave: false,
          },
        },
      })
      this.syncWorkspace(this.lastFiles)
      this.onStateChange('ready')
    } catch {
      this.ready = false
      this.onStateChange('error')
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

  private async respondToServerRequest(message: JsonRpcRequest) {
    switch (message.method) {
      case 'workspace/configuration': {
        const items =
          ((message.params as { items?: unknown[] } | undefined)?.items ?? []).map(() => ({
            cargo: {
              allTargets: false,
            },
            checkOnSave: false,
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
