import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  OutlinedInput,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Help as HelpIcon, 
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

const NewScenario = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    scenarioName: '',
    scenarioDescription: '',
    questionsPerCategory: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdScenarioName, setCreatedScenarioName] = useState('');





  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.scenarioName.trim()) {
      alert('Scenario Name is required');
      return;
    }

    if (!formData.scenarioDescription.trim()) {
      alert('Scenario Description is required');
      return;
    }

    if (!formData.questionsPerCategory || formData.questionsPerCategory <= 0) {
      alert('Number of questions per category must be a positive number');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      scenario_name: formData.scenarioName,
      scenario_description: formData.scenarioDescription,
      questions_per_category: formData.questionsPerCategory
    };

    // Call the new-scenario API endpoint
    fetch(`${window.env.API_GATEWAY_ENDPOINT}/new-scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': window.env.API_GATEWAY_APIKEY,
      },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (response.status === 202) {
          // API Gateway async invocation - Lambda is processing in background
          return response.json();
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      })
      .then(data => {
        console.log('Scenario creation response:', data);
        
        // Show success message for async processing
        setCreatedScenarioName(formData.scenarioName);
        setShowSuccess(true);
        setIsSubmitting(false);
      })
      .catch(error => {
        console.error('Error creating scenario:', error);
        alert('Error creating scenario. Please try again.');
        setIsSubmitting(false);
      });
  };

  return (
    <>


      {/* Success Message */}
      {showSuccess && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'white',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 600, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {/* Success Animation */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircularProgress
                  size={80}
                  thickness={4}
                  sx={{
                    color: 'var(--primary-color)',
                    animationDuration: '2s'
                  }}
                />
                <AutoAwesomeIcon
                  sx={{
                    position: 'absolute',
                    fontSize: 32,
                    color: 'var(--primary-color)',
                    animation: 'spin 3s linear infinite',
                    '@keyframes spin': {
                      '0%': {
                        transform: 'rotate(0deg)'
                      },
                      '100%': {
                        transform: 'rotate(360deg)'
                      }
                    }
                  }}
                />
              </Box>

              {/* Success Title */}
              <Typography
                variant="h5"
                sx={{
                  color: 'var(--primary-color)',
                  fontWeight: 'bold'
                }}
              >
                Scenario Creation Started!
              </Typography>

              {/* Success Message */}
              <Typography
                variant="body1"
                sx={{
                  color: 'text.primary',
                  textAlign: 'center',
                  maxWidth: 500
                }}
              >
                Your scenario <strong>"{createdScenarioName}"</strong> is being processed asynchronously. 
                AI-powered evaluation questions are being generated for each responsible AI pillar.
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  maxWidth: 500
                }}
              >
                The scenario will be available in the Manage Scenarios page when processing is complete. 
                You can check its status there.
              </Typography>

              {/* Navigate Button */}
              <Button
                variant="contained"
                onClick={() => navigate('/manage-scenarios')}
                sx={{
                  backgroundColor: 'var(--primary-color)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-hover-color)'
                  },
                  mt: 2,
                  px: 4,
                  py: 1.5
                }}
              >
                Go to Manage Scenarios
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Main Form */}
      {!showSuccess && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'white',
          }}
        >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 600 }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* New Scenario Section */}
            <Typography variant="h6">New Scenario</Typography>

            {/* Scenario Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Scenario Name"
                fullWidth
                value={formData.scenarioName}
                onChange={(e) => handleInputChange('scenarioName', e.target.value)}
                placeholder="Banking Chatbot Evaluation"
                required
              />
              <Tooltip title="Enter a descriptive name for your evaluation scenario">
                <HelpIcon color="action" />
              </Tooltip>
            </Box>

            {/* Scenario Description */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                label="Scenario Description"
                multiline
                rows={6}
                fullWidth
                value={formData.scenarioDescription}
                onChange={(e) => handleInputChange('scenarioDescription', e.target.value)}
                InputProps={{
                  placeholder: "For example - A comprehensive banking chatbot application that assists customers with account inquiries, transaction history, balance checks, fund transfers, loan applications, and general banking support. The chatbot should handle sensitive financial information securely, provide accurate account details, guide users through banking processes, and escalate complex issues to human agents when necessary."
                }}
                required
              />
              <Tooltip title="Provide a detailed description of the AI application scenario including its purpose, functionality, target users, and any specific requirements or constraints">
                <HelpIcon color="action" sx={{ mt: 1 }} />
              </Tooltip>
            </Box>

            {/* Number of Questions per Category */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl fullWidth required>
                <InputLabel htmlFor="questions-per-category">Number of questions per category</InputLabel>
                <OutlinedInput
                  id="questions-per-category"
                  type="number"
                  value={formData.questionsPerCategory}
                  onChange={(e) => handleInputChange('questionsPerCategory', parseInt(e.target.value) || '')}
                  inputProps={{
                    min: 1,
                    step: 1
                  }}
                  label="Number of questions per category"
                />
              </FormControl>
              <Tooltip title="Specify how many evaluation questions should be generated for each responsible AI category (e.g., fairness, transparency, privacy)">
                <HelpIcon color="action" />
              </Tooltip>
            </Box>

            {/* Submit Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  backgroundColor: 'var(--primary-color)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-hover-color)'
                  }
                }}
              >
                {isSubmitting ? 'Creating Scenario...' : 'Create Scenario'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
      )}
    </>
  );
};

export default NewScenario;