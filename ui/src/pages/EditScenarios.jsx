import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, ArrowBack as ArrowBackIcon, Sort as SortIcon, Add as AddIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { PILLAR_DEFINITIONS } from '../constants/pillars';

const EditScenarios = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const [scenario, setScenario] = useState({});
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for A->Z, 'desc' for Z->A
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');

  // Responsible AI pillars derived from shared constants
  const responsibleAIPillars = Object.values(PILLAR_DEFINITIONS).map(pillar => pillar.name);

  // Fetch scenario and questions from API
  useEffect(() => {
    const fetchScenarioData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/get-scenario-questions?scenario_id=${scenarioId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': window.env.API_GATEWAY_APIKEY,
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Scenario data response:', data);
        
        if (data.scenario) {
          setScenario(data.scenario);
        }
        if (data.questions) {
          // Sort questions by category alphabetically on initial load
          const sortedQuestions = [...data.questions].sort((a, b) => 
            a.category.localeCompare(b.category)
          );
          setQuestions(sortedQuestions);
        }
      } catch (err) {
        console.error('Error fetching scenario data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (scenarioId) {
      fetchScenarioData();
    }
  }, [scenarioId]);

  // Sort questions based on current sort order
  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.category.localeCompare(b.category);
    } else {
      return b.category.localeCompare(a.category);
    }
  });

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setNewQuestionCategory(responsibleAIPillars[0]); // Default to first pillar
    setNewQuestionText('');
  };

  const handleSaveNewQuestion = async () => {
    if (!newQuestionCategory.trim() || !newQuestionText.trim()) {
      alert('Both category and question are required');
      return;
    }

    try {
      const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/add-scenario-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.env.API_GATEWAY_APIKEY,
        },
        body: JSON.stringify({
          scenario_id: scenarioId,
          category: newQuestionCategory,
          question: newQuestionText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create new question object for local state
      const newQuestion = {
        id: `temp-${Date.now()}`, // Temporary ID, will be replaced on next load
        category: newQuestionCategory,
        question: newQuestionText
      };

      // Add to local state
      setQuestions([...questions, newQuestion]);
      
      // Reset add mode
      setIsAddingQuestion(false);
      setNewQuestionCategory('');
      setNewQuestionText('');
    } catch (err) {
      console.error('Error adding question:', err);
      alert('Error adding question. Please try again.');
    }
  };

  const handleCancelAddQuestion = () => {
    setIsAddingQuestion(false);
    setNewQuestionCategory('');
    setNewQuestionText('');
  };

  const handleEditQuestion = (questionId, currentText, currentCategory) => {
    setEditingQuestionId(questionId);
    setEditingText(currentText);
    setEditingCategory(currentCategory);
  };

  const handleSaveQuestion = async (questionId) => {
    try {
      const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/update-scenario-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.env.API_GATEWAY_APIKEY,
        },
        body: JSON.stringify({
          scenario_id: scenarioId,
          question_id: questionId,
          category: editingCategory,
          question: editingText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, question: editingText, category: editingCategory } : q
      ));
      
      setEditingQuestionId(null);
      setEditingText('');
      setEditingCategory('');
    } catch (err) {
      console.error('Error updating question:', err);
      alert('Error updating question. Please try again.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/delete-scenario-question?scenario_id=${scenarioId}&question_id=${questionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': window.env.API_GATEWAY_APIKEY,
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Remove from local state
        setQuestions(questions.filter(q => q.id !== questionId));
      } catch (err) {
        console.error('Error deleting question:', err);
        alert('Error deleting question. Please try again.');
      }
    }
  };

  const handleBack = () => {
    navigate('/manage-scenarios');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        bgcolor: 'white',
        pt: 4
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200 }}>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2, color: 'var(--primary-color)' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">
            Edit Scenario
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress sx={{ color: 'var(--primary-color)' }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="error">
              Error loading scenario: {error}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Scenario Information */}
            <Box sx={{ mb: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {scenario.name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                {scenario.description}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <strong>Questions per Category:</strong> {scenario.questionsPerCategory}
              </Typography>
            </Box>

        {/* Questions by Category */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Questions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            disabled={isAddingQuestion}
            sx={{
              backgroundColor: 'var(--primary-color)',
              '&:hover': {
                backgroundColor: 'var(--primary-hover-color)'
              }
            }}
          >
            Add Question
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Category
                    <IconButton 
                      size="small" 
                      onClick={handleSortToggle}
                      sx={{ color: 'var(--primary-color)' }}
                    >
                      <SortIcon 
                        sx={{ 
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }} 
                      />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '120px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Add Question Row */}
              {isAddingQuestion && (
                <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={newQuestionCategory}
                        onChange={(e) => setNewQuestionCategory(e.target.value)}
                        displayEmpty
                      >
                        {responsibleAIPillars.map((pillar) => (
                          <MenuItem key={pillar} value={pillar}>
                            {pillar}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      multiline
                      rows={3}
                      fullWidth
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Enter your question here..."
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="Save question">
                        <IconButton
                          onClick={handleSaveNewQuestion}
                          size="small"
                          sx={{ color: 'green' }}
                        >
                          <SaveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton
                          onClick={handleCancelAddQuestion}
                          size="small"
                          color="error"
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              
              {/* Existing Questions */}
              {sortedQuestions.map((question) => (
                <TableRow key={question.id} hover>
                  <TableCell>
                    {editingQuestionId === question.id ? (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value)}
                          displayEmpty
                        >
                          {responsibleAIPillars.map((pillar) => (
                            <MenuItem key={pillar} value={pillar}>
                              {pillar}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {question.category}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingQuestionId === question.id ? (
                      <TextField
                        multiline
                        rows={3}
                        fullWidth
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2">
                        {question.question}
                      </Typography>
                    )}
                  </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {editingQuestionId === question.id ? (
                          <Tooltip title="Save question">
                            <IconButton
                              onClick={() => handleSaveQuestion(question.id)}
                              size="small"
                              sx={{ color: 'green' }}
                            >
                              <SaveIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Edit question">
                            <IconButton
                              onClick={() => handleEditQuestion(question.id, question.question, question.category)}
                              size="small"
                              sx={{ color: 'var(--primary-color)' }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete question">
                          <IconButton
                            onClick={() => handleDeleteQuestion(question.id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              
            </TableBody>
          </Table>
        </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EditScenarios;