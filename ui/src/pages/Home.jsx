import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Assessment,
  Create,
  PlayArrow,
  Visibility,
  CheckCircle,
  Settings,
  QuestionAnswer,
  TrendingUp,
  Security,
  Psychology,
  Balance,
  Verified
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PILLAR_DEFINITIONS } from '../constants/pillars';

const Home = () => {
  const navigate = useNavigate();

  const steps = [
    {
      label: 'Create Scenarios',
      description: 'Define evaluation scenarios with custom questions for different AI responsibility pillars',
      icon: <Create color="primary" />,
      action: 'Create Scenario',
      route: '/new-scenario'
    },
    {
      label: 'View/Manage Scenarios',
      description: 'Review and manage your existing evaluation scenarios and questions',
      icon: <Settings color="primary" />,
      action: 'Manage Scenarios',
      route: '/manage-scenarios'
    },
    {
      label: 'Run Evaluation',
      description: 'Configure your AI application endpoint and run automated evaluation',
      icon: <PlayArrow color="primary" />,
      action: 'Start Evaluation',
      route: '/evaluate'
    },
    {
      label: 'Human Review',
      description: 'Review AI-generated considerations and provide Pass/Fail judgments',
      icon: <Visibility color="primary" />,
      action: 'View Results',
      route: '/results'
    },
    {
      label: 'Get Insights',
      description: 'Analyze scores, identify areas for improvement, and track progress',
      icon: <TrendingUp color="primary" />,
      action: 'See Results',
      route: '/results'
    }
  ];

  const pillars = [
    {
      name: PILLAR_DEFINITIONS.fairness.name,
      icon: <Balance />,
      color: '#1976d2',
      definition: PILLAR_DEFINITIONS.fairness.enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS.explainability.name,
      icon: <Psychology />,
      color: '#388e3c',
      definition: PILLAR_DEFINITIONS.explainability.enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS['privacy-security'].name,
      icon: <Security />,
      color: '#f57c00',
      definition: PILLAR_DEFINITIONS['privacy-security'].enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS.safety.name,
      icon: <Verified />,
      color: '#d32f2f',
      definition: PILLAR_DEFINITIONS.safety.enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS.controllability.name,
      icon: <Settings />,
      color: '#7b1fa2',
      definition: PILLAR_DEFINITIONS.controllability.enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS['veracity-robustness'].name,
      icon: <CheckCircle />,
      color: '#0288d1',
      definition: PILLAR_DEFINITIONS['veracity-robustness'].enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS.governance.name,
      icon: <Assessment />,
      color: '#5d4037',
      definition: PILLAR_DEFINITIONS.governance.enhancedDefinition
    },
    {
      name: PILLAR_DEFINITIONS.transparency.name,
      icon: <Visibility />,
      color: '#616161',
      definition: PILLAR_DEFINITIONS.transparency.enhancedDefinition
    }
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', bgcolor: 'white', pt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Assessment sx={{ fontSize: 64, color: 'var(--primary-color)', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'var(--primary-color)' }}>
            Responsible AI Scenarios Evaluator
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Comprehensive evaluation framework for AI applications across responsible AI principles
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/evaluate')}
              sx={{
                backgroundColor: 'var(--primary-color)',
                '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
              }}
            >
              Start Evaluation
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/manage-scenarios')}
              sx={{
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)',
                '&:hover': {
                  borderColor: 'var(--primary-hover-color)',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              Manage Scenarios
            </Button>
          </Box>
        </Box>

        {/* Responsible AI Pillars */}
        <Card variant="outlined" sx={{ mb: 6 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
              Responsible AI Pillars
            </Typography>
            <Grid container spacing={2}>
              {pillars.map((pillar, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Tooltip
                    title={pillar.definition}
                    arrow
                    placement="top"
                    componentsProps={{
                      tooltip: {
                        sx: {
                          maxWidth: 320,
                          fontSize: '1rem !important',
                          lineHeight: '1.4 !important',
                          padding: '10px 14px !important',
                          backgroundColor: 'rgba(0, 0, 0, 0.9) !important',
                          color: 'white !important',
                          borderRadius: '8px !important',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15) !important'
                        }
                      },
                      arrow: {
                        sx: {
                          color: 'rgba(0, 0, 0, 0.9) !important'
                        }
                      }
                    }}
                  >
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.02)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      cursor: 'help',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.05)',
                        border: '1px solid rgba(25, 118, 210, 0.2)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)'
                      }
                    }}>
                      <Box sx={{ color: pillar.color }}>
                        {pillar.icon}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {pillar.name}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* AWS Responsible AI Link */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Button
            variant="contained"
            href="https://aws.amazon.com/ai/responsible-ai/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              backgroundColor: 'var(--primary-color)',
              '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
            }}
          >
            Learn More About Responsible AI at AWS
          </Button>
        </Box>

        {/* How It Works */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, textAlign: 'center' }}>
          How It Works
        </Typography>

        <Grid container spacing={4}>
          {/* Process Flow */}
          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Evaluation Process
                </Typography>
                <Stepper orientation="vertical">
                  {steps.map((step, index) => (
                    <Step key={index} active={true}>
                      <StepLabel
                        icon={step.icon}
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: 600,
                            fontSize: '1rem'
                          }
                        }}
                      >
                        {step.label}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {step.description}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(step.route)}
                          sx={{
                            borderColor: 'var(--primary-color)',
                            color: 'var(--primary-color)',
                            '&:hover': {
                              borderColor: 'var(--primary-hover-color)',
                              backgroundColor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          {step.action}
                        </Button>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </Grid>

          {/* Key Features */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Key Features
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <QuestionAnswer color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Custom Scenarios
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Create tailored evaluation questions
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Assessment color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Automated Testing
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        AI-powered evaluation and scoring
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Visibility color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Human Oversight
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Review and validate AI assessments
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUp color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Progress Tracking
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Monitor improvements over time
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Getting Started */}
        <Card variant="outlined" sx={{ mt: 6, bgcolor: 'rgba(25, 118, 210, 0.02)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
              Begin by creating evaluation scenarios or jump straight into evaluating your AI application
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/new-scenario')}
                sx={{
                  backgroundColor: 'var(--primary-color)',
                  '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
                }}
              >
                Create First Scenario
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/evaluate')}
                sx={{
                  borderColor: 'var(--primary-color)',
                  color: 'var(--primary-color)',
                  '&:hover': {
                    borderColor: 'var(--primary-hover-color)',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                Start Evaluation
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
};

export default Home;