import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Help as HelpIcon } from '@mui/icons-material';
import { useLocation } from "react-router-dom";
import axios from 'axios';


const Evaluate = () => {
  const navigate = useNavigate();
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const location = useLocation();
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [bodyParams, setBodyParams] = useState([{ key: '', value: '' }]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    endpoint: '',
    inputPromptKey: 'prompt',
    outputResponseKey: 'response',
    copiedReportID: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('');

  useEffect(() => { // set API endpoint & API key from environment
    setApiEndpoint(window.env.API_GATEWAY_ENDPOINT.replace(/^https:\/\//, ''))
    setApiKey(window.env.API_GATEWAY_APIKEY)
  }, []);

  // Fetch scenarios from API
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/list-scenarios`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': window.env.API_GATEWAY_APIKEY,
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.scenarios) {
            setScenarios(data.scenarios);
          }
        }
      } catch (err) {
        console.error('Error fetching scenarios:', err);
      }
    };

    fetchScenarios();
  }, []);

  useEffect(() => {
    if (location.state != undefined) {
      setHeaders(location.state.headers)
      setBodyParams(location.state.bodyParams)
      setFormData(location.state.formData)
    }
  }, [location]);

  const handleHeaderChange = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const handleBodyParamChange = (index, field, value) => {
    const newBodyParams = [...bodyParams];
    newBodyParams[index][field] = value;
    setBodyParams(newBodyParams);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
  };

  const addBodyParam = () => {
    setBodyParams([...bodyParams, { key: '', value: '' }]);
  };

  const removeBodyParam = (index) => {
    const newBodyParams = bodyParams.filter((_, i) => i !== index);
    setBodyParams(newBodyParams);
  };

  const handleEvaluate = (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    const payload = {
      ...formData,
      scenario_id: selectedScenario,
      headers: headers.reduce((acc, curr) => {
        if (curr.key && curr.value) acc[curr.key] = curr.value;
        return acc;
      }, {}),
      bodyParams: bodyParams.reduce((acc, curr) => {
        if (curr.key && curr.value) acc[curr.key] = curr.value;
        return acc;
      }, {}),
    };

    // axios post payload to api gateway endpoint using api key in headers
    axios.post(`${window.env.API_GATEWAY_ENDPOINT}/evaluate`, payload, {
      headers: {
        'x-api-key': window.env.API_GATEWAY_APIKEY,
      },
    })
    .then((response) => {
      console.log('Evaluation response:', response.data);
      // navigate to results page
      // window.location.href = '/results';
      navigate('/results');
    })
    .catch((error) => {
      console.error('Evaluation error:', error);
    });
  };

  return (
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
        <Box component="form" onSubmit={handleEvaluate} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Application Section */}
          <Typography variant="h6">Evaluate Application</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Application Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Tooltip title="Enter the name of your application">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Application Description"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              placeholder="Description of the application including what it is, what domain does it cover, and what functions does it have."
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <Tooltip title="Enter a description of your application">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Application Endpoint"
              fullWidth
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="https://"
              required
            />
            <Tooltip title="Enter the API endpoint URL">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

          {/* Headers */}
          {headers.map((header, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Header Key (Optional)"
                value={header.key}
                onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
              />
              <TextField
                label="Header Value (Optional)"
                value={header.value}
                onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
              />
              <IconButton onClick={() => addHeader()}>
                <AddIcon />
              </IconButton>
              {headers.length > 1 && (
                <IconButton onClick={() => removeHeader(index)}>
                  <RemoveIcon />
                </IconButton>
              )}
              <Tooltip title="Add custom headers for API requests">
                <HelpIcon color="action" />
              </Tooltip>
            </Box>
          ))}

          {/* Input/Body Parameters Section */}
          <Typography variant="h6">Input/Body Parameters</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Input Prompt Key Name"
              fullWidth
              value={formData.inputPromptKey}
              onChange={(e) => setFormData({ ...formData, inputPromptKey: e.target.value })}
            />
            <Tooltip title="Specify the key name for the input prompt in the request body">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

          {/* Body Parameters */}
          {bodyParams.map((param, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Body Key (Optional)"
                value={param.key}
                onChange={(e) => handleBodyParamChange(index, 'key', e.target.value)}
              />
              <TextField
                label="Body Value (Optional)"
                value={param.value}
                onChange={(e) => handleBodyParamChange(index, 'value', e.target.value)}
              />
              <IconButton onClick={() => addBodyParam()}>
                <AddIcon />
              </IconButton>
              {bodyParams.length > 1 && (
                <IconButton onClick={() => removeBodyParam(index)}>
                  <RemoveIcon />
                </IconButton>
              )}
              <Tooltip title="Add additional parameters to the request body">
                <HelpIcon color="action" />
              </Tooltip>
            </Box>
          ))}

          {/* Output Section */}
          <Typography variant="h6">Output</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Output Response Key Name"
              fullWidth
              value={formData.outputResponseKey}
              onChange={(e) => setFormData({ ...formData, outputResponseKey: e.target.value })}
            />
            <Tooltip title="Specify the key name for the response in the API output">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

          {/* Scenario Section */}
          <Typography variant="h6">Scenario</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Select Scenario</InputLabel>
              <Select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                label="Select Scenario"
                required
              >
                {scenarios.map((scenario) => (
                  <MenuItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Select a pre-defined scenario to use its custom evaluation questions">
              <HelpIcon color="action" />
            </Tooltip>
          </Box>

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
              {isSubmitting ? 'Evaluating...' : 'Evaluate'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Evaluate;