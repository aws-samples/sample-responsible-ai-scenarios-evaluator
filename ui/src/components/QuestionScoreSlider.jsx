import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Slider,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';

const QuestionScoreSlider = ({ 
  questionId, 
  reportId, 
  currentScore, 
  onScoreChange, 
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localScore, setLocalScore] = useState(currentScore || 1);

  // Update local score when currentScore prop changes
  useEffect(() => {
    setLocalScore(currentScore || 1);
  }, [currentScore]);

  const handleScoreChange = useCallback((event, newValue) => {
    if (disabled || loading) return;
    
    console.log('QuestionScoreSlider: Score changed to', newValue, 'for question', questionId);
    setLocalScore(newValue);
  }, [disabled, loading, questionId]);

  const handleScoreCommitted = useCallback(async (event, newValue) => {
    if (disabled || loading) return;
    
    setLoading(true);
    setError(null);

    try {
      await onScoreChange(questionId, reportId, newValue);
      console.log('QuestionScoreSlider: Score update successful');
    } catch (err) {
      setError('Failed to update score. Please try again.');
      console.error('QuestionScoreSlider: Error updating score:', err);
      // Reset to previous score on error
      setLocalScore(currentScore || 1);
    } finally {
      setLoading(false);
    }
  }, [questionId, reportId, onScoreChange, disabled, loading, currentScore]);

  const marks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' }
  ];

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Unhealthy
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loading && <CircularProgress size={16} />}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Healthy
        </Typography>
      </Box>
      
      <Slider
        value={localScore}
        onChange={handleScoreChange}
        onChangeCommitted={handleScoreCommitted}
        min={1}
        max={5}
        step={1}
        marks={marks}
        disabled={disabled || loading}
        sx={{
          color: 'var(--primary-color)',
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
            backgroundColor: 'var(--primary-color)',
            '&:hover': {
              backgroundColor: 'var(--primary-hover-color)',
            },
          },
          '& .MuiSlider-track': {
            height: 6,
            backgroundColor: 'var(--primary-color)',
          },
          '& .MuiSlider-rail': {
            height: 6,
            backgroundColor: 'rgba(0, 0, 0, 0.26)',
          },
          '& .MuiSlider-mark': {
            backgroundColor: 'var(--primary-color)',
            height: 8,
            width: 2,
          },
          '& .MuiSlider-markLabel': {
            fontSize: '0.75rem',
            color: 'rgba(0, 0, 0, 0.87)',
          }
        }}
      />
      
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default QuestionScoreSlider;