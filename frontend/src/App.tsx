import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import {
  createConnection,
  deleteConnection,
  listConnections,
  runSqlQuery,
  testConnection,
  updateConnection,
  type ConnectionDTO,
  type LoginResponse,
  type SqlQueryResult,
} from './api/client'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SplitButton from './components/SplitButton'
import convertToCsv from 'json-2-csv';
import { dump as dumpYaml } from 'js-yaml';

type Page = 'sql' | 'settings'
type AuthMode = 'login' | 'signup'
type TestResult = { ok: boolean; message: string }

const defaultQuery = 'SELECT version();'

function App() {
  const [authState, setAuthState] = useState<LoginResponse | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [activePage, setActivePage] = useState<Page>('sql')
  const [connections, setConnections] = useState<ConnectionDTO[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [connectionsError, setConnectionsError] = useState<string | null>(null)

  const [formState, setFormState] = useState({ name: '', connection_string: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formTesting, setFormTesting] = useState(false)
  const [formTestResult, setFormTestResult] = useState<TestResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingConnectionId, setEditingConnectionId] = useState<number | null>(null)
  const [editFormState, setEditFormState] = useState({ name: '', connection_string: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editTesting, setEditTesting] = useState(false)
  const [editTestResult, setEditTestResult] = useState<TestResult | null>(null)

  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null)
  const [connectionMenuOpen, setConnectionMenuOpen] = useState(false)
  const connectionPickerRef = useRef<HTMLDivElement | null>(null)

  const [queryText, setQueryText] = useState(defaultQuery)
  const [queryRunning, setQueryRunning] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null)
  const [logoutInProgress, setLogoutInProgress] = useState(false)

  const refreshConnections = useCallback(async () => {
    setConnectionsLoading(true)
    setConnectionsError(null)
    try {
      const data = await listConnections()
      setConnections(data)
      setSelectedConnectionId((prev) => {
        if (prev && data.some((connection) => connection.id === prev)) {
          return prev
        }
        return data[0]?.id ?? null
      })
    } catch (error) {
      setConnectionsError(getErrorMessage(error) ?? 'Failed to load connections.')
    } finally {
      setConnectionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authState) {
      setConnections([])
      setSelectedConnectionId(null)
      return
    }
    refreshConnections()
  }, [refreshConnections, authState])

  useEffect(() => {
    if (!connectionMenuOpen) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (
        connectionPickerRef.current &&
        event.target instanceof Node &&
        !connectionPickerRef.current.contains(event.target)
      ) {
        setConnectionMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [connectionMenuOpen])

  useEffect(() => {
    if (!connections.length) {
      setConnectionMenuOpen(false)
    }
    if (editingConnectionId && !connections.some((connection) => connection.id === editingConnectionId)) {
      setEditingConnectionId(null)
      setEditFormState({ name: '', connection_string: '' })
      setEditTestResult(null)
    }
  }, [connections, editingConnectionId])

  const handleSubmitConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.name.trim() || !formState.connection_string.trim()) {
      setFormError('Both name and connection string are required.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)
    setFormTestResult(null)
    try {
      const created = await createConnection({
        name: formState.name.trim(),
        connection_string: formState.connection_string.trim(),
      })
      setConnections((prev) => [created, ...prev.filter((connection) => connection.id !== created.id)])
      setSelectedConnectionId(created.id)
      setFormState({ name: '', connection_string: '' })
      setConnectionsError(null)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteConnection = async (id: number) => {
    if (!window.confirm('Delete this connection? This action cannot be undone.')) {
      return
    }

    try {
      await deleteConnection(id)
      setConnections((prev) => {
        const updated = prev.filter((connection) => connection.id !== id)
        setSelectedConnectionId((prevSelected) => {
          if (prevSelected === id) {
            return updated[0]?.id ?? null
          }
          return prevSelected
        })
        return updated
      })
      if (editingConnectionId === id) {
        setEditingConnectionId(null)
        setEditFormState({ name: '', connection_string: '' })
        setEditTestResult(null)
      }
      setConnectionsError(null)
    } catch (error) {
      alert(getErrorMessage(error))
    }
  }

  const downloadCsv = async (queryResult: { rows: Record<string, unknown>[] }) => {
    const csv = await convertToCsv.json2csvAsync(queryResult.rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const downloadJson = async (queryResult: { rows: Record<string, unknown>[] }) => {
    const json = JSON.stringify(queryResult.rows)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const downloadYaml = async (queryResult: { rows: Record<string, unknown>[] }) => {
    const yaml = dumpYaml(queryResult.rows)
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleDownloadResult = async (value: string | undefined) => {
    if (!queryResult) {
      return
    }
    if (!value || value === 'csv') {
      return downloadCsv(queryResult)
    }
    if (value === 'json') {
      return downloadJson(queryResult)
    }
    if (value === 'yaml') {
      return downloadYaml(queryResult)
    }
  }

  const handleRunQuery = async () => {
    if (!selectedConnectionId) {
      setQueryError('Select a connection before running a query.')
      return
    }
    if (!queryText.trim()) {
      setQueryError('Enter a SQL statement to execute.')
      return
    }

    setQueryRunning(true)
    setQueryError(null)
    setQueryResult(null)
    try {
      const result = await runSqlQuery({
        connection_id: selectedConnectionId,
        query: queryText,
      })
      setQueryResult(result)
    } catch (error) {
      setQueryError(getErrorMessage(error))
    } finally {
      setQueryRunning(false)
    }
  }

  const handleSqlKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!event.key || event.key.toLowerCase() !== 'enter') {
      return
    }
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      handleRunQuery()
    }
  }

  const handleSelectConnection = (id: number | null) => {
    setSelectedConnectionId(id)
    setConnectionMenuOpen(false)
  }

  const handleTestNewConnection = async () => {
    const connectionString = formState.connection_string.trim()
    if (!connectionString) {
      setFormTestResult({ ok: false, message: 'Enter a connection string to test.' })
      return
    }
    setFormTesting(true)
    setFormTestResult(null)
    try {
      const result = await testConnection(connectionString)
      setFormTestResult(result)
    } catch (error) {
      setFormTestResult({ ok: false, message: getErrorMessage(error) })
    } finally {
      setFormTesting(false)
    }
  }

  const handleStartEdit = (connection: ConnectionDTO) => {
    setEditingConnectionId(connection.id)
    setEditFormState({
      name: connection.name,
      connection_string: connection.connection_string,
    })
    setEditError(null)
    setEditTestResult(null)
  }

  const handleCancelEdit = () => {
    setEditingConnectionId(null)
    setEditFormState({ name: '', connection_string: '' })
    setEditError(null)
    setEditTestResult(null)
  }

  const handleTestExistingConnection = async () => {
    const connectionString = editFormState.connection_string.trim()
    if (!connectionString) {
      setEditTestResult({ ok: false, message: 'Enter a connection string to test.' })
      return
    }
    setEditTesting(true)
    setEditTestResult(null)
    try {
      const result = await testConnection(connectionString)
      setEditTestResult(result)
    } catch (error) {
      setEditTestResult({ ok: false, message: getErrorMessage(error) })
    } finally {
      setEditTesting(false)
    }
  }

  const handleUpdateConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingConnectionId) {
      return
    }
    if (!editFormState.name.trim() || !editFormState.connection_string.trim()) {
      setEditError('Both name and connection string are required.')
      return
    }

    setEditSubmitting(true)
    setEditError(null)
    try {
      const updated = await updateConnection(editingConnectionId, {
        name: editFormState.name.trim(),
        connection_string: editFormState.connection_string.trim(),
      })
      setConnections((prev) => prev.map((conn) => (conn.id === updated.id ? updated : conn)))
      if (selectedConnectionId === updated.id) {
        setSelectedConnectionId(updated.id)
      }
      setEditTestResult(null)
      handleCancelEdit()
    } catch (error) {
      setEditError(getErrorMessage(error))
    } finally {
      setEditSubmitting(false)
    }
  }

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId],
  )

  const handleLogout = () => {
    if (logoutInProgress) {
      return
    }
    setLogoutInProgress(true)
    setAuthState(null)
    setAuthMode('login')
    setActivePage('sql')
    setConnections([])
    setConnectionsError(null)
    setConnectionMenuOpen(false)
    setSelectedConnectionId(null)
    setQueryText(defaultQuery)
    setQueryResult(null)
    setQueryError(null)
    setFormState({ name: '', connection_string: '' })
    setFormTestResult(null)
    setFormError(null)
    setEditingConnectionId(null)
    setEditFormState({ name: '', connection_string: '' })
    setEditError(null)
    setEditTestResult(null)
    setEditSubmitting(false)
    setEditTesting(false)
    setFormSubmitting(false)
    setFormTesting(false)
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    setLogoutInProgress(false)
  }

  const renderAuthGate = () => (
    <div className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Simple Web App</p>
        <h1>Query your data securely.</h1>
        <p className="muted">
          Sign in to manage PostgreSQL connections, execute SQL statements, and inspect results without leaving your
          browser.
        </p>
        <ul>
          <li>Reusable, tested Postgres connection profiles</li>
          <li>Ad-hoc SQL console with keyboard shortcuts</li>
          <li>FastAPI backend with hashed credentials</li>
        </ul>
      </section>

      <section className="auth-panel">
        <header>
          <h2>{authMode === 'login' ? 'Sign in to continue' : 'Create your account'}</h2>
          <p>
            {authMode === 'login'
              ? 'Enter your credentials to access the SQL workspace.'
              : 'Fill out your details to get instant access.'}
          </p>
        </header>

        <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            aria-pressed={authMode === 'login'}
            onClick={() => setAuthMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === 'signup' ? 'active' : ''}
            aria-pressed={authMode === 'signup'}
            onClick={() => setAuthMode('signup')}
          >
            Create account
          </button>
        </div>

        {authMode === 'login' ? (
          <LoginForm
            onSuccess={(payload) => {
              setAuthState(payload)
            }}
            onSwitchMode={() => setAuthMode('signup')}
          />
        ) : (
          <RegisterForm
            onSuccess={(payload) => {
              setAuthState(payload)
            }}
            onSwitchMode={() => setAuthMode('login')}
          />
        )}
      </section>
    </div>
  )

  const renderSqlConsole = () => (
    <div className="panel sql-console">
      <header>
        <div>
          <p className="eyebrow">SQL Console</p>
        </div>
        <button className="ghost-button" type="button" onClick={refreshConnections}>
          Refresh connections
        </button>
      </header>

      <div className="console-body">
        <div className="control-row">
          <label htmlFor="connection-picker-trigger">Connection</label>
          <div className="connection-picker" ref={connectionPickerRef}>
            <button
              type="button"
              className="picker-trigger"
              id="connection-picker-trigger"
              onClick={() => setConnectionMenuOpen((prev) => !prev)}
              disabled={!connections.length || connectionsLoading}
              aria-haspopup="listbox"
              aria-expanded={connectionMenuOpen}
            >
              <span>{activeConnection?.name ?? 'Select a connection'}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {connectionMenuOpen && (
              <div className="picker-dropdown" role="listbox">
                {connections.length === 0 ? (
                  <p className="muted small">No connections available.</p>
                ) : (
                  <ul>
                    {connections.map((connection) => (
                      <li key={connection.id}>
                        <button
                          type="button"
                          className={connection.id === selectedConnectionId ? 'active' : ''}
                          onClick={() => handleSelectConnection(connection.id)}
                        >
                          <strong>{connection.name}</strong>
                          <span>{connection.connection_string}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        {connectionsError && <p className="form-error">{connectionsError}</p>}
        <label htmlFor="sql-input">SQL</label>
        <textarea
          id="sql-input"
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          onKeyDown={handleSqlKeyDown}
          spellCheck={false}
          placeholder="Enter SQL..."
        />
        <div className="actions">
          <button type="button" onClick={handleRunQuery} disabled={queryRunning}>
            {queryRunning ? 'Running...' : 'Run query'}
          </button>
        </div>
        {queryError && <p className="form-error">{queryError}</p>}
        {queryResult && (
          <div className="results-card">
            <div className="results-meta">
              <p>
                Using connection:{' '}
                <strong>{activeConnection?.name ?? 'Unknown connection'}</strong>
              </p>
              <p>
                Rows: <strong>{queryResult.row_count}</strong>
              </p>
            </div>
            {queryResult.columns.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {queryResult.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.length === 0 ? (
                      <tr>
                        <td colSpan={queryResult.columns.length}>No rows returned.</td>
                      </tr>
                    ) : (
                      queryResult.rows.map((row, rowIndex) => (
                        <tr key={`${rowIndex}-${activeConnection?.id ?? 'row'}`}>
                          {queryResult.columns.map((column) => (
                            <td key={`${rowIndex}-${column}`}>{formatCellValue(row[column])}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                {queryResult.message ?? 'Statement executed successfully, no result set.'}
              </p>
            )}
          </div>
        )}

      </div>
      <div className="actions">
        {queryResult && queryResult.row_count > 0 && (
          <SplitButton
            label="Download CSV"
            onClick={handleDownloadResult}
            disabled={queryResult && queryResult.row_count > 0 ? false : true}
            defaultValue="csv"
            options={[
              { label: 'Download as CSV', value: 'csv' },
              { label: 'Download as JSON', value: 'json' },
              { label: 'Download as Yaml', value: 'yaml' },
            ]}
          />
        )}
      </div>
    </div >
  )

  const renderSettings = () => (
    <div className="panel settings-panel">
      <header>
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Manage PostgreSQL connections for your workspace</h2>
        </div>
      </header>

      <div className="settings-body">
        <form className="new-connection" onSubmit={handleSubmitConnection}>
          <div className="form-group">
            <label htmlFor="connection-name">Connection name</label>
            <input
              id="connection-name"
              value={formState.name}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, name: event.target.value }))
                setFormError(null)
              }}
              placeholder="Analytics database"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="connection-string">PostgreSQL connection string</label>
            <input
              id="connection-string"
              value={formState.connection_string}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, connection_string: event.target.value }))
                setFormError(null)
                setFormTestResult(null)
              }}
              placeholder="postgresql://user:password@host:5432/database"
              required
            />
            <p className="field-hint">Use the standard libpq connection URI format.</p>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          {formTestResult && (
            <p className={`test-status ${formTestResult.ok ? 'success' : 'error'}`}>
              {formTestResult.message}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={handleTestNewConnection}
              disabled={formTesting}
            >
              {formTesting ? 'Testing...' : 'Test connection'}
            </button>
            <button type="submit" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save connection'}
            </button>
          </div>
        </form>

        {editingConnectionId && (
          <form className="edit-connection" onSubmit={handleUpdateConnection}>
            <h3>Edit connection</h3>
            <div className="form-group">
              <label htmlFor="edit-connection-name">Connection name</label>
              <input
                id="edit-connection-name"
                value={editFormState.name}
                onChange={(event) => {
                  setEditFormState((prev) => ({ ...prev, name: event.target.value }))
                  setEditError(null)
                }}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-connection-string">PostgreSQL connection string</label>
              <input
                id="edit-connection-string"
                value={editFormState.connection_string}
                onChange={(event) => {
                  setEditFormState((prev) => ({ ...prev, connection_string: event.target.value }))
                  setEditError(null)
                  setEditTestResult(null)
                }}
                required
              />
            </div>
            {editError && <p className="form-error">{editError}</p>}
            {editTestResult && (
              <p className={`test-status ${editTestResult.ok ? 'success' : 'error'}`}>
                {editTestResult.message}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleTestExistingConnection}
                disabled={editTesting}
              >
                {editTesting ? 'Testing...' : 'Test connection'}
              </button>
              <div className="edit-actions">
                <button type="button" className="ghost-button" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        )}

        <section className="connection-list">
          <header>
            <h3>Saved connections</h3>
            {connectionsLoading && <span className="muted">Loading...</span>}
          </header>
          {connectionsError && <p className="form-error">{connectionsError}</p>}
          {connections.length === 0 ? (
            <p className="muted">No connections yet. Add one above to get started.</p>
          ) : (
            <ul>
              {connections.map((connection) => (
                <li key={connection.id}>
                  <div>
                    <strong>{connection.name}</strong>
                    <span>{connection.connection_string}</span>
                    <small>Added {new Date(connection.created_at).toLocaleString()}</small>
                  </div>
                  <div className="connection-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleStartEdit(connection)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button destructive"
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )

  if (!authState) {
    return renderAuthGate()
  }

  return (
    <div className="dashboard-shell">
      <header className="app-header">
        <nav className="page-tabs" aria-label="Primary navigation">
          <button
            type="button"
            className={activePage === 'sql' ? 'active' : ''}
            onClick={() => setActivePage('sql')}
          >
            SQL Console
          </button>
          <button
            type="button"
            className={activePage === 'settings' ? 'active' : ''}
            onClick={() => setActivePage('settings')}
          >
            Settings
          </button>
        </nav>
        <button
          type="button"
          className="ghost-button logout-button"
          onClick={handleLogout}
          disabled={logoutInProgress}
        >
          {logoutInProgress ? 'Signing out...' : 'Log out'}
        </button>
      </header>

      <main>{activePage === 'sql' ? renderSqlConsole() : renderSettings()}</main>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

type ErrorWithResponse = {
  response?: {
    data?: { detail?: unknown }
  }
  message?: string
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const withResponse = error as ErrorWithResponse
    const detail = withResponse.response?.data?.detail
    if (detail) {
      return String(detail)
    }
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default App
