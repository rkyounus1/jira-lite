// src/pages/Learning.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Learning() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [user])

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('learning_questions')
      .select('*')
      .eq('is_active', true)
      .limit(10)

    setQuestions(data || [])
    if (data && data.length > 0) {
      setStartTime(new Date())
    }
  }

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return

    const question = questions[currentQuestion]
    const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase()
    const timeTaken = Math.round((new Date() - startTime) / 1000)

    // Save answer
    await supabase
      .from('employee_answers')
      .upsert({
        employee_id: user.id,
        question_id: question.id,
        answer: userAnswer,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken
      })

    if (isCorrect) {
      setScore(score + 1)
    }

    setShowResult(true)
  }

  const handleNextQuestion = () => {
    setShowResult(false)
    setUserAnswer('')
    setStartTime(new Date())
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Quiz completed
      alert(`Quiz completed! Your score: ${score}/${questions.length}`)
    }
  }

  if (questions.length === 0) {
    return <div>Loading questions...</div>
  }

  const question = questions[currentQuestion]

  return (
    <div className="learning-container">
      <h1 className="page-title">Learning Center</h1>
      
      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <span>Question {currentQuestion + 1} of {questions.length}</span>
      </div>

      <div className="question-card">
        <div className="question-category">{question.category}</div>
        <h2 className="question-text">{question.question}</h2>
        
        {!showResult ? (
          <div className="answer-section">
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
            />
            <button onClick={handleSubmitAnswer} className="btn-primary">
              Submit Answer
            </button>
          </div>
        ) : (
          <div className="result-section">
            <div className={`result-message ${userAnswer.toLowerCase() === question.correct_answer.toLowerCase() ? 'correct' : 'incorrect'}`}>
              {userAnswer.toLowerCase() === question.correct_answer.toLowerCase() 
                ? '✓ Correct!' 
                : '✗ Incorrect'}
            </div>
            <div className="correct-answer">
              <strong>Correct answer:</strong> {question.correct_answer}
            </div>
            {question.explanation && (
              <div className="explanation">
                <strong>Explanation:</strong> {question.explanation}
              </div>
            )}
            <button onClick={handleNextQuestion} className="btn-primary">
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        )}
      </div>

      <div className="score-display">
        Current Score: {score}/{currentQuestion + 1}
      </div>
    </div>
  )
}