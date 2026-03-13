'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// Types
interface Question {
  id: number
  chapter: string
  topic: string
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE: string | null
  answer: string
  answerText: string
  explanation: string
  keyPoints: string
  imageUrl: string | null
}

interface ProgressData {
  questionId: number
  userAnswer: string | null
  isCorrect: boolean | null
  isStarred: boolean
  note: string | null
}

// Helper to safely parse keyPoints
function parseKeyPoints(keyPoints: string): string[] {
  try {
    const parsed = JSON.parse(keyPoints)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // If not valid JSON, try splitting by newlines or return as single item
    if (keyPoints.includes('\n')) {
      return keyPoints.split('\n').filter(k => k.trim())
    }
    return keyPoints ? [keyPoints] : []
  }
}

// Lock Screen Component
function LockScreen({ onUnlock }: { onUnlock: (token: string, daysRemaining: number) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.token) {
        onUnlock(data.token, data.daysRemaining || 7)
      } else {
        setError(data.error || 'Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <CardTitle className="text-2xl font-bold">Gastro MCQ Bank</CardTitle>
          <CardDescription>Licensed Copy - Enter password to access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center text-lg"
              autoFocus
              disabled={loading}
            />
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
              disabled={loading || !password}
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </Button>
            {error && (
              <p className="text-red-500 text-center text-sm font-medium">
                {error}
              </p>
            )}
          </form>
          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-center text-yellow-800 dark:text-yellow-200">
              ⚠️ Time-limited access. Sharing is prohibited and will result in immediate revocation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Quiz Component
function QuizApp({ token, daysRemaining, onLogout }: { token: string; daysRemaining: number; onLogout: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [progress, setProgress] = useState<Map<number, ProgressData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'quiz' | 'review' | 'bookmarks' | 'stats'>('quiz')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Fetch questions and progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, pRes] = await Promise.all([
          fetch('/api/questions', { headers: { 'x-session-token': token } }),
          fetch('/api/progress', { headers: { 'x-session-token': token } })
        ])

        // Handle unauthorized (session revoked or expired)
        if (qRes.status === 401 || pRes.status === 401) {
          toast.error('Your session has been revoked or expired')
          onLogout()
          return
        }

        if (qRes.ok) {
          const qData = await qRes.json()
          setQuestions(qData.questions || [])
        }

        if (pRes.ok) {
          const pData = await pRes.json()
          const pMap = new Map<number, ProgressData>()
          ;(pData.progress || []).forEach((p: ProgressData) => {
            pMap.set(p.questionId, p)
          })
          setProgress(pMap)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load questions. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, onLogout])

  const currentQuestion = questions[currentIndex]

  const saveAnswer = useCallback(async (questionId: number, answer: string, isCorrect: boolean) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': token 
        },
        body: JSON.stringify({
          questionId,
          userAnswer: answer,
          isCorrect
        })
      })

      setProgress(prev => {
        const next = new Map(prev)
        next.set(questionId, {
          questionId,
          userAnswer: answer,
          isCorrect,
          isStarred: prev.get(questionId)?.isStarred || false,
          note: prev.get(questionId)?.note || null
        })
        return next
      })
    } catch (error) {
      console.error('Failed to save answer:', error)
    }
  }, [token])

  const toggleStar = useCallback(async (questionId: number) => {
    try {
      const current = progress.get(questionId)
      const newStarred = !current?.isStarred

      await fetch('/api/progress', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': token 
        },
        body: JSON.stringify({
          questionId,
          isStarred: newStarred
        })
      })

      setProgress(prev => {
        const next = new Map(prev)
        const existing = next.get(questionId) || {
          questionId,
          userAnswer: null,
          isCorrect: null,
          isStarred: false,
          note: null
        }
        next.set(questionId, { ...existing, isStarred: newStarred })
        return next
      })

      toast.success(newStarred ? 'Added to bookmarks' : 'Removed from bookmarks')
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }, [progress, token])

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return
    setSelectedAnswer(answer)
  }

  const handleSubmit = () => {
    if (!selectedAnswer || !currentQuestion) return

    const isCorrect = selectedAnswer === currentQuestion.answer
    saveAnswer(currentQuestion.id, selectedAnswer, isCorrect)
    setShowAnswer(true)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowAnswer(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedAnswer(null)
      setShowAnswer(false)
    }
  }

  // Stats calculation
  const stats = {
    total: progress.size,
    correct: Array.from(progress.values()).filter(p => p.isCorrect).length,
    wrong: Array.from(progress.values()).filter(p => p.isCorrect === false).length,
    starred: Array.from(progress.values()).filter(p => p.isStarred).length
  }

  // Get chapters
  const chapters = [...new Set(questions.map(q => q.chapter))]

  // Toggle theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Gastro MCQ Bank</h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="text-white hover:bg-white/20"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Badge variant="secondary" className="bg-white/20">
              {stats.total}/{questions.length}
            </Badge>
            <Badge variant="outline" className="border-white/40 text-white">
              {daysRemaining} days left
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="text-white hover:bg-white/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {view === 'quiz' && currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Question Navigation */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} / {questions.length}
                  </span>
                </div>
                <Progress value={(currentIndex + 1) / questions.length * 100} />
              </CardContent>
            </Card>

            {/* Question Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{currentQuestion.chapter}</Badge>
                    <Badge variant="secondary">{currentQuestion.topic}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStar(currentQuestion.id)}
                    className={progress.get(currentQuestion.id)?.isStarred ? 'text-yellow-500' : ''}
                  >
                    {progress.get(currentQuestion.id)?.isStarred ? '⭐' : '☆'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-lg font-medium mb-6">{currentQuestion.question}</p>

                {/* Image if exists */}
                {currentQuestion.imageUrl && (
                  <div className="mb-6">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question image"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => {
                    const option = currentQuestion[`option${letter}` as keyof Question]
                    if (!option) return null

                    const isSelected = selectedAnswer === letter
                    const isCorrect = showAnswer && letter === currentQuestion.answer
                    const isWrong = showAnswer && isSelected && letter !== currentQuestion.answer

                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswerSelect(letter)}
                        disabled={showAnswer}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : isWrong
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className="font-bold mr-2">{letter}.</span>
                        {option}
                      </button>
                    )
                  })}
                </div>

                {/* Submit / Next Button */}
                {!showAnswer ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <div className="mt-6 space-y-4">
                    {/* Answer & Explanation */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="font-bold text-green-700 dark:text-green-400">
                        ✓ Correct Answer: {currentQuestion.answer}. {currentQuestion.answerText}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-medium mb-2">Explanation:</p>
                      <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                    </div>

                    {/* Key Points */}
                    {currentQuestion.keyPoints && parseKeyPoints(currentQuestion.keyPoints).length > 0 && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="font-medium mb-2">💡 Key Points:</p>
                        <ul className="text-sm space-y-1">
                          {parseKeyPoints(currentQuestion.keyPoints).map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex gap-4">
              <Button 
                onClick={handlePrev} 
                disabled={currentIndex === 0}
                variant="outline"
                className="flex-1"
              >
                ← Previous
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={currentIndex === questions.length - 1}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">📊 Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Answered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.correct}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-red-600">{stats.wrong}</p>
                  <p className="text-sm text-muted-foreground">Wrong</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{stats.starred}</p>
                  <p className="text-sm text-muted-foreground">Bookmarked</p>
                </CardContent>
              </Card>
            </div>

            {/* Chapter Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progress by Chapter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chapters.map(chapter => {
                    const chapterQuestions = questions.filter(q => q.chapter === chapter)
                    const answered = chapterQuestions.filter(q => progress.has(q.id)).length
                    const correct = chapterQuestions.filter(q => progress.get(q.id)?.isCorrect).length
                    
                    return (
                      <div key={chapter}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{chapter}</span>
                          <span>{answered}/{chapterQuestions.length} ({correct} correct)</span>
                        </div>
                        <Progress value={answered / chapterQuestions.length * 100} />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bookmarks View */}
        {view === 'bookmarks' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">⭐ Bookmarked Questions</h2>
            {stats.starred === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-4xl mb-4">☆</p>
                  <p>No bookmarked questions yet</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-3">
                  {questions
                    .filter(q => progress.get(q.id)?.isStarred)
                    .map(q => (
                      <Card 
                        key={q.id} 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setCurrentIndex(questions.findIndex(x => x.id === q.id))
                          setView('quiz')
                          setSelectedAnswer(null)
                          setShowAnswer(false)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className="mb-2">{q.chapter}</Badge>
                              <p className="text-sm line-clamp-2">{q.question}</p>
                            </div>
                            <span className="text-yellow-500">⭐</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Review View */}
        {view === 'review' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">📖 Review by Chapter</h2>
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-4">
                {chapters.map(chapter => {
                  const chapterQuestions = questions.filter(q => q.chapter === chapter)
                  const answered = chapterQuestions.filter(q => progress.has(q.id)).length
                  const correct = chapterQuestions.filter(q => progress.get(q.id)?.isCorrect).length
                  const accuracy = answered > 0 ? Math.round(correct / answered * 100) : 0

                  return (
                    <Card key={chapter}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{chapter}</h3>
                            <p className="text-sm text-muted-foreground">
                              {chapterQuestions.length} questions • {accuracy}% accuracy
                            </p>
                          </div>
                          <Progress 
                            value={answered / chapterQuestions.length * 100} 
                            className="w-24"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg">
        <div className="container mx-auto flex justify-around py-2">
          {[
            { id: 'quiz', icon: '📝', label: 'Quiz' },
            { id: 'review', icon: '📖', label: 'Review' },
            { id: 'bookmarks', icon: '⭐', label: 'Stars' },
            { id: 'stats', icon: '📊', label: 'Stats' },
          ].map(item => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setView(item.id as typeof view)}
              className={`flex-col ${view === item.id ? 'text-blue-600' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// Admin Panel Component
function AdminPanel({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessData, setAccessData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAdminLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, isAdmin: true })
      })
      
      const data = await res.json()
      
      if (res.ok && data.isAdmin) {
        setIsAuthenticated(true)
        fetchAccessData()
      } else {
        toast.error('Invalid admin password')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessData = async () => {
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-secret': password }
      })
      if (res.ok) {
        const data = await res.json()
        setAccessData(data)
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    }
  }

  const toggleAccess = async (isEnabled: boolean) => {
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': password
        },
        body: JSON.stringify({ isEnabled })
      })
      fetchAccessData()
      toast.success(isEnabled ? 'Access enabled' : 'Access disabled')
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const revokeAllSessions = async () => {
    try {
      await fetch('/api/admin?all=true', {
        method: 'DELETE',
        headers: { 'x-admin-secret': password }
      })
      fetchAccessData()
      toast.success('All sessions revoked')
    } catch (error) {
      toast.error('Failed to revoke sessions')
    }
  }

  const resetExpiration = async () => {
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': password
        },
        body: JSON.stringify({ resetExpiration: true })
      })
      fetchAccessData()
      toast.success('Expiration reset to 7 days from now')
    } catch (error) {
      toast.error('Failed to reset expiration')
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      await fetch(`/api/admin?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': password }
      })
      fetchAccessData()
      toast.success('Session revoked')
    } catch (error) {
      toast.error('Failed to revoke session')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🔐 Admin Panel</CardTitle>
            <CardDescription>Enter admin password to access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <div className="flex gap-2">
              <Button onClick={handleAdminLogin} className="flex-1" disabled={loading}>
                {loading ? 'Verifying...' : 'Login'}
              </Button>
              <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🛡️ Admin Dashboard</h1>
          <Button variant="outline" onClick={onBack}>← Back to App</Button>
        </div>

        {/* Access Control */}
        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Access Status</p>
                <p className={`text-sm ${accessData?.accessControl?.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {accessData?.accessControl?.isEnabled ? '✅ Enabled' : '❌ Disabled'}
                </p>
              </div>
              <Button
                variant={accessData?.accessControl?.isEnabled ? 'destructive' : 'default'}
                onClick={() => toggleAccess(!accessData?.accessControl?.isEnabled)}
              >
                {accessData?.accessControl?.isEnabled ? 'Disable Access' : 'Enable Access'}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Time Remaining</p>
                <p className="text-sm text-muted-foreground">
                  {accessData?.accessControl?.daysRemaining ?? 'Not started'} days
                </p>
              </div>
              <Button variant="outline" onClick={resetExpiration}>
                Reset Timer (7 days)
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active Sessions</p>
                <p className="text-sm text-muted-foreground">
                  {accessData?.activeSessionsCount || 0} active / {accessData?.sessionsCount || 0} total
                </p>
              </div>
              <Button variant="destructive" onClick={revokeAllSessions}>
                Revoke All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{accessData?.questionsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{accessData?.activeSessionsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{accessData?.sessionsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {accessData?.sessions?.length === 0 ? (
                <p className="text-center text-muted-foreground">No sessions yet</p>
              ) : (
                <div className="space-y-2">
                  {accessData?.sessions?.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${new Date() < new Date(session.expiresAt) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm font-medium">{session.ipAddress || 'Unknown IP'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {session.userAgent?.split(' ').slice(0, 4).join(' ') || 'Unknown device'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(session.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {session.progressCount} answers
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500"
                          onClick={() => revokeSession(session.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main App
export default function Home() {
  const [token, setToken] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState(7)
  const [showAdmin, setShowAdmin] = useState(false)

  const handleUnlock = (newToken: string, days: number) => {
    sessionStorage.setItem('gastro_token', newToken)
    setToken(newToken)
    setDaysRemaining(days)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('gastro_token')
    setToken(null)
  }

  // Check for existing session
  useEffect(() => {
    const savedToken = sessionStorage.getItem('gastro_token')
    if (savedToken) {
      fetch('/api/auth', {
        headers: { 'x-session-token': savedToken }
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setToken(savedToken)
          } else {
            sessionStorage.removeItem('gastro_token')
          }
        })
        .catch(() => {
          sessionStorage.removeItem('gastro_token')
        })
    }
  }, [])

  // Check for admin URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isAdmin = params.get('admin') === 'true'
    if (isAdmin && !showAdmin) {
      const timer = setTimeout(() => setShowAdmin(true), 0)
      return () => clearTimeout(timer)
    }
  }, [showAdmin])

  if (showAdmin) {
    return <AdminPanel onBack={() => {
      setShowAdmin(false)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
    }} />
  }

  if (!token) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return <QuizApp token={token} daysRemaining={daysRemaining} onLogout={handleLogout} />
}
