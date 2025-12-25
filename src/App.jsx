import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, CheckCircle, Users, TrendingUp, Calendar, LogOut, Target, Award, Clock, BarChart3, Settings } from 'lucide-react';

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
      'Prefer': 'return=representation',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers
    };

    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return response.json();
  }

  async signUp(email, password, name) {
    const data = await this.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, data: { name } })
    });
    if (data.access_token) {
      this.token = data.access_token;
    }
    return data;
  }

  async signIn(email, password) {
    const data = await this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.access_token) {
      this.token = data.access_token;
    }
    return data;
  }

  async signOut() {
    try {
      await this.request('/auth/v1/logout', { method: 'POST' });
    } catch (err) {
      console.log('Logout error:', err);
    }
    this.token = null;
  }

  async getUser() {
    try {
      return await this.request('/auth/v1/user', { method: 'GET' });
    } catch (err) {
      return null;
    }
  }

  async select(table, query = '') {
    const queryString = query ? `?${query}` : '';
    return this.request(`/rest/v1/${table}${queryString}`, { method: 'GET' });
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

  async upsert(table, data) {
    return this.request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(data)
    });
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Topic configuration with burgundy theme variations
const TOPICS = [
  { id: 'ethics', name: 'Ethics', color: '#8B1A3D', weight: 15 },
  { id: 'quantitative', name: 'Quantitative Methods', color: '#A02040', weight: 10 },
  { id: 'economics', name: 'Economics', color: '#B03050', weight: 10 },
  { id: 'fsa', name: 'Financial Statement Analysis', color: '#C04060', weight: 15 },
  { id: 'corporate', name: 'Corporate Issuers', color: '#D05070', weight: 10 },
  { id: 'equity', name: 'Equity Investments', color: '#E06080', weight: 11 },
  { id: 'fixedIncome', name: 'Fixed Income', color: '#F07090', weight: 11 },
  { id: 'derivatives', name: 'Derivatives', color: '#800020', weight: 6 },
  { id: 'alternative', name: 'Alternative Investments', color: '#900030', weight: 6 },
  { id: 'portfolio', name: 'Portfolio Management', color: '#A00040', weight: 6 }
];

const CFA_TRACKER = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('student');
  const [students, setStudents] = useState([]);
  const [studentData, setStudentData] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [examDate, setExamDate] = useState('');
  const [showExamDateModal, setShowExamDateModal] = useState(false);
  
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
      loadExamDate();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const userData = await supabase.getUser();
      if (userData && userData.id) {
        setUser(userData);
      }
    } catch (err) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const loadExamDate = async () => {
    try {
      const result = await supabase.select('students', `id=eq.${user.id}&select=exam_date`);
      if (result && result.length > 0 && result[0].exam_date) {
        setExamDate(result[0].exam_date);
      } else {
        // Default to August 2025
        const defaultDate = '2025-08-20';
        setExamDate(defaultDate);
      }
    } catch (err) {
      console.error('Error loading exam date:', err);
      setExamDate('2025-08-20');
    }
  };

  const saveExamDate = async () => {
    try {
      await supabase.update('students', { exam_date: examDate }, `id=eq.${user.id}`);
      setShowExamDateModal(false);
    } catch (err) {
      console.error('Error saving exam date:', err);
      setError('Failed to save exam date');
    }
  };

  const loadData = async () => {
    try {
      if (user?.user_metadata?.is_admin) {
        const studentsData = await supabase.select('students', 'select=*');
        setStudents(studentsData || []);

        const progressData = await supabase.select('student_progress', 'select=*');
        const quizData = await supabase.select('quiz_scores', 'select=*');

        const dataByStudent = {};
        (studentsData || []).forEach(student => {
          dataByStudent[student.id] = {};
          TOPICS.forEach(topic => {
            const topicProgress = (progressData || []).find(p => 
              p.student_id === student.id && p.topic_id === topic.id
            );
            const topicQuizzes = (quizData || []).filter(q => 
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
          const topicProgress = (progressData || []).find(p => p.topic_id === topic.id);
          const topicQuizzes = (quizData || []).filter(q => q.topic_id === topic.id);

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
        if (data.user) {
          setUser(data.user);
        } else if (data.access_token) {
          // Get user info
          const userInfo = await supabase.getUser();
          setUser(userInfo);
        }
      } else {
        const data = await supabase.signUp(email, password, name);
        if (data.user) {
          // Create student record
          try {
            await supabase.insert('students', {
              id: data.user.id,
              name: name,
              email: email,
              exam_date: '2025-08-20'
            });
          } catch (err) {
            console.error('Error creating student record:', err);
          }
          setUser(data.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleSignOut = async () => {
    await supabase.signOut();
    setUser(null);
    setStudentData({});
    setStudents([]);
    setExamDate('');
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
      (allQuizzes || []).forEach(q => {
        if (!quizzesByLOS[q.quiz_id]) quizzesByLOS[q.quiz_id] = [];
        quizzesByLOS[q.quiz_id].push(q.score);
      });

      const lastScores = Object.values(quizzesByLOS).map(attempts => 
        attempts[attempts.length - 1]
      );
      const avgScore = lastScores.length > 0 
        ? lastScores.reduce((sum, s) => sum + s, 0) / lastScores.length 
        : 0;
      const quizCoverage = (Object.keys(quizzesByLOS).length / 50) * 100;

      // Upsert progress
      const existing = await supabase.select('student_progress', 
        `student_id=eq.${studentId}&topic_id=eq.${topicId}`
      );
      
      if (existing && existing.length > 0) {
        await supabase.update('student_progress', {
          avg_score: avgScore,
          quiz_coverage: quizCoverage
        }, `student_id=eq.${studentId}&topic_id=eq.${topicId}`);
      } else {
        await supabase.insert('student_progress', {
          student_id: studentId,
          topic_id: topicId,
          avg_score: avgScore,
          quiz_coverage: quizCoverage,
          video_coverage: 0
        });
      }

      await loadData();
    } catch (err) {
      console.error('Error adding quiz score:', err);
      setError('Failed to add quiz score');
    }
  };

  const updateVideoCoverage = async (studentId, topicId, coverage) => {
    try {
      const existing = await supabase.select('student_progress', 
        `student_id=eq.${studentId}&topic_id=eq.${topicId}`
      );
      
      if (existing && existing.length > 0) {
        await supabase.update('student_progress', {
          video_coverage: coverage
        }, `student_id=eq.${studentId}&topic_id=eq.${topicId}`);
      } else {
        await supabase.insert('student_progress', {
          student_id: studentId,
          topic_id: topicId,
          video_coverage: coverage,
          quiz_coverage: 0,
          avg_score: 0
        });
      }

      await loadData();
    } catch (err) {
      console.error('Error updating video coverage:', err);
      setError('Failed to update video coverage');
    }
  };

  const getColorForScore = (score) => {
    if (score < 50) return '#DC143C'; // Crimson
    if (score < 70) return '#CD5C5C'; // Indian Red
    return '#228B22'; // Forest Green
  };

  const calculateOverallProgress = (data) => {
    const topics = Object.values(data);
    if (topics.length === 0) return { quizCoverage: 0, avgScore: 0, videoCoverage: 0, weightedScore: 0 };
    
    let totalQuizCoverage = 0;
    let totalAvgScore = 0;
    let totalVideoCoverage = 0;
    let weightedScore = 0;
    let totalWeight = 0;

    topics.forEach((topic, idx) => {
      const topicConfig = TOPICS[idx];
      const weight = topicConfig?.weight || 1;
      totalWeight += weight;
      
      totalQuizCoverage += topic.quizCoverage || 0;
      totalAvgScore += topic.avgScore || 0;
      totalVideoCoverage += topic.videoCoverage || 0;
      weightedScore += (topic.avgScore || 0) * weight;
    });

    return {
      quizCoverage: totalQuizCoverage / topics.length,
      avgScore: totalAvgScore / topics.length,
      videoCoverage: totalVideoCoverage / topics.length,
      weightedScore: totalWeight > 0 ? weightedScore / totalWeight : 0
    };
  };

  const calculateDaysRemaining = () => {
    if (!examDate) return 0;
    const exam = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exam.setHours(0, 0, 0, 0);
    const diff = Math.floor((exam - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0A1A] via-[#4A0F2E] to-[#2D0A1A] flex items-center justify-center">
        <div className="text-2xl font-bold text-[#FFB6C1] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0A1A] via-[#4A0F2E] to-[#2D0A1A] flex items-center justify-center p-6">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Finbudd CFA Tracker</h1>
            <p className="text-[#FFB6C1]">CFA Level 1 Study Progress Tracker</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                authMode === 'signin' 
                  ? 'bg-[#8B1A3D] text-white shadow-lg' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                authMode === 'signup' 
                  ? 'bg-[#8B1A3D] text-white shadow-lg' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
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
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-[#8B1A3D] outline-none text-white placeholder-white/50"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-[#8B1A3D] outline-none text-white placeholder-white/50"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-[#8B1A3D] outline-none text-white placeholder-white/50"
              required
            />
            
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#8B1A3D] text-white py-3 rounded-lg font-semibold hover:bg-[#A02040] transition-all shadow-lg hover:shadow-xl"
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
    const daysRemaining = calculateDaysRemaining();

    const chartData = TOPICS.map(topic => ({
      name: topic.name.split(' ')[0],
      'Quiz Coverage': data[topic.id]?.quizCoverage || 0,
      'Avg Score': data[topic.id]?.avgScore || 0,
      'Video Coverage': data[topic.id]?.videoCoverage || 0
    }));

    const pieData = [
      { name: 'Completed', value: overall.quizCoverage, color: '#228B22' },
      { name: 'Remaining', value: 100 - overall.quizCoverage, color: '#DC143C' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0A1A] via-[#4A0F2E] to-[#2D0A1A] p-6">
        <div className="max-w-7xl mx-auto mb-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-6 border border-white/20">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome, {user.user_metadata?.name || user.email}
                </h1>
                <p className="text-[#FFB6C1]">CFA Level 1 Study Progress</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-[#FFB6C1] font-semibold mb-2">
                  <Calendar className="w-5 h-5" />
                  <span>{daysRemaining} days remaining</span>
                </div>
                <div className="text-sm text-white/70">
                  Exam: {examDate ? new Date(examDate).toLocaleDateString() : 'Not set'}
                </div>
                <button
                  onClick={() => setShowExamDateModal(true)}
                  className="mt-2 text-xs text-[#FFB6C1] hover:text-white underline"
                >
                  Change Exam Date
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white/90">Quiz Coverage</h3>
              <CheckCircle className="w-6 h-6 text-[#228B22]" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {overall.quizCoverage.toFixed(1)}%
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full transition-all"
                style={{ 
                  width: `${overall.quizCoverage}%`,
                  backgroundColor: getColorForScore(overall.quizCoverage)
                }}
              />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white/90">Average Score</h3>
              <TrendingUp className="w-6 h-6 text-[#228B22]" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {overall.avgScore.toFixed(1)}%
            </div>
            <div className="text-sm text-white/70">Weighted: {overall.weightedScore.toFixed(1)}%</div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white/90">Video Coverage</h3>
              <BookOpen className="w-6 h-6 text-[#8B1A3D]" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {overall.videoCoverage.toFixed(1)}%
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <div 
                className="h-2 rounded-full transition-all"
                style={{ 
                  width: `${overall.videoCoverage}%`,
                  backgroundColor: '#8B1A3D'
                }}
              />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white/90">Overall Progress</h3>
              <Target className="w-6 h-6 text-[#FFB6C1]" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {((overall.quizCoverage + overall.videoCoverage) / 2).toFixed(1)}%
            </div>
            <div className="text-sm text-white/70">Combined metric</div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Progress by Topic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#FFB6C1" />
              <YAxis stroke="#FFB6C1" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(45, 10, 26, 0.9)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              <Bar dataKey="Quiz Coverage" fill="#8B1A3D" />
              <Bar dataKey="Avg Score" fill="#228B22" />
              <Bar dataKey="Video Coverage" fill="#A02040" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOPICS.map(topic => {
            const topicData = data[topic.id] || { videoCoverage: 0, quizCoverage: 0, avgScore: 0 };
            return (
              <div 
                key={topic.id}
                className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                style={{ borderLeftColor: topic.color, borderLeftWidth: '4px' }}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white">{topic.name}</h3>
                  <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded">
                    {topic.weight}%
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Quiz Coverage</span>
                      <span className="font-semibold text-white">{topicData.quizCoverage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
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
                      <span className="text-white/70">Average Score</span>
                      <span 
                        className="font-semibold text-lg"
                        style={{ color: getColorForScore(topicData.avgScore) }}
                      >
                        {topicData.avgScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Video Coverage</span>
                      <span className="font-semibold text-white">{topicData.videoCoverage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${topicData.videoCoverage}%`,
                          backgroundColor: topic.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTopic && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="backdrop-blur-xl bg-[#2D0A1A]/95 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="p-6 border-b border-white/20 sticky top-0 bg-[#2D0A1A]/95 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">
                    {TOPICS.find(t => t.id === selectedTopic)?.name}
                  </h2>
                  <button 
                    onClick={() => setSelectedTopic(null)}
                    className="text-white/70 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Update Video Coverage</h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Coverage %"
                      min="0"
                      max="100"
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                      id="videoCoverage"
                    />
                    <button
                      onClick={() => {
                        const coverage = parseFloat(document.getElementById('videoCoverage').value);
                        if (coverage >= 0 && coverage <= 100) {
                          updateVideoCoverage(user.id, selectedTopic, coverage);
                          document.getElementById('videoCoverage').value = '';
                        }
                      }}
                      className="px-6 py-2 bg-[#8B1A3D] text-white rounded-lg hover:bg-[#A02040] transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Add Quiz Score</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Quiz ID (e.g., LM1-LOS1)"
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                      id="quizId"
                    />
                    <input
                      type="number"
                      placeholder="Score %"
                      min="0"
                      max="100"
                      className="w-24 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
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
                      className="px-6 py-2 bg-[#8B1A3D] text-white rounded-lg hover:bg-[#A02040] transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Quiz History</h3>
                  <div className="space-y-2">
                    {Object.entries(studentData[user.id]?.[selectedTopic]?.quizzes || {}).map(([quizId, attempts]) => (
                      <div key={quizId} className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="font-semibold text-white mb-2">{quizId}</div>
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
                      <p className="text-white/50 text-center py-4">No quiz attempts yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showExamDateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="backdrop-blur-xl bg-[#2D0A1A]/95 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Set Exam Date</h3>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={saveExamDate}
                  className="flex-1 px-6 py-2 bg-[#8B1A3D] text-white rounded-lg hover:bg-[#A02040] transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowExamDateModal(false)}
                  className="flex-1 px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
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
        avgScore: progress.avgScore,
        videoCoverage: progress.videoCoverage,
        weightedScore: progress.weightedScore,
        overallProgress: (progress.quizCoverage + progress.videoCoverage) / 2
      };
    });

    // Calculate global KPIs
    const totalStudents = students.length;
    const avgQuizCoverage = students.length > 0 
      ? studentsProgress.reduce((sum, s) => sum + s.quizCoverage, 0) / students.length 
      : 0;
    const avgScore = students.length > 0
      ? studentsProgress.reduce((sum, s) => sum + s.avgScore, 0) / students.length
      : 0;
    const avgVideoCoverage = students.length > 0
      ? studentsProgress.reduce((sum, s) => sum + s.videoCoverage, 0) / students.length
      : 0;
    const avgWeightedScore = students.length > 0
      ? studentsProgress.reduce((sum, s) => sum + s.weightedScore, 0) / students.length
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0A1A] via-[#4A0F2E] to-[#2D0A1A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-[#FFB6C1]" />
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <p className="text-[#FFB6C1]">Monitor all student progress for CFA Level 1</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Total Students</h3>
              <div className="text-4xl font-bold text-[#FFB6C1]">{totalStudents}</div>
            </div>
            
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Avg Quiz Coverage</h3>
              <div className="text-4xl font-bold text-[#228B22]">{avgQuizCoverage.toFixed(1)}%</div>
            </div>
            
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Avg Score</h3>
              <div className="text-4xl font-bold text-[#228B22]">{avgScore.toFixed(1)}%</div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Avg Video Coverage</h3>
              <div className="text-4xl font-bold text-[#8B1A3D]">{avgVideoCoverage.toFixed(1)}%</div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Student Progress - KPI Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white font-semibold">Student Name</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Email</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Quiz Coverage</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Avg Score</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Weighted Score</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Video Coverage</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Overall Progress</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsProgress.map((student) => (
                    <tr key={student.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white">{student.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-white/70 text-sm">{student.email}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-white/20 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${student.quizCoverage}%`,
                                backgroundColor: getColorForScore(student.quizCoverage)
                              }}
                            />
                          </div>
                          <span className="text-white text-sm font-semibold w-12 text-right">
                            {student.quizCoverage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: getColorForScore(student.avgScore) }}
                        >
                          {student.avgScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className="text-lg font-bold text-[#FFB6C1]"
                        >
                          {student.weightedScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-white/20 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${student.videoCoverage}%`,
                                backgroundColor: '#8B1A3D'
                              }}
                            />
                          </div>
                          <span className="text-white text-sm font-semibold w-12 text-right">
                            {student.videoCoverage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-white font-semibold">
                          {student.overallProgress.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            student.overallProgress >= 70 
                              ? 'bg-green-500/20 text-green-300' 
                              : student.overallProgress >= 50
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {student.overallProgress >= 70 ? 'On Track' : student.overallProgress >= 50 ? 'Needs Work' : 'At Risk'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-white/50">
                        No students registered yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
      <div className="fixed top-4 right-4 z-50 backdrop-blur-xl bg-white/10 rounded-lg shadow-xl p-2 flex gap-2 items-center border border-white/20">
        {isAdmin && (
          <>
            <button
              onClick={() => setView('student')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                view === 'student'
                  ? 'bg-[#8B1A3D] text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Student View
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                view === 'admin'
                  ? 'bg-[#8B1A3D] text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Admin View
            </button>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all flex items-center gap-2 border border-red-500/30"
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