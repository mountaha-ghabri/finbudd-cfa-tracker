import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, CheckCircle, Users, TrendingUp, Calendar, LogOut } from 'lucide-react';

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://vqyiwsmtrnnfejejpvot.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8WPFOQLPeq6RXNA8UvW_Cw_1P24zHeL';

// Supabase client setup
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers
    };

    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    return response.json();
  }

  async signUp(email, password, name) {
    const data = await this.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, data: { name } })
    });
    this.token = data.access_token;
    return data;
  }

  async signIn(email, password) {
    const data = await this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.token = data.access_token;
    return data;
  }

  async signOut() {
    await this.request('/auth/v1/logout', { method: 'POST' });
    this.token = null;
  }

  async getUser() {
    return this.request('/auth/v1/user', { method: 'GET' });
  }

  async select(table, query = '') {
    return this.request(`/rest/v1/${table}?${query}`, { method: 'GET' });
  }

  async insert(table, data) {
    return this.request(`/rest/v1/${table}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(table, data, match) {
    return this.request(`/rest/v1/${table}?${match}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Topic configuration
const TOPICS = [
  { id: 'ethics', name: 'Ethics', color: '#3b82f6' },
  { id: 'alternative', name: 'Alternative Investments', color: '#8b5cf6' },
  { id: 'corporate', name: 'Corporate Issuers', color: '#ec4899' },
  { id: 'portfolio', name: 'Portfolio Management', color: '#f59e0b' },
  { id: 'fixedIncome', name: 'Fixed Income', color: '#10b981' },
  { id: 'quantitative', name: 'Quantitative Methods', color: '#06b6d4' },
  { id: 'derivatives', name: 'Derivatives', color: '#6366f1' },
  { id: 'fsa', name: 'Financial Statement Analysis', color: '#ef4444' },
  { id: 'equity', name: 'Equity Investments', color: '#14b8a6' },
  { id: 'economics', name: 'Economics', color: '#f97316' }
];

const CFA_TRACKER = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('student');
  const [students, setStudents] = useState([]);
  const [studentData, setStudentData] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const userData = await supabase.getUser();
      setUser(userData);
    } catch (err) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      if (user?.user_metadata?.is_admin) {
        const studentsData = await supabase.select('students', 'select=*');
        setStudents(studentsData);

        const progressData = await supabase.select('student_progress', 'select=*');
        const quizData = await supabase.select('quiz_scores', 'select=*');

        const dataByStudent = {};
        studentsData.forEach(student => {
          dataByStudent[student.id] = {};
          TOPICS.forEach(topic => {
            const topicProgress = progressData.find(p => 
              p.student_id === student.id && p.topic_id === topic.id
            );
            const topicQuizzes = quizData.filter(q => 
              q.student_id === student.id && q.topic_id === topic.id
            );

            dataByStudent[student.id][topic.id] = {
              videoCoverage: topicProgress?.video_coverage || 0,
              quizCoverage: topicProgress?.quiz_coverage || 0,
              avgScore: topicProgress?.avg_score || 0,
              quizzes: topicQuizzes.reduce((acc, quiz) => {
                if (!acc[quiz.quiz_id]) acc[quiz.quiz_id] = [];
                acc[quiz.quiz_id].push(quiz.score);
                return acc;
              }, {})
            };
          });
        });
        setStudentData(dataByStudent);
      } else {
        const progressData = await supabase.select('student_progress', `student_id=eq.${user.id}`);
        const quizData = await supabase.select('quiz_scores', `student_id=eq.${user.id}`);

        const myData = {};
        TOPICS.forEach(topic => {
          const topicProgress = progressData.find(p => p.topic_id === topic.id);
          const topicQuizzes = quizData.filter(q => q.topic_id === topic.id);

          myData[topic.id] = {
            videoCoverage: topicProgress?.video_coverage || 0,
            quizCoverage: topicProgress?.quiz_coverage || 0,
            avgScore: topicProgress?.avg_score || 0,
            quizzes: topicQuizzes.reduce((acc, quiz) => {
              if (!acc[quiz.quiz_id]) acc[quiz.quiz_id] = [];
              acc[quiz.quiz_id].push(quiz.score);
              return acc;
            }, {})
          };
        });

        setStudentData({ [user.id]: myData });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (authMode === 'signin') {
        const data = await supabase.signIn(email, password);
        setUser(data.user);
      } else {
        const data = await supabase.signUp(email, password, name);
        await supabase.insert('students', {
          id: data.user.id,
          name: name,
          email: email
        });
        setUser(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.signOut();
    setUser(null);
    setStudentData({});
    setStudents([]);
  };

  const addQuizScore = async (studentId, topicId, quizId, score) => {
    try {
      await supabase.insert('quiz_scores', {
        student_id: studentId,
        topic_id: topicId,
        quiz_id: quizId,
        score: score
      });

      const allQuizzes = await supabase.select('quiz_scores', 
        `student_id=eq.${studentId}&topic_id=eq.${topicId}`
      );

      const quizzesByLOS = {};
      allQuizzes.forEach(q => {
        if (!quizzesByLOS[q.quiz_id]) quizzesByLOS[q.quiz_id] = [];
        quizzesByLOS[q.quiz_id].push(q.score);
      });

      const lastScores = Object.values(quizzesByLOS).map(attempts => 
        attempts[attempts.length - 1]
      );
      const avgScore = lastScores.reduce((sum, s) => sum + s, 0) / lastScores.length;
      const quizCoverage = (Object.keys(quizzesByLOS).length / 50) * 100;

      await supabase.update('student_progress', {
        avg_score: avgScore,
        quiz_coverage: quizCoverage
      }, `student_id=eq.${studentId}&topic_id=eq.${topicId}`);

      await loadData();
    } catch (err) {
      console.error('Error adding quiz score:', err);
      setError('Failed to add quiz score');
    }
  };

  const getColorForScore = (score) => {
    if (score < 50) return '#ef4444';
    if (score < 70) return '#f59e0b';
    return '#10b981';
  };

  const calculateOverallProgress = (data) => {
    const topics = Object.values(data);
    if (topics.length === 0) return { quizCoverage: 0, avgScore: 0 };
    const totalQuizCoverage = topics.reduce((sum, t) => sum + t.quizCoverage, 0) / topics.length;
    const totalAvgScore = topics.reduce((sum, t) => sum + t.avgScore, 0) / topics.length;
    return { quizCoverage: totalQuizCoverage, avgScore: totalAvgScore };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-blue-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Finbudd CFA Tracker</h1>
            <p className="text-gray-600">CFA Level 1 Study Progress Tracker</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                authMode === 'signin' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                authMode === 'signup' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const StudentView = () => {
    const data = studentData[user.id] || {};
    const overall = calculateOverallProgress(data);
    const daysRemaining = Math.floor((new Date('2025-08-20') - new Date()) / (1000 * 60 * 60 * 24));

    const chartData = TOPICS.map(topic => ({
      name: topic.name.split(' ')[0],
      'Quiz Coverage': data[topic.id]?.quizCoverage || 0,
      'Avg Score': data[topic.id]?.avgScore || 0
    }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Welcome, {user.user_metadata?.name || user.email}
                </h1>
                <p className="text-gray-600">Exam Session: August 2025</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                  <Calendar className="w-5 h-5" />
                  <span>{daysRemaining} days remaining</span>
                </div>
                <div className="text-sm text-gray-600">Exam Day: August 20, 2025</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Overall Quiz Coverage</h3>
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-4xl font-bold" style={{ color: getColorForScore(overall.quizCoverage) }}>
              {overall.quizCoverage.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Average Score</h3>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-4xl font-bold" style={{ color: getColorForScore(overall.avgScore) }}>
              {overall.avgScore.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Video Coverage</h3>
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-4xl font-bold text-gray-400">0%</div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Progress by Topic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Quiz Coverage" fill="#3b82f6" />
              <Bar dataKey="Avg Score" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOPICS.map(topic => {
            const topicData = data[topic.id] || { videoCoverage: 0, quizCoverage: 0, avgScore: 0 };
            return (
              <div 
                key={topic.id}
                className="bg-white rounded-xl shadow-lg p-6 border-l-4 hover:shadow-xl transition-shadow cursor-pointer"
                style={{ borderLeftColor: topic.color }}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">{topic.name}</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Quiz Coverage</span>
                      <span className="font-semibold">{topicData.quizCoverage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${topicData.quizCoverage}%`,
                          backgroundColor: getColorForScore(topicData.quizCoverage)
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Average Score</span>
                      <span 
                        className="font-semibold text-lg"
                        style={{ color: getColorForScore(topicData.avgScore) }}
                      >
                        {topicData.avgScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {TOPICS.find(t => t.id === selectedTopic)?.name}
                  </h2>
                  <button 
                    onClick={() => setSelectedTopic(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Add Quiz Score</h3>
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Quiz ID (e.g., LM1-LOS1)"
                    className="flex-1 px-4 py-2 border rounded-lg"
                    id="quizId"
                  />
                  <input
                    type="number"
                    placeholder="Score %"
                    min="0"
                    max="100"
                    className="w-24 px-4 py-2 border rounded-lg"
                    id="quizScore"
                  />
                  <button
                    onClick={() => {
                      const quizId = document.getElementById('quizId').value;
                      const score = parseFloat(document.getElementById('quizScore').value);
                      if (quizId && score >= 0 && score <= 100) {
                        addQuizScore(user.id, selectedTopic, quizId, score);
                        document.getElementById('quizId').value = '';
                        document.getElementById('quizScore').value = '';
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-3">Quiz History</h3>
                <div className="space-y-2">
                  {Object.entries(studentData[user.id]?.[selectedTopic]?.quizzes || {}).map(([quizId, attempts]) => (
                    <div key={quizId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700 mb-2">{quizId}</div>
                      <div className="flex gap-2 flex-wrap">
                        {attempts.map((score, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                            style={{ backgroundColor: getColorForScore(score) }}
                          >
                            Attempt {idx + 1}: {score}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(studentData[user.id]?.[selectedTopic]?.quizzes || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No quiz attempts yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AdminView = () => {
    const studentsProgress = students.map(student => {
      const progress = calculateOverallProgress(studentData[student.id] || {});
      return {
        ...student,
        quizCoverage: progress.quizCoverage,
        avgScore: progress.avgScore
      };
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-purple-600">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Monitor all student progress for CFA Level 1</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Students</h3>
              <div className="text-4xl font-bold text-purple-600">{students.length}</div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg Quiz Coverage</h3>
              <div className="text-4xl font-bold text-blue-600">
                {students.length > 0 
                  ? (studentsProgress.reduce((sum, s) => sum + s.quizCoverage, 0) / students.length).toFixed(1)
                  : 0}%
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg Score</h3>
              <div className="text-4xl font-bold text-green-600">
                {students.length > 0
                  ? (studentsProgress.reduce((sum, s) => sum + s.avgScore, 0) / students.length).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Progress</h2>
            <div className="space-y-4">
              {studentsProgress.map((student) => (
                <div key={student.id} className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Quiz Coverage</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full"
                            style={{ 
                              width: `${student.quizCoverage}%`,
                              backgroundColor: getColorForScore(student.quizCoverage)
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{student.quizCoverage.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Average Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full"
                            style={{ 
                              width: `${student.avgScore}%`,
                              backgroundColor: getColorForScore(student.avgScore)
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{student.avgScore.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-center text-gray-500 py-8">No students registered yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isAdmin = user?.user_metadata?.is_admin;

  return (
    <div>
      {/* Top-right control panel */}
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-2 flex gap-2 items-center">
        {isAdmin && (
          <>
            <button
              onClick={() => setView('student')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'admin'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admin View
            </button>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Main content */}
      {view === 'admin' && isAdmin ? <AdminView /> : <StudentView />}
    </div>
  );
};

export default CFA_TRACKER;