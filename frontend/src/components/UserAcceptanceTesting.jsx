import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  Star, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  AlertTriangle
} from 'lucide-react';

/**
 * User Acceptance Testing Component
 * 
 * Provides UI for user acceptance testing:
 * - Test scenarios
 * - Feedback collection
 * - Rating system
 * - Progress tracking
 */
const UserAcceptanceTesting = ({ onComplete, onFeedback }) => {
  const [testingStatus, setTestingStatus] = useState('idle'); // idle, running, completed
  const [currentScenario, setCurrentScenario] = useState(0);
  const [testResults, setTestResults] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Test scenarios
  const testScenarios = [
    {
      id: 'story-management',
      name: 'Story Management',
      description: 'Create, edit, and delete stories',
      steps: [
        'Navigate to stories page',
        'Create a new story',
        'Edit existing story',
        'Delete a story',
        'Verify story persistence'
      ]
    },
    {
      id: 'filtering-search',
      name: 'Filtering and Search',
      description: 'Test search and filter functionality',
      steps: [
        'Use search bar to find stories',
        'Apply filters by source',
        'Sort stories by different criteria',
        'Test advanced filters',
        'Verify filter persistence'
      ]
    },
    {
      id: 'real-time-updates',
      name: 'Real-time Updates',
      description: 'Test real-time features',
      steps: [
        'Observe live story updates',
        'Test notification system',
        'Verify real-time status changes',
        'Test connection resilience',
        'Check offline behavior'
      ]
    },
    {
      id: 'user-interface',
      name: 'User Interface',
      description: 'Test UI components and interactions',
      steps: [
        'Test responsive design',
        'Verify accessibility features',
        'Test keyboard navigation',
        'Check color contrast',
        'Test modal interactions'
      ]
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Test application performance',
      steps: [
        'Test initial load time',
        'Test story rendering speed',
        'Test filter performance',
        'Check memory usage',
        'Test with large datasets'
      ]
    }
  ];

  // Start testing
  const startTesting = () => {
    setTestingStatus('running');
    setCurrentScenario(0);
    setTestResults([]);
    setFeedback({});
  };

  // Complete current scenario
  const completeScenario = (scenarioId, result, notes) => {
    const newResult = {
      scenarioId,
      result, // 'pass', 'fail', 'skip'
      notes,
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 300) + 60 // Mock duration
    };

    setTestResults(prev => [...prev, newResult]);

    // Move to next scenario
    if (currentScenario < testScenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
    } else {
      setTestingStatus('completed');
    }
  };

  // Skip current scenario
  const skipScenario = (scenarioId) => {
    completeScenario(scenarioId, 'skip', 'Skipped by user');
  };

  // Submit feedback
  const submitFeedback = (scenarioId, rating, comments) => {
    setFeedback(prev => ({
      ...prev,
      [scenarioId]: {
        rating,
        comments,
        timestamp: new Date().toISOString()
      }
    }));
  };

  // Calculate overall results
  const calculateResults = () => {
    const passed = testResults.filter(r => r.result === 'pass').length;
    const failed = testResults.filter(r => r.result === 'fail').length;
    const skipped = testResults.filter(r => r.result === 'skip').length;
    const total = testResults.length;

    return {
      passed,
      failed,
      skipped,
      total,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  };

  // Calculate average rating
  const calculateAverageRating = () => {
    const ratings = Object.values(feedback).map(f => f.rating).filter(r => r !== undefined);
    if (ratings.length === 0) return 0;
    return Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 10) / 10;
  };

  const results = calculateResults();
  const averageRating = calculateAverageRating();

  if (testingStatus === 'completed') {
    return (
      <div className="space-y-6">
        {/* Results Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Testing Completed</h2>
                <p className="text-sm text-gray-500">
                  User acceptance testing has been completed
                </p>
              </div>
            </div>
            
            <Badge variant="success">
              {results.passRate}% Pass Rate
            </Badge>
          </div>

          {/* Results Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.passed}</div>
              <div className="text-sm text-green-700">Passed</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
              <div className="text-sm text-yellow-700">Skipped</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{averageRating.toFixed(1)}</div>
              <div className="text-sm text-blue-700">Avg Rating</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {testScenarios.map((scenario, index) => {
              const result = testResults.find(r => r.scenarioId === scenario.id);
              const scenarioFeedback = feedback[scenario.id];
              
              return (
                <div key={scenario.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{scenario.name}</h4>
                      {result && (
                        <Badge 
                          variant={result.result === 'pass' ? 'success' : 
                                   result.result === 'fail' ? 'danger' : 'secondary'}
                        >
                          {result.result === 'pass' ? 'Passed' :
                           result.result === 'fail' ? 'Failed' : 'Skipped'}
                        </Badge>
                      )}
                    </div>
                    
                    {scenarioFeedback && (
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < scenarioFeedback.rating 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                  
                  {result && (
                    <div className="text-sm text-gray-500">
                      {result.result === 'skip' ? result.notes : 
                       `Completed in ${result.duration}s`}
                    </div>
                  )}
                  
                  {scenarioFeedback?.comments && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <p className="text-gray-700">{scenarioFeedback.comments}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowFeedbackForm(true)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Feedback
            </Button>
            
            <Button onClick={() => onComplete?.(results, feedback)}>
              <Send className="w-4 h-4 mr-2" />
              Submit Results
            </Button>
          </div>
        </Card>

        {/* Feedback Form Modal */}
        {showFeedbackForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Feedback</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const overallFeedback = {
                            overall: i + 1,
                            comments: '',
                            timestamp: new Date().toISOString()
                          };
                          setFeedback(prev => ({ ...prev, overall: overallFeedback }));
                        }}
                        className="text-yellow-400 hover:text-yellow-500"
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Share your thoughts about the new frontend..."
                    onChange={(e) => {
                      const overallFeedback = {
                        ...feedback.overall,
                        comments: e.target.value
                      };
                      setFeedback(prev => ({ ...prev, overall: overallFeedback }));
                    }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowFeedbackForm(false)}>
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (testingStatus === 'idle') {
    return (
      <Card className="p-6">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <Users className="w-12 h-12 text-blue-500" />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Acceptance Testing</h2>
            <p className="text-sm text-gray-500 mt-2">
              Help us validate the new frontend by running through test scenarios
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Test Scenarios</h3>
            <div className="space-y-2 text-sm text-blue-700">
              {testScenarios.map((scenario, index) => (
                <div key={scenario.id} className="flex items-center space-x-2">
                  <span className="font-medium">{index + 1}.</span>
                  <span>{scenario.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Button onClick={startTesting} className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Start Testing
          </Button>
        </div>
      </Card>
    );
  }

  const currentScenarioData = testScenarios[currentScenario];

  return (
    <div className="space-y-6">
      {/* Current Scenario */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Test Scenario {currentScenario + 1} of {testScenarios.length}
              </h2>
              <p className="text-sm text-gray-500">
                {currentScenarioData.name}
              </p>
            </div>
          </div>
          
          <Badge variant="warning">
            In Progress
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-gray-600">{currentScenarioData.description}</p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Test Steps</h3>
            <div className="space-y-2">
              {currentScenarioData.steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => skipScenario(currentScenarioData.id)}
          >
            Skip
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => completeScenario(currentScenarioData.id, 'fail', 'Failed by user')}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Fail
            </Button>
            
            <Button
              onClick={() => completeScenario(currentScenarioData.id, 'pass', 'Passed successfully')}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Pass
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">
            {currentScenario + 1} / {testScenarios.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentScenario + 1) / testScenarios.length) * 100}%` }}
          />
        </div>
      </Card>
    </div>
  );
};

export default UserAcceptanceTesting;
