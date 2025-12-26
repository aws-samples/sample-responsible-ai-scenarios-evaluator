import React from 'react';
import { Box, Typography } from '@mui/material';

const ScoreDisplay = ({ score, size = 'medium', label = 'Average Score' }) => {
  const getScoreColor = (score) => {
    if (score >= 4) return '#4caf50'; // Green for high scores
    if (score >= 3) return '#ff9800'; // Orange for medium scores
    return '#f44336'; // Red for low scores
  };

  const fontSize = size === 'large' ? 'h4' : size === 'small' ? 'h6' : 'h5';
  const labelSize = size === 'large' ? 'body1' : 'body2';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <Typography 
        variant={fontSize} 
        component="div" 
        sx={{ 
          fontWeight: 'bold',
          color: getScoreColor(parseFloat(score))
        }}
      >
        {parseFloat(score).toFixed(1)}
      </Typography>
      <Typography 
        variant={labelSize} 
        component="div" 
        sx={{ 
          color: 'text.secondary',
          mt: -0.5
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default ScoreDisplay;